# Origin, Provenance, and Fingerprinting

## Clean source

The original private upload remains the authoritative Tourify source. Never overwrite it with protected, preview, transcoded, or watermarked derivatives.

## Integrity layers

### Exact file hash

Calculate SHA-256 on the server or trusted worker and record:

- track ID
- storage bucket/path
- file role
- byte size
- MIME type
- hash
- processing timestamp

### Acoustic fingerprint

Use the existing/selected worker environment to generate a fingerprint for duplicate and near-match review. It is a detection signal, not legal proof.

### Origin manifest

Freeze a deterministic manifest containing:

- track and artist references
- source hash
- relevant metadata
- declaration version and statement hash
- processing timestamps
- standard/schema versions
- previous origin version when superseding

## Public origin record

Expose only:

- public ID
- track/artist display information
- recorded date
- origin status
- manifest hash
- current/superseded status
- narrow disclaimer

Never expose private source URLs, storage paths, email, signatures, IP addresses, evidence files, or private declarations.

## Future provenance

Design extension points for:

- C2PA audio manifests
- issuer-signed credentials
- forensic watermark identifiers
- blockchain attestations

Do not block Phase 1 upload on these future integrations.
