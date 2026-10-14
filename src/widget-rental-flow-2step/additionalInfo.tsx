import { Fragment, useEffect, useRef, useState } from 'react';
import { FormField, SelectField, isPossiblePhone } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import {
  COUNTRY_OPTIONS, placesCountryFor, postalCodeOk, postalLabel, regionLabel,
} from '@shared/addressCountry';
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
  /** Chosen BEFORE the address: it scopes the search. 'United States' | 'Canada'. */
  altCountry: string;
  altAddress: string;
  /** Filled by the address picker when a suggestion is chosen, and editable
   *  after. The lease files the alternate's address as four parts. */
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
  altFirst: '', altLast: '', altPhone: '', altEmail: '', altCountry: '', altAddress: '',
  altCity: '', altState: '', altZip: '',
  vType: '', make: '', model: '', year: '', colour: '', plate: '', country: '', stateVal: '',
};

/** Which of the three sections are switched on. */
export interface ExtraSectionsOn {
  military: boolean;
  altContact: boolean;
  vehicle: boolean;
}

/**
 * The PRIMARY contact — the tenant — as far as the alternate contact needs to
 * know them. See `extraFieldProblems` for what is compared.
 */
export interface PrimaryContact {
  first?: string;
  last?: string;
  email?: string;
  phone?: string;
}

const filled = (v: string) => v.trim().length > 0;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const norm = (v: string | undefined) => (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

/** A date of birth may be at most this far back. */
export const DOB_MAX_YEARS = 120;

/**
 * Why a typed MM/DD/YYYY is not a date of birth, or '' when it is one.
 *
 * The mask only shapes digits into slashes — it accepted "90/03/4523" and the
 * old rule (ten characters) turned it green. A birth date has to be a real
 * calendar day (no 30th of February), on or before today, and within the last
 * 120 years: an active-service member is not 130, and a future date is a
 * typo. Compared on the calendar day, not the clock, so someone born today
 * (a typo too, but a well-formed one) is "in the future" only from tomorrow.
 */
export function dobProblem(masked: string, today = new Date()): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked.trim());
  if (!m) return 'Enter a valid date of birth (MM/DD/YYYY)';
  const mm = +m[1]; const dd = +m[2]; const yyyy = +m[3];
  const d = new Date(yyyy, mm - 1, dd);
  // The Date constructor rolls an impossible day forward (Feb 30 → Mar 2); a
  // real date reads back as what went in.
  if (mm < 1 || mm > 12 || dd < 1 || d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
    return 'Enter a valid date of birth (MM/DD/YYYY)';
  }
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d.getTime() > t.getTime()) return 'Date of birth cannot be in the future';
  const oldest = new Date(t.getFullYear() - DOB_MAX_YEARS, t.getMonth(), t.getDate());
  if (d.getTime() < oldest.getTime()) return `Date of birth must be within the last ${DOB_MAX_YEARS} years`;
  return '';
}

/**
 * The alternate contact must be a different PERSON from the tenant, so the
 * three things that identify one are each compared: the email, the phone and
 * the full name. Two people can share a name, but a tenant who types their own
 * name AND their own number or inbox has named themselves, and the name alone
 * is rejected too — the usual way this section goes wrong is the tenant
 * filling it in about themselves, and the name is the first field they reach.
 * Returned per field so the message lands on the one that repeats.
 */
export function alternateDuplicates(v: ExtraFieldValues, primary?: PrimaryContact) {
  if (!primary) return { name: false, email: false, phone: false };
  const sameName = !!(primary.first && primary.last) && filled(v.altFirst) && filled(v.altLast)
    && norm(v.altFirst) === norm(primary.first) && norm(v.altLast) === norm(primary.last);
  const sameEmail = !!primary.email && isEmail(v.altEmail) && norm(v.altEmail) === norm(primary.email);
  const samePhone = !!primary.phone && isPossiblePhone(v.altPhone, 'US')
    && phoneDigits(v.altPhone).length > 0 && phoneDigits(v.altPhone) === phoneDigits(primary.phone);
  return { name: sameName, email: sameEmail, phone: samePhone };
}

const DIFFERENT = 'The alternate contact must be a different person —';

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
   * The PRIMARY contact's own name, email and phone. An alternate contact is
   * the person to reach when the tenant cannot be, so it cannot be the tenant:
   * whichever of those repeats is rejected on the field that repeats it.
   */
  primary?: PrimaryContact,
): Record<string, string> {
  const dup = alternateDuplicates(v, primary);
  return {
    ...(on.military ? { dob: dobProblem(v.dob) } : {}),
    ...(on.altContact ? {
      altFirst: !filled(v.altFirst) ? 'Enter the alternate contact’s first name'
        : dup.name ? `${DIFFERENT} this is your own name` : '',
      altLast: !filled(v.altLast) ? 'Enter the alternate contact’s last name'
        : dup.name ? `${DIFFERENT} this is your own name` : '',
      altPhone: !isPossiblePhone(v.altPhone, 'US') ? 'Enter a valid phone number'
        : dup.phone ? `${DIFFERENT} this is your own number` : '',
      altEmail: !isEmail(v.altEmail) ? 'Enter a valid email address'
        : dup.email ? `${DIFFERENT} this is your own email` : '',
      altCountry: filled(v.altCountry) ? '' : 'Select the alternate contact’s country',
      altAddress: filled(v.altAddress) ? '' : 'Enter the alternate contact’s address',
      // The parts are required as soon as there IS an address — a street on
      // its own is not somewhere a notice can be posted to. Keyed off the
      // address, not off whether the three are on screen.
      ...(filled(v.altAddress) ? {
        altCity: filled(v.altCity) ? '' : 'Enter the city',
        altState: v.altState.trim().length === 2 ? '' : `Enter the two-letter ${regionLabel(v.altCountry).toLowerCase()}`,
        altZip: postalCodeOk(v.altZip, v.altCountry) ? '' : `Enter a valid ${postalLabel(v.altCountry)}`,
      } : {}),
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
  /* The list is our own menu, the same one the Protection / Key-share plan
     controls open (.rf2-plan-menu / .rf2-plan-opt), rather than the browser's
     native picker, which every OS draws differently. The closed field is
     unchanged: a transparent trigger over the FormField face. Closes on a pick,
     an outside click or Escape. */
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="rf-select rf-select--menu" ref={wrapRef}>
      <button
        type="button"
        className="rf-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={value ? `${label}: ${value}` : `Select ${label}`}
        aria-required={required || undefined}
        onClick={() => setOpen((o) => !o)}
      />
      <div className="rf-select-face" aria-hidden="true">
        <FormField label={label} required={required} value={value} onChange={() => {}} error={error} />
        <ChevronBig size={24} className={`rf-select-chev${open ? ' rf-select-chev--up' : ''}`} />
      </div>
      {open && (
        <div className="rf2-plan-menu rf-select-menu" role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <Fragment key={o}>
              {i > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
              <button
                type="button"
                role="option"
                aria-selected={value === o}
                className={`rf2-plan-opt${value === o ? ' rf-select-opt--on' : ''}`}
                onClick={() => { onChange(o); setOpen(false); }}
              >
                <span className="rf2-plan-opt-cov"><b>{o}</b></span>
              </button>
            </Fragment>
          ))}
        </div>
      )}
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
  /** The tenant, so the alternate contact can be told apart from them AS THEY
   *  TYPE rather than only when the button is pressed. */
  primary?: PrimaryContact;
}

/** `state` for a FormField that should confirm itself once valid. */
const okState = (validated: boolean | undefined, err: string | undefined, ok: boolean) =>
  (validated && !err && ok ? 'success' : 'default') as 'success' | 'default';

export function MilitaryFields({ v, set, bad, validated }: GroupProps) {
  /* The screen's error (after an attempt) or, once all ten characters are in,
     the date's own verdict straight away: a field that turned green on
     "90/03/4523" was the complaint, so a complete-but-impossible date says so
     the moment it is complete, not at the button. */
  const complete = v.dob.length === 10;
  const live = complete ? dobProblem(v.dob) || undefined : undefined;
  const err = bad('dob') ?? live;
  return (
    <div className="rf-sx-fields">
      {/* Typed mask, not a picker: scrolling a calendar back decades to a
          birth year is slower than typing it. */}
      <FormField
        label="Date of Birth" required mask="date"
        value={v.dob} onChange={(dob) => set({ dob })} error={err}
        state={okState(validated, err, complete)}
      />
    </div>
  );
}

export function AltContactFields({ v, set, bad, validated, primary }: GroupProps) {
  const dup = alternateDuplicates(v, primary);
  /* Live, like the date above: a field that repeats the tenant's own detail
     says so as soon as it does, instead of ticking green until the button. */
  const e = {
    first: bad('altFirst') ?? (dup.name ? `${DIFFERENT} this is your own name` : undefined),
    last: bad('altLast') ?? (dup.name ? `${DIFFERENT} this is your own name` : undefined),
    phone: bad('altPhone') ?? (dup.phone ? `${DIFFERENT} this is your own number` : undefined),
    email: bad('altEmail') ?? (dup.email ? `${DIFFERENT} this is your own email` : undefined),
    country: bad('altCountry'), address: bad('altAddress'),
    city: bad('altCity'), state: bad('altState'), zip: bad('altZip'),
  };
  /* The parts appear once the lookup has filled them, once anything is in
     them, or once a failed attempt asks for them — the same reveal the mailing
     address uses. Four empty boxes before an address is chosen are four boxes
     nobody should have to type into. */
  const [picked, setPicked] = useState(false);
  const showParts = picked || filled(v.altCity) || filled(v.altState) || filled(v.altZip)
    || !!(e.city || e.state || e.zip);
  const countryChosen = filled(v.altCountry);
  const clearParts = { altCity: '', altState: '', altZip: '' };
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
      {/* Country FIRST, then the address search scoped to it. Until a country
          is chosen the search box is closed: a lookup across both countries
          offers a Toronto street to someone typing a Tucson one. Changing the
          country afterwards clears the chosen address — it described a place
          in the other country. */}
      <div className="rf-pay-grid">
        <SelectField
          label="Country" required value={v.altCountry}
          onChange={(altCountry) => { setPicked(false); set({ altCountry, altAddress: '', ...clearParts }); }}
          options={[...COUNTRY_OPTIONS]}
          state={validated && countryChosen ? 'success' : 'default'}
          error={e.country}
        />
        {/* The same lookup the mailing address uses — a typed address that
            never resolves is the commonest way this section arrives
            unusable. */}
        <AddressAutocomplete
          country={placesCountryFor(v.altCountry)}
          value={v.altAddress}
          disabled={!countryChosen}
          /* Typing clears the picked parts: they described the address that
             was chosen, not whatever is being typed over it. */
          onChange={(altAddress) => { setPicked(false); set({ altAddress, ...clearParts }); }}
          onPick={(place) => {
            setPicked(true);
            set({
              altAddress: place.address.street || place.formattedAddress,
              altCity: place.address.city ?? '',
              altState: place.address.stateCode || place.address.state || '',
              altZip: place.address.zip ?? '',
            });
          }}
        >
          <FormField label="Address" required type="search" value={v.altAddress}
            disabled={!countryChosen}
            onChange={(altAddress) => { setPicked(false); set({ altAddress, ...clearParts }); }}
            error={e.address} state={okState(validated, e.address, filled(v.altAddress))} />
        </AddressAutocomplete>
      </div>
      {showParts && (
        <div className="rf-sx-grid3">
          <FormField label="City" required value={v.altCity} onChange={(altCity) => set({ altCity })}
            autoComplete="address-level2"
            error={e.city} state={okState(validated, e.city, filled(v.altCity))} />
          <FormField label={regionLabel(v.altCountry)} required value={v.altState}
            onChange={(s) => set({ altState: s.toUpperCase().slice(0, 2) })} autoComplete="address-level1"
            error={e.state} state={okState(validated, e.state, v.altState.trim().length === 2)} />
          <FormField label={postalLabel(v.altCountry)} required value={v.altZip} onChange={(altZip) => set({ altZip })}
            autoComplete="postal-code"
            error={e.zip} state={okState(validated, e.zip, postalCodeOk(v.altZip, v.altCountry))} />
        </div>
      )}
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
