# Clean Post Creator Cleanup Plan

## Overview

Remove three UI sections from the artist post-creation composer (`CleanPostCreator`) while preserving all other design/UX:

1. **"POSTING AS" header** — the `<PostingAccountSelector>` block at the top of the card
2. **Standalone hashtag input** — the `#` icon + "Add hashtags..." input + "Add" button row (hashtags will be parsed from `#word` typed naturally in the text body)
3. **"TAG PEOPLE" and "INVITE COLLABORATORS" explicit search UIs** — both search-input panels (users will `@mention` collaborators inline in the text body instead)

All state, helpers, and props **related only to these removed sections** should be cleaned up too. The rest of the component (textarea, media, poll, schedule, style, visibility, post button) stays untouched.

---

## Sub-Tasks

---

### Task 1 — Remove the "POSTING AS" PostingAccountSelector

**Intent**  
The `<PostingAccountSelector>` renders a "POSTING AS" banner at the top of the card. It should be removed entirely from `CleanPostCreator`.

**Expected Outcomes**  
- The card no longer opens with a "POSTING AS / Feelix · Artist" header.  
- The rest of the composer (avatar row, textarea, toolbar) is unchanged.

**Todo List**  
1. In `components/feed/clean-post-creator.tsx` line 539, delete the `<PostingAccountSelector … />` JSX element (and its `mb-4` wrapper div if it is the sole child).  
2. Remove the import of `PostingAccountSelector` from `components/account/posting-account-selector` (check the import block at the top of the file).  
3. Remove the import of `useActingContext` if it is only used to feed `PostingAccountSelector` (verify no other usage first).

**Relevant Context**  
- `components/feed/clean-post-creator.tsx` line 539: `<PostingAccountSelector className="mb-4 …" />`  
- `components/account/posting-account-selector.tsx` — the component being removed from render, not deleted itself  
- `useActingContext` is imported at line 132 — check whether it is used elsewhere in the file before removing

**Status** — `[ ] pending`

---

### Task 2 — Remove the Standalone Hashtag Input UI

**Intent**  
Remove the explicit `#` icon + "Add hashtags..." Input + "Add" button row. The existing `handleContentChange` already auto-extracts `#word` tokens from the textarea, so hashtags will continue to work naturally as the user types.

**Expected Outcomes**  
- The hashtag input row (lines ~746–768) is gone from the DOM.  
- The hashtag badge display (lines ~720–744, showing added tags with × buttons) is gone.  
- `hashtagInput` state, `addHashtag`, `removeHashtag`, `handleHashtagKeyPress` helpers are removed or inlined if needed.  
- `handleContentChange` auto-extraction logic is **kept** so `#`-typed hashtags still populate `postData.hashtags` for submission.  
- `postData.hashtags` field in state is **kept** because it is used on submit.

**Todo List**  
1. Delete the hashtag badge display block (`postData.hashtags.map(…)` + surrounding `motion.div`, lines ~720–744).  
2. Delete the hashtag input row (`{/* Hashtag input */}` div, lines ~746–768).  
3. Remove `hashtagInput` state variable (line 148).  
4. Remove `addHashtag`, `removeHashtag`, `handleHashtagKeyPress` functions (they are only used by the deleted UI).  
5. Remove import of `Hash` lucide icon if no longer used elsewhere in the file.

**Relevant Context**  
- `handleContentChange` (lines 255–266) already calls `extractHashtags` — keep this untouched  
- Badge display: lines 720–744 (inside a `motion.div` gated on `postData.hashtags.length > 0`)  
- Input row: lines 746–768  
- `Hash` icon imported from `lucide-react`

**Status** — `[ ] pending`

---

### Task 3 — Remove "TAG PEOPLE" and "INVITE COLLABORATORS" Sections

**Intent**  
Remove both explicit search panels for tagging users and inviting collaborators. Users will `@mention` others inline in the post body; the mentioned user can choose to accept the collaboration post-publish (future feature — no new logic needed now).

**Expected Outcomes**  
- The `enableTagging` and `enableCollaborators` section block (lines ~770–880) is gone from the DOM.  
- All related state variables and search helpers are removed.  
- Props `enableTagging` and `enableCollaborators` are removed from `CleanPostCreatorProps` and the function signature.  
- The call site in `artist-home-feed.tsx` no longer passes those props.  
- `postData.taggedUsers` and `postData.collaborators` fields are removed from `PostData` and initial state (they are only populated by the deleted UI).

**Todo List**  
1. Delete the JSX block `{(enableTagging || enableCollaborators) && ( … )}` (lines ~770–880).  
2. Remove state variables: `tagSearch`, `collabSearch`, `tagResults`, `collabResults`, `isSearchingTags`, `isSearchingCollabs` (lines 149–154).  
3. Remove helper functions: `searchPeople`, `addTaggedUser`, `addCollaborator` and their associated `useEffect` hooks (lines ~296–363, ~320–345).  
4. Remove `taggedUsers` and `collaborators` from the `PostData` interface and their initial values in `useState`.  
5. Remove `enableTagging` and `enableCollaborators` from the `CleanPostCreatorProps` interface and the destructured function parameters.  
6. In `components/artist/artist-home-feed.tsx` line 311–312, remove the `enableTagging` and `enableCollaborators` prop usages.  
7. Update the textarea `placeholder` in `artist-home-feed.tsx` (line 307) from `"Share a moment, tag collaborators, or invite your bandmates to co-post..."` to `"What's going on in your world?"`.

**Relevant Context**  
- Section JSX: `components/feed/clean-post-creator.tsx` lines 770–880  
- State vars: lines 149–154  
- Helpers/effects: lines ~296–363  
- `PostData` interface: lines 107–118  
- Props interface: lines 85–99  
- Call site: `components/artist/artist-home-feed.tsx` lines 305–313

**Status** — `[ ] pending`

---

## Notes

- No database schema changes required — `taggedUsers` and `collaborators` were UI-only state not yet wired to any backend field in the submission path (verify during implementation).  
- The `handleContentChange` hashtag extraction stays untouched; removing the UI does not break hashtag submission.  
- `PostingAccountSelector` component file itself is **not deleted** — it may be used elsewhere; only its usage inside `CleanPostCreator` is removed.
