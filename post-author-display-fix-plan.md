# Plan: Fix Post Author Display — Wrong Author in Feed After Posting

## Overview

When the user is on `/artist` with "feelix" selected as the posting account, newly created posts appear in the feed with "kyle" (general account) as the author instead of "feelix".

The `PostingAccountSelector` correctly shows "feelix" and the `actingHeaders` (`x-acting-profile-id`, `x-acting-account-type`) are sent with the post request. The API-side acting context resolution and artist profile lookup are also correct. 

**Root cause analysis:**

The bug is in `toArtistFeedPost` in `components/artist/artist-home-feed.tsx`. The `username` fallback chain reads:

```ts
username:
  post.account_display_name    // "feelix" — correct when API resolves the artist
  || userData.full_name         // "Kyle" ← general user's name from profiles JOIN
  || userData.username
  || post.account_username      // "feelix-slug" ← artist username, but positioned last
```

`userData` comes from `post.profiles || post.user || {}`. The `normalizedPost` from the create API sets both `profiles` and `user` to `authorProfile` (which has `full_name: author.name`). So far this is correct.

However there are two failure modes:

**Failure mode A — `account_display_name` is null:** If `resolveActingAccountSnapshot` returns the general account (e.g., headers not verified, session fallback resolves to general), then `author.name = "Kyle"` is stored in `account_display_name` and `account_username`. The API response sets `account_display_name: "Kyle"` explicitly, the post is stored with "Kyle", and the feed always shows "Kyle".

**Failure mode B — `userData.full_name` overrides (latent):** `post.account_username` (the artist's slug "feelix") is after `userData.full_name` in the fallback chain. If `account_display_name` is missing (e.g., old posts) and `userData.full_name = "Kyle"`, then "Kyle" wins over `post.account_username = "feelix-slug"`.

**The actual displayed name field:** `ArtistPostCard` renders `post.user.username` (line 289) as the display name. This `username` field is set by `toArtistFeedPost` from the chain above.

### Fix strategy

1. **Sub-Task 1 (primary fix):** Fix `toArtistFeedPost` so `post.account_username` comes before `userData.full_name` in the fallback chain. This ensures even if `account_display_name` is absent, the stored artist username wins over the general user's `full_name`.

2. **Sub-Task 2 (structural fix):** Fix `user.id` and `profile_path` in `toArtistFeedPost` so the card ID and link point to the artist profile, not the general user.

3. **Sub-Task 3 (defensive fix):** In `app/api/posts/create/route.ts`, after resolving the author snapshot, add a server-side log warning when the resolved author is a generic name — this lets us confirm in server logs whether the acting context is being resolved correctly, and helps diagnose any edge cases.

4. **Sub-Task 4 (defensive fix):** Add a `disabled` guard to the submit button in `CleanPostCreator` when `!isActingReady` so a post cannot be submitted before the acting context headers are confirmed ready — preventing the race condition where `actingHeaders` is `{}`.

---

## Sub-Task 1: Fix `toArtistFeedPost` fallback chain — primary display fix

**Status:** [ ] pending

### Intent
Fix the `username` fallback chain and `user.id` in `toArtistFeedPost` so the artist's stored attribution fields always win over the general user's profile data.

### Expected Outcomes
- Feed cards for posts made as "feelix" show "feelix" as the author name
- This applies to both optimistic (just-posted) and feed-loaded posts
- General account posts are unaffected
- Other users' posts are unaffected

### Todo List
1. In `components/artist/artist-home-feed.tsx`, update `toArtistFeedPost` `user` mapping:
   - Change `username` chain to: `post.account_display_name || post.account_username || userData.full_name || userData.username || 'Artist'`
   - Change `user.id` to: `post.posted_as_profile_id || userData.id || post.user_id || ''`
   - Change `profile_path` to: derive from `post.posted_as_type` + `post.account_username` using `getAccountAuthorPath({ id: post.posted_as_profile_id || post.user_id, type: post.posted_as_type || 'general', username: post.account_username || null, subtype: null })`, falling back to `userData.account_context?.profile_path`
2. Add import for `getAccountAuthorPath` from `@/lib/accounts/account-author` at the top of the file

### Relevant Context
- **File:** `components/artist/artist-home-feed.tsx` lines 103–140
- **Import target:** `lib/accounts/account-author.ts` — `getAccountAuthorPath(author: {id, type, username, subtype})`
- **Posts have:** `posted_as_type`, `posted_as_profile_id`, `account_display_name`, `account_username` stored from the create API

---

## Sub-Task 2: Guard the submit button until acting context is ready

**Status:** [ ] pending

### Intent
If the user opens the artist dashboard and submits a post before `currentAccount` has been resolved (during the accounts loading window), `actingHeaders` is empty and the API falls back to the general account. Block submission until `isActingReady` is true.

### Expected Outcomes
- The Post button is disabled with a spinner or "Loading account..." state when accounts haven't loaded yet
- Once "feelix" is showing in the `PostingAccountSelector`, the button becomes enabled and the headers are guaranteed to include `x-acting-profile-id`
- No regression for general account users (their `isActingReady` is true as soon as their general account loads)

### Todo List
1. In `components/feed/clean-post-creator.tsx`, destructure `isActingReady` from the existing `useActingContext()` call at line 117
2. In the submit button render, add `disabled={isSubmitting || !isActingReady || isOverLimit}` 
3. When `!isActingReady`, show a subtle loading state on the button (e.g., `isActingReady ? 'Post' : 'Loading...'`)

### Relevant Context
- **File:** `components/feed/clean-post-creator.tsx`
- **Line 117:** `const { actingHeaders } = useActingContext()` — extend to also get `isActingReady`
- **`isActingReady`:** from `hooks/use-acting-context.ts` line 55: `isAccountsReady && Boolean(currentAccount)` — true when accounts are loaded and a current account is set
- **Submit button location:** around line 1100+ in `clean-post-creator.tsx` (the main submit button)

---

## Sub-Task 3: Add server-side warning log when author resolves to generic name

**Status:** [ ] pending

### Intent
When `resolveActingAccountSnapshot` returns an author with a generic placeholder name (like `"Artist"` or `"Community Member"`), it means the artist profile lookup failed or the acting context fell back to general. Log a warning so this is visible in server logs during debugging.

### Expected Outcomes
- A `console.warn` appears in API server logs when a post is created with a generic author name
- The warning includes `{ accountType, profileId, userId }` for diagnosis
- No change to user-facing behavior

### Todo List
1. In `app/api/posts/create/route.ts` after line 32 (`const author = ...`), add:
   ```ts
   if (!author.name || GENERIC_ACCOUNT_AUTHOR_NAMES.has(author.name)) {
     console.warn('[posts/create] Author name resolved to generic placeholder', { accountType, profileId, userId })
   }
   ```
2. Import `GENERIC_ACCOUNT_AUTHOR_NAMES` from `@/lib/accounts/account-author`

### Relevant Context
- **File:** `app/api/posts/create/route.ts` — line 32
- **Constant:** `lib/accounts/account-author.ts` — `export const GENERIC_ACCOUNT_AUTHOR_NAMES = new Set(['Community Member', 'Artist', 'Venue', 'Organization'])`
