# API Payload Examples

## Create public human-created track

```json
{
  "title": "Example Track",
  "type": "single",
  "storage_path": "USER_ID/full/FILE.wav",
  "storage_bucket": "artist-music",
  "is_public": true,
  "rights_confirmed": true,
  "ai_use_category": "human_created",
  "ai_tools": [],
  "ai_disclosure_details": null,
  "training_use_policy": "rights_reserved",
  "music_upload_policy_version": "1.0.0",
  "human_music_policy_version": "1.0.0"
}
```

## Private unresolved draft

```json
{
  "title": "Unfinished Demo",
  "type": "single",
  "storage_path": "USER_ID/full/FILE.wav",
  "storage_bucket": "artist-music",
  "is_public": false,
  "rights_confirmed": false,
  "ai_use_category": "unknown",
  "training_use_policy": "rights_reserved"
}
```

## Trust response

```json
{
  "trackId": "TRACK_ID",
  "originStatus": "pending",
  "certificationStatus": "not_requested",
  "certificationLevel": 0,
  "publicLabel": "Origin processing",
  "eligibleToRequestCertification": true,
  "blockingReasons": []
}
```
