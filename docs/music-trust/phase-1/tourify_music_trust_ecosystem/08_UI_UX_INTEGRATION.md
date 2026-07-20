# UI/UX Integration

## Existing uploader

Add a compact `Rights & Origin` step to `EnhancedMusicUploader` rather than creating another uploader.

Fields:

- required rights checkbox
- required AI-use radio group
- optional AI tools/details fields
- training preference, defaulting to rights reserved
- plain-language explanation

Do not place the paid certification form inside initial upload.

## Artist catalog cards

Show one narrow status:

- Artist submitted
- Origin processing
- Origin recorded
- Certification in review
- Human-created certified
- Certification needs information
- Certification suspended

Use tooltips or a details sheet for explanations.

## Post-upload success

Add an upsell card after successful upload and on track detail/catalog rows. Explain benefits, review inputs, and pricing without implying the artist must pay to be considered legitimate.

## Public surfaces

Feed, profile, discovery, EPK, and public artist surfaces may display:

- an artist-submitted label where context requires it
- a Human-Created badge only for an active certificate
- a link to the public verification page

Do not add a new audio element. Continue mapping tracks to `JukeboxTrack` and using Jukebox playback.

## Certification workspace

Suggested route:

```text
/artist/music/certification/[trackId]
```

Sections:

1. eligibility
2. identity
3. creation evidence
4. AI disclosure confirmation
5. contributors
6. review and submission
7. status timeline

## Accessibility

- all statuses must include text, not color alone
- radio groups and checkboxes must be keyboard accessible
- progress should expose current step and errors
- evidence upload must describe accepted types and privacy
- mobile layout must remain usable without horizontal overflow
