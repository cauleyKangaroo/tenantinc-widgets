/** Stable policy consumed by the rental UI and its editor-only preview. */
export type IdvRequirement = 'disabled' | 'required';

/**
 * Product rule confirmed by the rental-flow team: every rental requires ID
 * verification. Amenities are user-defined merchandising data and must never
 * enable or disable this workflow.
 */
export const RENTAL_IDV_REQUIREMENT: IdvRequirement = 'required';

/**
 * Production release brake for the billable/SMS-sending IDV transport.
 *
 * Keep false until the end-to-end rollout is approved. The localhost harness
 * has its own hostname-checked exception, so this does not prevent testing.
 */
export const IDV_SERVICE_CONNECTED = false;
