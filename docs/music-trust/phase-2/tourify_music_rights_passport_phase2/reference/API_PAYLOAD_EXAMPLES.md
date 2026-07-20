# Phase 2 API Payload Examples

These examples describe domain intent. Adapt names and IDs after the repository audit.

## Create musical work

```json
{
  "trackId": "artist_music_id",
  "title": "Song title",
  "alternateTitles": [],
  "language": "en",
  "isInstrumental": false,
  "isCover": false,
  "isAdaptation": false
}
```

## Propose claim

```json
{
  "subjectType": "musical_work",
  "subjectId": "work_id",
  "claimantPartyId": "party_id",
  "claimType": "ownership",
  "rightsCategory": "composition",
  "share": {
    "numerator": "1",
    "denominator": "2",
    "unknown": false,
    "originalText": "50%",
    "originalScale": "100"
  },
  "territoryCodes": ["WORLDWIDE"],
  "perpetual": true
}
```

## Invite contributor

```json
{
  "projectId": "project_id",
  "email": "contributor@example.com",
  "displayName": "Contributor",
  "proposedRoles": ["songwriter"],
  "claimIds": ["claim_id"],
  "requiresSignature": true,
  "publicDisplayRequested": true
}
```

## Issue passport

```json
{
  "projectId": "project_id",
  "expectedProjectVersion": 14,
  "publicCreditIds": ["credit_id"],
  "includeIdentifiers": ["ISRC", "ISWC"],
  "requestC2paDerivative": false,
  "requestTestnetAnchor": false
}
```
