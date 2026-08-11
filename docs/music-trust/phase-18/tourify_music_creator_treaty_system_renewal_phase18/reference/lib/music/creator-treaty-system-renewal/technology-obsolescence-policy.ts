export function evaluateTechnologyMigration(input: {
  currentVerificationSupportedUntil: Date;
  migrationComplete: boolean;
  oldVerificationReproducible: boolean;
  transformationManifestPresent: boolean;
  historicalMeaningChanged: boolean;
  now: Date;
}) {
  if (input.historicalMeaningChanged) return { allowed: false, reason: 'historical_meaning_changed' } as const;
  if (!input.oldVerificationReproducible) return { allowed: false, reason: 'legacy_verification_unavailable' } as const;
  if (!input.transformationManifestPresent) return { allowed: false, reason: 'missing_transformation_manifest' } as const;
  if (input.now >= input.currentVerificationSupportedUntil && !input.migrationComplete) {
    return { allowed: false, reason: 'migration_overdue' } as const;
  }
  return { allowed: true, reason: 'migration_controls_satisfied' } as const;
}
