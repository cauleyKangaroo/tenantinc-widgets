/** Raw backend ID, not a hashid or a URL-encoded value. */
export function isRawIdvId(value: unknown): value is string {
  return typeof value === 'string' && /^idv[0-9a-fA-F]{32}$/.test(value);
}

export function leaseIdvProblem(idvId: unknown, required = false): string | undefined {
  if (required && !isRawIdvId(idvId)) return 'Complete ID verification before continuing to payment.';
  if (idvId !== undefined && !isRawIdvId(idvId)) return 'Your verification link could not be confirmed. Please contact the facility before paying.';
  return undefined;
}
