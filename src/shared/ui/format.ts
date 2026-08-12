// Shared money formatting so every widget renders prices identically.
// Whole dollars show no decimals ("$110"); anything else shows two ("$71.58").
export const formatPrice = (n: number): string =>
  (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
