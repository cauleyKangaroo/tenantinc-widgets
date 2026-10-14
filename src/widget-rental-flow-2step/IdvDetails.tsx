// Mailing address and driver's licence after ID verification — one look for
// both rental flows (Figma "Renter ID Verify": Complete and Complete-Edit).
// A read-only summary with Edit, and Edit opens the fields.
import { FormField, SelectField } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import { COUNTRY_OPTIONS, placesCountryFor, postalCodeOk } from '@shared/addressCountry';
import { US_STATES } from '@shared/usStates';
import { CUSTOMER_ADDRESS_COUNTRIES } from '@shared/placesApi';

export interface MailingValue {
  /** The search box. Picking a suggestion fills the fields below it. */
  query: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface LicenceValue {
  number: string;
  /** MM/DD/YYYY, as typed. */
  exp: string;
  country: string;
  state: string;
}

export const EMPTY_MAILING: MailingValue = { query: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'United States' };
export const EMPTY_LICENCE: LicenceValue = { number: '', exp: '', country: 'United States', state: '' };

export type MailingErrors = Partial<Record<'country' | 'address1' | 'city' | 'state' | 'zip', string>>;
export type LicenceErrors = Partial<Record<'number' | 'exp' | 'state', string>>;

const STATE_OPTIONS = US_STATES.map((s) => ({ value: s.code, label: s.code }));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "06/18/2027" → "Jun 18, 2027". */
export function expiryLabel(masked: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return masked.trim();
  return `${MONTHS[Number(m[1]) - 1]} ${Number(m[2])}, ${m[3]}`;
}

/** The scan returns the licence number masked (****1847); it is never filed as the real one. */
export function isMaskedLicence(number: string): boolean {
  return /[*•]/.test(number);
}

export function mailingStreet(v: MailingValue): string {
  return [v.address1.trim(), v.address2.trim()].filter(Boolean).join(' ');
}

/** "2030-02-07" → "02/07/2030", the form the expiration field types. */
export function isoToMasked(value: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value ?? '';
}

export function mailingProblems(v: MailingValue): MailingErrors {
  const filled = (x: string) => x.trim().length > 0;
  return {
    ...(filled(v.address1) ? {} : { address1: 'Enter your mailing address' }),
    ...(filled(v.city) ? {} : { city: 'Enter the city' }),
    ...(v.state.trim().length === 2 ? {} : { state: 'Select the state' }),
    ...(postalCodeOk(v.zip, v.country || 'United States') ? {} : { zip: 'Enter a valid ZIP/postal code' }),
  };
}

export function licenceProblems(v: LicenceValue): LicenceErrors {
  return {
    ...(v.number.trim() && !isMaskedLicence(v.number) ? {} : { number: 'Enter the license number' }),
    ...(/^\d{2}\/\d{2}\/\d{4}$/.test(v.exp.trim()) ? {} : { exp: 'Enter the expiration date' }),
    ...(v.state.trim().length === 2 ? {} : { state: 'Select the state' }),
  };
}

/** What gets filed on the tenant's contact — only what is filled, never a masked number. */
export function contactDetailsFrom(mailing: MailingValue, licence: LicenceValue): {
  driverLicense?: string; driverLicenseExp?: string; driverLicenseState?: string;
  mailingAddress?: { address: string; city?: string; state?: string; zip?: string };
} {
  const street = mailingStreet(mailing);
  return {
    driverLicense: licence.number.trim() && !isMaskedLicence(licence.number) ? licence.number.trim() : undefined,
    driverLicenseExp: licence.exp.trim() || undefined,
    driverLicenseState: licence.state.trim() || undefined,
    mailingAddress: street ? {
      address: street,
      city: mailing.city.trim() || undefined,
      state: mailing.state.trim() || undefined,
      zip: mailing.zip.trim() || undefined,
    } : undefined,
  };
}

export function MailingAddressReadout({ value, onEdit }: { value: MailingValue; onEdit: () => void }) {
  const street = [v(value.address1), v(value.address2)].filter(Boolean).join(' ');
  const place = [v(value.city), [v(value.state), v(value.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return (
    <section className="rf-sx-extra rf-idd">
      <h3 className="rf-sx-extra-title">Mailing Address</h3>
      <div className="rf-sx-readout">
        <p className="rf-sx-readout-val">
          {street || place ? <>{street}{street && place ? ',' : ''}{street && <br />}{place}</> : 'Not returned by the ID scan'}
        </p>
        <button type="button" className="rf-sx-edit" onClick={onEdit}>Edit</button>
      </div>
    </section>
  );
}

export function MailingAddressFields({ value, onChange, errors = {}, required = true, showCountry = false, onCountryChange, compact = false }: {
  value: MailingValue;
  onChange: (patch: Partial<MailingValue>) => void;
  errors?: MailingErrors;
  required?: boolean;
  /** A Country select above the search (not in the Figma frames; kept available). */
  showCountry?: boolean;
  onCountryChange?: (country: string) => void;
  /** Only the search box until an address is picked or typed (Figma: failed / Verify ID Later). */
  compact?: boolean;
}) {
  const us = value.country !== 'Canada';
  const searchable = Boolean(value.country) || !showCountry;
  const showParts = !compact || Boolean(value.address1.trim() || value.city.trim() || value.state.trim() || value.zip.trim())
    || Object.values(errors).some(Boolean);
  return (
    <section className="rf-sx-extra rf-idd">
      <h3 className="rf-sx-extra-title">Mailing Address{required && <span className="rf-idd-req" aria-hidden="true"> *</span>}</h3>
      <div className="rf-idd-fields">
        {showCountry && (
          <SelectField
            label="Country" required value={value.country} options={[...COUNTRY_OPTIONS]}
            onChange={(c) => (onCountryChange ? onCountryChange(c) : onChange({ country: c }))}
            state={value.country ? 'success' : 'default'} error={errors.country}
          />
        )}
        <AddressAutocomplete
          country={showCountry ? placesCountryFor(value.country || 'United States') : CUSTOMER_ADDRESS_COUNTRIES}
          value={value.query}
          disabled={!searchable}
          onChange={(query) => onChange({ query })}
          onPick={(place) => onChange({
            ...(showCountry ? {} : { country: place.address.countryCode?.toLowerCase() === 'ca' ? 'Canada' : 'United States' }),
            query: place.address.street || value.query,
            address1: place.address.street || value.address1,
            city: place.address.city || value.city,
            state: place.address.stateCode || value.state,
            zip: place.address.zip || value.zip,
          })}
        >
          <FormField label="Search address" type="search" value={value.query} onChange={(query) => onChange({ query })} disabled={!searchable} autoComplete="off" />
        </AddressAutocomplete>
        {showParts && <>
        <FormField label="Address 1" required={required} value={value.address1} onChange={(address1) => onChange({ address1 })} autoComplete="address-line1" state={value.address1.trim() ? 'success' : 'default'} error={errors.address1} />
        <FormField label="Address 2" value={value.address2} onChange={(address2) => onChange({ address2 })} autoComplete="address-line2" />
        <div className="rf-idd-pair">
          {us ? (
            <SelectField label="State/Province" required={required} value={value.state} options={STATE_OPTIONS} onChange={(state) => onChange({ state })} state={value.state.trim().length === 2 ? 'success' : 'default'} error={errors.state} />
          ) : (
            <FormField label="State/Province" required={required} value={value.state} onChange={(state) => onChange({ state: state.toUpperCase().slice(0, 2) })} autoComplete="address-level1" state={value.state.trim().length === 2 ? 'success' : 'default'} error={errors.state} />
          )}
          <FormField label="ZIP/Postal" required={required} value={value.zip} onChange={(zip) => onChange({ zip })} autoComplete="postal-code" state={value.zip.trim() ? 'success' : 'default'} error={errors.zip} />
        </div>
        <FormField label="City" required={required} value={value.city} onChange={(city) => onChange({ city })} autoComplete="address-level2" state={value.city.trim() ? 'success' : 'default'} error={errors.city} />
        </>}
      </div>
    </section>
  );
}

export function LicenceReadout({ value, onEdit, title = 'Driver’s License' }: { value: LicenceValue; onEdit: () => void; title?: string }) {
  const second = [value.exp ? expiryLabel(value.exp) : '', v(value.state), v(value.country)].filter(Boolean).join(', ');
  return (
    <section className="rf-sx-extra rf-idd">
      <h3 className="rf-sx-extra-title">{title}</h3>
      <div className="rf-sx-readout">
        <p className="rf-sx-readout-val">
          {v(value.number) || 'Number not returned'}<br />
          {second || 'Details not returned'}
        </p>
        <button type="button" className="rf-sx-edit" onClick={onEdit}>Edit</button>
      </div>
    </section>
  );
}

export function LicenceFields({ value, onChange, title = 'Driver’s License', required = false, header, errors = {} }: {
  value: LicenceValue;
  onChange: (patch: Partial<LicenceValue>) => void;
  title?: string;
  required?: boolean;
  errors?: LicenceErrors;
  /** Extra control beside the title (the two-step passport checkbox). */
  header?: React.ReactNode;
}) {
  const us = value.country !== 'Canada';
  return (
    <section className="rf-sx-extra rf-idd">
      <div className="rf-sx-extra-head">
        <h3 className="rf-sx-extra-title">{title}{required && <span className="rf-idd-req" aria-hidden="true"> *</span>}</h3>
        {header}
      </div>
      <div className="rf-idd-fields">
        <FormField label="License Number" required={required} error={errors.number} value={value.number} onChange={(number) => onChange({ number })} autoComplete="off" state={value.number.trim() ? 'success' : 'default'} />
        <FormField label="Expiration Date" required={required} error={errors.exp} mask="date" value={value.exp} onChange={(exp) => onChange({ exp })} autoComplete="off" state={value.exp.length === 10 ? 'success' : 'default'} />
        <div className="rf-idd-pair">
          <SelectField label="Country" value={value.country} options={[...COUNTRY_OPTIONS]} placeholder={false} onChange={(country) => onChange({ country, state: country === value.country ? value.state : '' })} state="success" />
          {us ? (
            <SelectField label="State" required={required} error={errors.state} value={value.state} options={STATE_OPTIONS} onChange={(state) => onChange({ state })} state={value.state.trim().length === 2 ? 'success' : 'default'} />
          ) : (
            <FormField label="Province" required={required} error={errors.state} value={value.state} onChange={(state) => onChange({ state: state.toUpperCase().slice(0, 2) })} state={value.state.trim().length === 2 ? 'success' : 'default'} />
          )}
        </div>
      </div>
    </section>
  );
}

function v(value: string): string {
  return value.trim();
}
