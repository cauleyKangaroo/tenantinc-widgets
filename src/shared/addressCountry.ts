// ===========================================================================
// Country-first address entry — the one place that knows what "United States"
// or "Canada" means to the address search and to the fields beneath it.
//
// The shopper picks the country FIRST, the address search is then scoped to
// that country alone, and the parts a chosen suggestion fills (city, region,
// postal code) are labelled for it. Before: the search looked in both
// countries at once while the country select — where there was one — sat
// below the fields it should have governed, or was missing altogether.
//
// Two countries, by name not code, because the selects already carry their
// labels as values (see BillingCountry in paymentForms) and the property's
// own Address.country arrives the same way.
// ===========================================================================
import { CUSTOMER_ADDRESS_COUNTRIES } from './placesApi';

/** The choices every country select offers, in this order. */
export const COUNTRY_OPTIONS = ['United States', 'Canada'] as const;

const ISO: Record<string, string> = { 'united states': 'us', usa: 'us', us: 'us', canada: 'ca', ca: 'ca' };

/**
 * The Places `country` filter for a chosen country. Unchosen → both, so a
 * field that has no select in front of it keeps today's behaviour.
 */
export function placesCountryFor(country: string): string {
  return ISO[country.trim().toLowerCase()] ?? CUSTOMER_ADDRESS_COUNTRIES;
}

/** "State" in the US, "Province" in Canada — the field's label. */
export function regionLabel(country: string, prefix = ''): string {
  const word = placesCountryFor(country) === 'ca' ? 'Province' : 'State';
  return prefix ? `${prefix} ${word}` : word;
}

/** "ZIP Code" in the US, "Postal Code" in Canada. */
export function postalLabel(country: string, prefix = ''): string {
  const word = placesCountryFor(country) === 'ca' ? 'Postal Code' : 'ZIP Code';
  return prefix ? `${prefix} ${word}` : word;
}

/**
 * A postal code that is at least plausible for the country: five digits (or
 * ZIP+4) in the US, "A1A 1A1" in Canada. Anything else is a typo, not a
 * format we have not met.
 */
export function postalCodeOk(zip: string, country: string): boolean {
  const z = zip.trim();
  if (placesCountryFor(country) === 'ca') return /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(z);
  if (placesCountryFor(country) === 'us') return /^\d{5}(-\d{4})?$/.test(z);
  return z.length >= 3;
}
