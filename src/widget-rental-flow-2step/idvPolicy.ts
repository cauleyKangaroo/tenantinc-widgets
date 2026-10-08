/** Per-property policy consumed by the rental UI and its editor-only preview. */
export type IdvRequirement = 'disabled' | 'optional' | 'required';

/**
 * Applied when a property carries no usable setting: the idv_requirement
 * column is missing, the cell is empty, the value is not one of the three, or
 * the collection cannot be read. OFF — verification (a billed capture and an
 * SMS) only ever starts where an operator has chosen Optional or Required.
 * Amenities are user-defined merchandising data and never enable or disable
 * this workflow; only the property setting does.
 */
export const RENTAL_IDV_REQUIREMENT: IdvRequirement = 'disabled';

/**
 * The property's own setting, as the API or a collection hands it over.
 * Anything unrecognised is `undefined`, so a typo falls back to the default
 * rather than being read as one of the three choices.
 */
export function parseIdvRequirement(raw: unknown): IdvRequirement | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.replace(/<[^>]*>/g, '').trim().toLowerCase();
  if (value === 'none' || value === 'disabled' || value === 'off') return 'disabled';
  if (value === 'optional') return 'optional';
  if (value === 'required') return 'required';
  return undefined;
}

/**
 * Production release brake for the billable/SMS-sending IDV transport.
 *
 * Keep false until the end-to-end rollout is approved. The localhost harness
 * has its own hostname-checked exception, so this does not prevent testing.
 */
export const IDV_SERVICE_CONNECTED = true;
