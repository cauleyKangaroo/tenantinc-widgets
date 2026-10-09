import { FormField, isPossiblePhone } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import { CUSTOMER_ADDRESS_COUNTRIES } from '@shared/placesApi';
import { ChevronBig } from './planIcons';

// ===========================================================================
// The Additional Information field groups — the three expanded states.
//
// SHARED between the rental form (Step2, both layouts) and the post-purchase
// screen (SuccessStep), which ask for exactly the same things. A shopper can
// now meet both in a single journey, so the markup, the labels, the option
// lists and above all the REQUIRED rules live here and are imported rather
// than re-typed.
//
// Only the field groups moved. Each screen keeps its own checkbox and its own
// wrapper, because those genuinely differ (RfCheckbox vs the kit's Checkbox),
// and the wrapper classes they nest in — .rf-sx-group, .rf-sx-fields,
// .rf-pay-grid — are global, so the same markup lands correctly in both.
// ===========================================================================

/** Every value the three groups collect. */
export interface ExtraFieldValues {
  /** MM/DD/YYYY as typed — the mask's format, not the API's. */
  dob: string;
  altFirst: string;
  altLast: string;
  altPhone: string;
  altEmail: string;
  altAddress: string;
  /** Filled by the address picker when a suggestion is chosen; empty for a
   *  typed-only line. The lease files the alternate's address as four parts. */
  altCity: string;
  altState: string;
  altZip: string;
  vType: string;
  make: string;
  model: string;
  year: string;
  colour: string;
  plate: string;
  country: string;
  stateVal: string;
}

export const EMPTY_EXTRA_FIELDS: ExtraFieldValues = {
  dob: '',
  altFirst: '', altLast: '', altPhone: '', altEmail: '', altAddress: '',
  altCity: '', altState: '', altZip: '',
  vType: '', make: '', model: '', year: '', colour: '', plate: '', country: '', stateVal: '',
};

/** Which of the three sections are switched on. */
export interface ExtraSectionsOn {
  military: boolean;
  altContact: boolean;
  vehicle: boolean;
}

const filled = (v: string) => v.trim().length > 0;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/**
 * Required fields, and ONLY for the sections actually switched on.
 *
 * An unticked section is not an incomplete one, and a required field that is
 * not on screen produces a message nobody can act on — it would simply disable
 * the button with no way to find out why.
 */
export function extraFieldProblems(
  on: ExtraSectionsOn,
  v: ExtraFieldValues,
  /**
   * The PRIMARY contact's own email and phone. An alternate contact is the
   * person to reach when the tenant cannot be, so it cannot be the tenant:
   * the same email or the same number is rejected on the field that repeats
   * it. Compared on what identifies a person, not on the name — two people
   * can share a name, but not an inbox or a phone.
   */
  primary?: { email?: string; phone?: string },
): Record<string, string> {
  const sameEmail = !!primary?.email && isEmail(v.altEmail)
    && v.altEmail.trim().toLowerCase() === primary.email.trim().toLowerCase();
  const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const samePhone = !!primary?.phone && isPossiblePhone(v.altPhone, 'US')
    && digits(v.altPhone).length > 0 && digits(v.altPhone) === digits(primary.phone);
  return {
    // The mask is MM/DD/YYYY, so a complete date is exactly ten characters —
    // "12/25/" is filled but not a date.
    ...(on.military ? { dob: v.dob.length === 10 ? '' : 'Enter a valid date of birth' } : {}),
    ...(on.altContact ? {
      altFirst: filled(v.altFirst) ? '' : 'Enter the alternate contact’s first name',
      altLast: filled(v.altLast) ? '' : 'Enter the alternate contact’s last name',
      altPhone: !isPossiblePhone(v.altPhone, 'US') ? 'Enter a valid phone number'
        : samePhone ? 'The alternate contact must be a different person — this is your own number' : '',
      altEmail: !isEmail(v.altEmail) ? 'Enter a valid email address'
        : sameEmail ? 'The alternate contact must be a different person — this is your own email' : '',
      altAddress: filled(v.altAddress) ? '' : 'Enter the alternate contact’s address',
    } : {}),
    // Vehicle Type alone carries the asterisk in the frame; make, model, year,
    // colour, plate, country and state are all optional.
    ...(on.vehicle ? { vType: filled(v.vType) ? '' : 'Select a vehicle type' } : {}),
  };
}

/**
 * A native select wearing a FormField's face, so a dropdown sits in the same
 * place and style as every other field.
 */
export function Select({
  label, value, onChange, options, required, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  /** Rendered by the FormField face below, so a select's message sits in the
   *  same place and style as every other field's. */
  error?: string;
}) {
  return (
    <div className="rf-select">
      <label className="rf-select-native">
        <span className="rf-sr-only">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">{`Select ${label}`}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <div className="rf-select-face" aria-hidden="true">
        <FormField label={label} required={required} value={value} onChange={() => {}} error={error} />
        <ChevronBig size={24} className="rf-select-chev" />
      </div>
    </div>
  );
}

/** What every group below needs: the values, a patch setter, and the screen's
 *  own error lookup (message or undefined). */
interface GroupProps {
  v: ExtraFieldValues;
  set: (patch: Partial<ExtraFieldValues>) => void;
  bad: (key: string) => string | undefined;
  /**
   * Show the green border + tick as soon as a value is good.
   *
   * On in the rental form, where every other field does it and the frames draw
   * these the same way; off on the post-purchase screen, which has never shown
   * it and is not part of this change.
   */
  validated?: boolean;
}

/** `state` for a FormField that should confirm itself once valid. */
const okState = (validated: boolean | undefined, err: string | undefined, ok: boolean) =>
  (validated && !err && ok ? 'success' : 'default') as 'success' | 'default';

export function MilitaryFields({ v, set, bad, validated }: GroupProps) {
  const err = bad('dob');
  return (
    <div className="rf-sx-fields">
      {/* Typed mask, not a picker: scrolling a calendar back decades to a
          birth year is slower than typing it. */}
      <FormField
        label="Date of Birth" required mask="date"
        value={v.dob} onChange={(dob) => set({ dob })} error={err}
        state={okState(validated, err, v.dob.length === 10)}
      />
    </div>
  );
}

export function AltContactFields({ v, set, bad, validated }: GroupProps) {
  const e = {
    first: bad('altFirst'), last: bad('altLast'), phone: bad('altPhone'),
    email: bad('altEmail'), address: bad('altAddress'),
  };
  return (
    <div className="rf-sx-fields">
      <div className="rf-pay-grid">
        <FormField label="First Name" required value={v.altFirst} onChange={(altFirst) => set({ altFirst })}
          error={e.first} state={okState(validated, e.first, filled(v.altFirst))} />
        <FormField label="Last Name" required value={v.altLast} onChange={(altLast) => set({ altLast })}
          error={e.last} state={okState(validated, e.last, filled(v.altLast))} />
        <FormField label="Phone" required type="tel" value={v.altPhone} onChange={(altPhone) => set({ altPhone })}
          error={e.phone} state={okState(validated, e.phone, isPossiblePhone(v.altPhone, 'US'))} />
        <FormField label="Email" required type="email" value={v.altEmail} onChange={(altEmail) => set({ altEmail })}
          error={e.email} state={okState(validated, e.email, isEmail(v.altEmail))} />
      </div>
      {/* The same lookup the mailing address uses — a typed address that never
          resolves is the commonest way this section arrives unusable. */}
      <AddressAutocomplete
        country={CUSTOMER_ADDRESS_COUNTRIES}
        value={v.altAddress}
        /* Typing clears the picked parts: they described the address that was
           chosen, not whatever is being typed over it. */
        onChange={(altAddress) => set({ altAddress, altCity: '', altState: '', altZip: '' })}
        onPick={(place) => set({
          altAddress: place.address.street || place.formattedAddress,
          altCity: place.address.city ?? '',
          altState: place.address.stateCode || place.address.state || '',
          altZip: place.address.zip ?? '',
        })}
      >
        <FormField label="Address" required type="search" value={v.altAddress} onChange={(altAddress) => set({ altAddress, altCity: '', altState: '', altZip: '' })}
          error={e.address} state={okState(validated, e.address, filled(v.altAddress))} />
      </AddressAutocomplete>
    </div>
  );
}

export function VehicleFields({ v, set, bad, validated }: GroupProps) {
  const err = bad('vType');
  return (
    <div className="rf-sx-fields">
      <Select
        label="Vehicle Type" required value={v.vType} onChange={(vType) => set({ vType })}
        options={['Car', 'Motorcycle', 'RV', 'Boat', 'Trailer']}
        error={err}
      />
      <div className="rf-pay-grid">
        {/* Make/Model/Year/Colour/Plate are NOT required in the frame —
            only Vehicle Type carries the asterisk. */}
        <FormField label="Make" value={v.make} onChange={(make) => set({ make })}
          state={okState(validated, undefined, filled(v.make))} />
        <FormField label="Model" value={v.model} onChange={(model) => set({ model })}
          state={okState(validated, undefined, filled(v.model))} />
        <FormField label="Year" value={v.year} onChange={(year) => set({ year })}
          state={okState(validated, undefined, filled(v.year))} />
        <FormField label="Color" value={v.colour} onChange={(colour) => set({ colour })}
          state={okState(validated, undefined, filled(v.colour))} />
        <FormField label="License Plate Number" value={v.plate} onChange={(plate) => set({ plate })}
          state={okState(validated, undefined, filled(v.plate))} />
        <Select label="Country" value={v.country} onChange={(country) => set({ country })} options={['United States', 'Canada']} />
      </div>
      <Select label="State" value={v.stateVal} onChange={(stateVal) => set({ stateVal })} options={['California', 'Arizona', 'Nevada', 'Texas']} />
    </div>
  );
}
