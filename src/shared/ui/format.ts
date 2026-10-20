// Shared money formatting so every widget renders prices identically.
// Whole dollars show no decimals ("$110"); anything else shows two ("$71.58").
export const formatPrice = (n: number): string =>
  (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/**
 * Name fields: the first letter upper-case as it is typed ("hyder" → "Hyder").
 * Only the first character — the rest is left exactly as typed, so names like
 * "McDonald" or "de la Cruz" are not rewritten.
 */
export const capitalizeFirst = (v: string): string =>
  v.charAt(0).toUpperCase() + v.slice(1);
