/** Stable policy consumed by the rental UI and its editor-only preview. */
export type IdvRequirement = 'disabled' | 'required';

/**
 * Product rule confirmed by the rental-flow team: every rental requires ID
 * verification. Amenities are user-defined merchandising data and must never
 * enable or disable this workflow.
 */
export const RENTAL_IDV_REQUIREMENT: IdvRequirement = 'required';
