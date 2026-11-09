/** Shared editorial budgets. String limits count UTF-16 code units, like string.length. */
export const CONTENT_LIMITS = {
  hero: {
    eyebrow: 16,
    headline: 20,
    stage: { tagline: 26, description: 56 },
  },
  project: {
    name: 11,
    summary: 92,
    what: 228,
    how: 294,
  },
  publication: {
    title: 40,
    summary: 112,
    tagLength: 16,
    tagCount: 3,
  },
} as const;
