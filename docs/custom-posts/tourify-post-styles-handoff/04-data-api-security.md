# Data, API, and Security Specification

## 1. Data-model principles

- Additive migrations only.
- Preserve the current posts table and read path.
- Store reusable author styles separately from immutable published snapshots.
- Keep template code in the repository, not the database.
- Store validated semantic configuration, not raw CSS or HTML.
- Use the existing account/acting-context ownership model discovered in audit.
- Use RLS and server authorization; neither is a substitute for the other.

Names below are proposed. Adapt them to current repository conventions and documented canonical identifiers.

## 2. Proposed tables

### `post_style_profiles`

Reusable styles owned by a person or acting account.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Server-generated |
| `owner_type` | enum/text | Match current account model |
| `owner_id` | uuid | Resolved acting user/account |
| `name` | text | Trimmed, bounded |
| `template_id` | text | Canonical registry ID |
| `template_version` | integer | Version edited against |
| `schema_version` | integer | Serialized configuration version |
| `configuration` | jsonb | Validated editable semantic tokens |
| `approved_assets` | jsonb | Stable approved asset references only |
| `is_default` | boolean | One active default per owner |
| `status` | text | `active`, `archived` |
| `created_by` | uuid | Auth user for audit |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints/indexes:

- unique partial index on `(owner_type, owner_id)` where `is_default = true and status = 'active'`;
- index on owner and status;
- check reasonable JSON byte size;
- check supported schema-version range;
- name length and nonblank checks; and
- no database foreign key to a code-only template registry.

### `post_appearances`

One canonical published appearance per post.

| Column | Type | Notes |
| --- | --- | --- |
| `post_id` | uuid PK/FK | Cascade with post deletion per existing policy |
| `author_type` | enum/text | Denormalized ownership defense/audit |
| `author_id` | uuid | Must match canonical post author |
| `source_profile_id` | uuid nullable | Attribution only; not live rendering dependency |
| `template_id` | text | Canonical ID |
| `template_version` | integer | Published version |
| `schema_version` | integer | Snapshot schema |
| `snapshot` | jsonb | Sanitized immutable semantic snapshot |
| `snapshot_hash` | text | Stable cache/debug hash |
| `status` | text | `active`, `neutralized`, `fallback` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Appearance revision time |

### `post_appearance_revisions`

Recommended if published post edits already have revision history; integrate with that system rather than duplicate it.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `post_id` | uuid FK | |
| `revision` | integer | Monotonic per post |
| `snapshot` | jsonb | Previous or resulting sanitized snapshot |
| `changed_by` | uuid | Auth user |
| `change_reason` | text nullable | User edit, moderation neutralization, migration |
| `created_at` | timestamptz | |

### Draft storage

Use the current draft system. Add `appearance_draft` JSONB and source version metadata there, or create `post_draft_appearances` only if draft style cannot be incorporated cleanly. Draft data is editable and must never be trusted as a published snapshot.

## 3. Transaction boundaries

Post publication must be atomic:

1. authorize;
2. validate content;
3. resolve and sanitize appearance;
4. insert/update post;
5. insert appearance;
6. finalize referenced assets; and
7. commit.

If appearance validation fails, return a field-level error and keep the draft. Do not publish a visually different post without explicit user confirmation. If the user chooses Standard, publish without a `post_appearances` record or with a standard-mode record based on current conventions.

## 4. API/service contracts

Prefer existing Server Actions/API conventions. Endpoints are illustrative.

### List templates

`GET /api/appearance/templates?surface=post-feed`

Returns registry-derived metadata only:

```json
{
  "templates": [
    {
      "id": "canonical-id",
      "version": 1,
      "label": "Display label",
      "lifecycle": "active",
      "entitled": true,
      "capabilities": {},
      "thumbnail": {}
    }
  ]
}
```

Never return executable component/module references.

### List style profiles

`GET /api/post-style-profiles?owner=<resolved-context>`

Server derives or validates owner from acting context.

### Create profile

`POST /api/post-style-profiles`

```json
{
  "name": "My style",
  "templateId": "canonical-id",
  "templateVersion": 1,
  "schemaVersion": 1,
  "configuration": {},
  "approvedAssets": [],
  "setAsDefault": false
}
```

Response returns sanitized canonical configuration, not the untrusted input.

### Update/archive/default

- `PATCH /api/post-style-profiles/:id`
- `DELETE /api/post-style-profiles/:id` should archive by default
- `POST /api/post-style-profiles/:id/default`

Default updates use a transaction so only one active default exists.

### Appearance preview

`POST /api/post-appearance/preview`

Accepts a draft configuration, sanitizes it, and returns a resolved preview DTO. Rate limit and size-limit the endpoint. The client may perform fast local validation, but final preview/publish parity uses server rules.

### Publish post

Extend the canonical post-create contract:

```ts
type PostAppearanceInput =
  | { mode: "standard" }
  | {
      mode: "profile";
      profileId: string;
      expectedProfileVersion?: string;
      overrides?: AppearanceOverrideInput;
    }
  | {
      mode: "custom";
      templateId: string;
      templateVersion: number;
      schemaVersion: number;
      configuration: unknown;
      approvedAssetIds: string[];
    };
```

The service derives author ownership and snapshots the resolved result.

### Read post

The canonical post response includes either `appearance.mode = "styled"` with resolved snapshot fields or `appearance.mode = "standard"`. All viewer surfaces use the same serializer.

## 5. Authorization and RLS

Policies must reflect actual Tourify account relationships discovered in audit.

Required behavior:

- Public profiles may be readable when the owner/account is public, but unpublished draft styles are owner-only.
- Only members authorized to post as the acting account may create/use its profiles.
- Only authorized owners/admins may update, archive, or set defaults.
- A user cannot reference another owner's profile ID during publish.
- Published appearance is readable exactly where the parent post is readable.
- Removing access to a private post removes access to its appearance.
- Moderators may neutralize an unsafe style through a logged privileged operation.
- Service-role access remains limited to existing trusted backend paths.

Add database tests for cross-user and cross-account access, including organization/venue member-role boundaries.

## 6. Input validation

Validate:

- known canonical template or permitted alias;
- active/retired selection rules;
- exact supported schema version;
- token object keys with unknown-key rejection;
- finite numeric ranges;
- approved enum values;
- color format and computed contrast;
- maximum configuration size and nesting depth;
- asset ownership, purpose, MIME, dimensions, and state;
- font ID allowlist;
- motion preset allowlist;
- URL absence except approved stable asset references; and
- no strings that are interpreted as CSS declarations or selectors.

Sanitization must be deterministic. If a value is clamped, preview must show the clamped value and the author must publish that exact result.

## 7. CSS and content security

- No `dangerouslySetInnerHTML` for templates or style values.
- No raw `style` keys from user JSON; map known tokens to known CSS variables.
- Reject values containing `url()`, `expression()`, `@import`, selectors, or declarations when a simple token is expected.
- Apply Content Security Policy consistent with approved assets/fonts.
- Do not load arbitrary external images as backgrounds.
- Ensure SVG assets are sanitized or rasterized according to existing asset policy.
- Bound data URI usage; preferably disallow user-provided data URIs.
- Keep platform controls outside decorative overlays and pointer-event traps.

## 8. Abuse, deception, and moderation

Prevent templates from:

- imitating verified, sponsored, staff, safety, or system notices;
- hiding disclosure or author identity;
- making fake buttons that resemble post actions;
- flashing rapidly;
- using invisible or near-invisible text;
- obscuring report/block controls; or
- creating extreme card heights or scroll traps.

Moderation needs:

- neutral-style viewer for review;
- template/version filter;
- ability to neutralize appearance without deleting allowed content;
- audit event and author notification where policy requires; and
- fallback that is independent of the unsafe template.

## 9. Migration

Migration 1:

- create profile and appearance tables;
- add indexes, constraints, and RLS;
- add no required column to existing posts;
- deploy with writes disabled.

Migration 2, only if needed:

- extend drafts or revision system;
- backfill nothing for legacy posts;
- verify zero changes in legacy post counts/content.

Rollback:

- turn off composer and styled rendering flags;
- render all posts through current standard renderer;
- preserve appearance records for recovery;
- roll back application code before dropping any table;
- do not drop data during the incident response.

## 10. Data verification queries

Provide checked-in read-only verification scripts for:

- appearance rows whose author differs from post author;
- profile IDs referenced across owners;
- more than one active default per owner;
- unknown schema/template versions;
- oversized configuration/snapshot records;
- assets no longer authorized or resolvable;
- posts with renderer fallback; and
- revision sequence gaps.

Verification must run in CI against a test database and in a controlled production-read context before rollout increases.
