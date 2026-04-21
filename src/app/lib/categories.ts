/**
 * Canonical list of division categories used across the app. Exposed as a
 * single source of truth so the Tournament / Team / Player form modals all
 * offer the exact same options — otherwise a typo ("Sub 14" vs "Sub-14")
 * silently breaks the enrolment filter in AdminTournamentDetail because
 * team.category must match one of tournament.categories exactly.
 *
 * If you add a new category here every form picks it up automatically.
 * Keep values stable — they're stored as plain strings in the DB.
 */
export const CATEGORIES: readonly string[] = [
  'Sub-14 Masculino',
  'Sub-14 Femenino',
  'Sub-16 Masculino',
  'Sub-16 Femenino',
  'Sub-18 Masculino',
  'Sub-18 Femenino',
  'Sub-21 Masculino',
  'Sub-21 Femenino',
  'Mayores Masculino',
  'Mayores Femenino',
  'Senior Masculino',
  'Senior Femenino',
  'Mixto',
] as const;
