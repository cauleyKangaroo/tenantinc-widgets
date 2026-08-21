// ===========================================================================
// "You've got your space! Finish up below for access" — the post-purchase screen.
// Figma: Mariposa — Duda, node 8507-25408.
//
// Two parts: an ID Verification card, then Additional Information whose field
// groups are each revealed by their own checkbox. In the Figma frame every
// checkbox is ticked so all groups show at once; here they start UNTICKED and
// reveal on demand, because that is what the checkbox is for — showing 20 fields
// to someone storing nothing but boxes would be a worse screen than the design.
//
// Fields are `@shared/ui` FormField — the frame is built from the same
// "Mariposa Form 2.0" component the kit was traced from.
//
// STATIC, as briefed: nothing is submitted, and "Get Access" / "Verify ID Now"
// are inert. The ID illustration's line art is bundled; see the note on
// `IdIllustration` for the one asset that isn't.
// ===========================================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { Checkbox, DateModal, FormField, isPossiblePhone } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import { ChevronBig } from './planIcons';
import { CalendarIcon } from './icons';

import idHandCard from './assets/id-g72.svg';
import idCardFace from './assets/id-g105.svg';
import idPhoneA from './assets/id-g28.svg';
import idPhoneB from './assets/id-g27.svg';
import idScreen from './assets/id-rect.svg';
import idThumbA from './assets/id-p19.svg';
import idThumbB from './assets/id-p18.svg';
import idPortrait from './assets/id-portrait.png';

function Select({
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

/**
 * The hand-holding-phone-and-ID line drawing from the ID Verification card.
 *
 * The exported layers, positioned at the coordinates Figma 10078-25475 gives
 * them. Every layer is a percentage of the 292.25 × 119.43 artboard those
 * coordinates live in, so the whole thing scales with the card.
 *
 * The licence photo IS included now. Figma exports it at 920×589 (1 MB) for
 * something that renders ~60×38, and webpack inlines images as base64
 * (`asset/inline`), so the export is resampled to 180×115 — 3× the display size,
 * enough for retina — which costs ~57 KB instead of ~1.35 MB inlined.
 */
// Kept alongside the parked card above, so both come back together.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IdIllustration() {
  return (
    <div className="rf-sx-illus" aria-hidden="true">
      {/* Painter's order, exactly as the frame stacks them. Right hand and its
          ID card first: hand, white card, licence photo, keyline, fingers. */}
      <img className="rf-sx-illus-l rf-sx-illus-handcard" src={idHandCard} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-cardbg" />
      <img className="rf-sx-illus-l rf-sx-illus-portrait" src={idPortrait} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-cardline" />
      <img className="rf-sx-illus-l rf-sx-illus-cardface" src={idCardFace} alt="" />

      {/* Then the left hand and its phone. */}
      <img className="rf-sx-illus-l rf-sx-illus-phoneA" src={idPhoneA} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-glint" />
      <img className="rf-sx-illus-l rf-sx-illus-phoneB" src={idPhoneB} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-screen" src={idScreen} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-thumbA" src={idThumbA} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-thumbB" src={idThumbB} alt="" />
    </div>
  );
}

/** What this screen can actually file against the contact after the lease. */
export interface SuccessDetails {
  driverLicense?: string;
  /** As typed, MM/DD/YYYY — the parent converts. */
  driverLicenseExp?: string;
  driverLicenseState?: string;
  mailingAddress?: { address: string; city?: string; state?: string; zip?: string };
}

/** MM/DD/YYYY — the shape updateContactDetails converts to the API's date. */
const formatMasked = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
};

export function SuccessStep({ onGetAccess, chosen }: {
  /** Fires with everything the contact update can file. The parent decides
   *  what to do with it; this screen just collects. */
  onGetAccess?: (details?: SuccessDetails) => void;
  /** What the shopper ticked back in step 2. Those screens ask the QUESTION;
   *  this one asks for the details, so it opens the same sections already
   *  ticked rather than making them answer twice. */
  chosen?: { business?: boolean; military?: boolean; altContact?: boolean; vehicle?: boolean };
}) {
  // Initialisers, not synced props: the boxes stay the shopper's to change here.
  const [business, setBusiness] = useState(chosen?.business ?? false);
  const [military, setMilitary] = useState(chosen?.military ?? false);
  const [altContact, setAltContact] = useState(chosen?.altContact ?? false);
  const [vehicle, setVehicle] = useState(chosen?.vehicle ?? false);

  // Mailing address — where notices go when it is not the space's address.
  // Filed on the contact as an Addresses entry of type "mailing" (verified
  // 2026-08-21: it persists).
  const [mailAddress, setMailAddress] = useState('');
  const [mailCity, setMailCity] = useState('');
  const [mailState, setMailState] = useState('');
  const [mailZip, setMailZip] = useState('');

  // Driver's licence. THESE are what "ID verification" means to this API —
  // there is no verification service, only these three fields on the contact,
  // and all three persist.
  const [dlNumber, setDlNumber] = useState('');
  const [dlExp, setDlExp] = useState('');
  const [dlExpDate, setDlExpDate] = useState<Date | null>(null);
  const [dlExpOpen, setDlExpOpen] = useState(false);
  const [dlState, setDlState] = useState('');

  /** A picked or typed mailing address — the city/state/ZIP follow it. */
  const [mailPicked, setMailPicked] = useState(false);
  const showMailParts = mailPicked
    || !!(mailCity.trim() || mailState.trim() || mailZip.trim());

  // Business
  const [bizAddress, setBizAddress] = useState('');
  const [repFirst, setRepFirst] = useState('');
  const [repLast, setRepLast] = useState('');
  // Military
  const [dob, setDob] = useState('');
  // Alternate contact
  const [altFirst, setAltFirst] = useState('');
  const [altLast, setAltLast] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [altEmail, setAltEmail] = useState('');
  const [altAddress, setAltAddress] = useState('');
  // Vehicle
  const [vType, setVType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [colour, setColour] = useState('');
  const [plate, setPlate] = useState('');
  const [country, setCountry] = useState('');
  const [stateVal, setStateVal] = useState('');

  /**
   * Required fields, and only for the sections actually switched on — an
   * unticked section is not an incomplete one. Messages appear on the first
   * attempt to continue, not while typing: flagging a field the shopper has not
   * reached yet is noise, and this form can be twenty inputs long.
   */
  const [attempted, setAttempted] = useState(false);
  const filled = (v: string) => v.trim().length > 0;
  const problems: Record<string, string> = {
    ...(business ? {
      bizAddress: filled(bizAddress) ? '' : 'Enter the business address',
      repFirst: filled(repFirst) ? '' : 'Enter the business rep’s first name',
      repLast: filled(repLast) ? '' : 'Enter the business rep’s last name',
    } : {}),
    // The mask is MM/DD/YYYY, so a complete date is exactly ten characters —
    // "12/25/" is filled but not a date.
    ...(military ? { dob: dob.length === 10 ? '' : 'Enter a valid date of birth' } : {}),
    ...(altContact ? {
      altFirst: filled(altFirst) ? '' : 'Enter the alternate contact’s first name',
      altLast: filled(altLast) ? '' : 'Enter the alternate contact’s last name',
      altPhone: isPossiblePhone(altPhone, 'US') ? '' : 'Enter a valid phone number',
      altEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(altEmail.trim()) ? '' : 'Enter a valid email address',
      altAddress: filled(altAddress) ? '' : 'Enter the alternate contact’s address',
    } : {}),
    // Vehicle Type alone carries the asterisk in the frame; make, model, year,
    // colour, plate, country and state are all optional.
    ...(vehicle ? { vType: filled(vType) ? '' : 'Select a vehicle type' } : {}),
  };
  const bad = (k: string) => (attempted && problems[k] ? problems[k] : undefined);

  /**
   * Bumped on every FAILED attempt, not just the first, so pressing Get Access
   * again after fixing one field still takes you to the next one. A boolean
   * would only ever fire once.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const [failures, setFailures] = useState(0);
  const submit = () => {
    setAttempted(true);
    if (Object.values(problems).some(Boolean)) { setFailures((n) => n + 1); return; }
    // Only what was filled — the update must not blank a value the tenant may
    // have given at the counter.
    onGetAccess?.({
      driverLicense: dlNumber.trim() || undefined,
      driverLicenseExp: dlExp.trim() || undefined,
      driverLicenseState: dlState.trim() || undefined,
      mailingAddress: mailAddress.trim()
        ? {
          address: mailAddress.trim(),
          city: mailCity.trim() || undefined,
          state: mailState.trim() || undefined,
          zip: mailZip.trim() || undefined,
        }
        : undefined,
    });
  };

  /**
   * Take the shopper to the topmost error. Without this the button appears dead
   * whenever the first missing field is above the fold — the messages render,
   * just nowhere they can see.
   *
   * A LAYOUT effect: it has to run after React has painted the error state,
   * because the element being looked for does not exist until then.
   * `querySelector` returns the first match in DOM order, which in a single
   * column is the highest on the page. Centred rather than aligned to the top,
   * so the sticky header cannot land on top of the field it just scrolled to.
   */
  useLayoutEffect(() => {
    if (!failures) return;
    const first = rootRef.current?.querySelector('.hb-field--error');
    if (!first) return;
    const reduce = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }, [failures]);

  return (
    <div className="rf-card rf-sx" ref={rootRef}>
      {/* Step 2's own title elements, not a near-copy: .rf-eyebrow is 36px/600
          in the Duda primary, .rf-heading 36px/600 hardcoded black, both with
          Montserrat and the host-proofing specificity pinned in one place. The
          .rf-sx-* pair this replaces had drifted to 30px and --hb-secondary. */}
      <div className="rf-title">
        <p className="rf-eyebrow">You&rsquo;ve got your space!</p>
        <h2 className="rf-heading">Finish up below for access</h2>
      </div>

      {/* ID VERIFICATION — PARKED, not deleted (2026-08-21).

          Both buttons are inert and cannot be otherwise: the rental flow API
          has no verification endpoint anywhere in the guide. What it has is
          driver_license / _exp / _state as fields on the CONTACT, which the
          Driver's Licence group below now collects and files. So this card
          comes back only if an actual verification service is introduced.

          <section className="rf-sx-idv">
            <h3 className="rf-sx-idv-title">ID Verification</h3>
            <div className="rf-sx-idv-body">
              <IdIllustration />
              <div className="rf-sx-idv-actions">
                <button type="button" className="rf-sx-btn rf-sx-btn--solid">Verify ID Now</button>
                <button type="button" className="rf-sx-btn rf-sx-btn--outline">Verify In-Store</button>
              </div>
            </div>
            <p className="rf-sx-idv-note">
              Get ready to take a photo of your ID and a Selfie.{' '}
              <a href="#pop-ups" onClick={(e) => e.preventDefault()}>Click here to see how to enable pop-ups</a>{' '}
              if the link you received did not open the the ID Verification tool.
            </p>
          </section>
      */}

      {/* Mailing address first: it is the one most tenants will fill, and the
          licence group reads as a follow-up rather than a gate. */}
      <section className="rf-sx-extra">
        <h3 className="rf-sx-extra-title">Mailing Address</h3>
        <div className="rf-sx-fields">
          <AddressAutocomplete
            value={mailAddress}
            onChange={setMailAddress}
            onPick={(place) => {
              if (place.address.city) setMailCity(place.address.city);
              if (place.address.stateCode) setMailState(place.address.stateCode);
              if (place.address.zip) setMailZip(place.address.zip);
              setMailPicked(true);
            }}
          >
            <FormField label="Mailing Address" type="search" value={mailAddress} onChange={setMailAddress} autoComplete="street-address" state={mailAddress.trim() ? 'success' : 'default'} />
          </AddressAutocomplete>
          {/* City, state and ZIP appear once the lookup has filled them — or if
              anything is already in them. Nothing here is required, so unlike
              the billing panel there is no need to reveal them on submit: a
              shopper who types a street and stops has still given a usable
              address. */}
          {showMailParts && (
            <>
              <div className="rf-pay-grid">
                <FormField label="City" value={mailCity} onChange={setMailCity} autoComplete="address-level2" state={mailCity.trim() ? 'success' : 'default'} />
                <FormField label="State" value={mailState} onChange={(v) => setMailState(v.toUpperCase().slice(0, 2))} autoComplete="address-level1" state={mailState.trim().length === 2 ? 'success' : 'default'} />
              </div>
              <FormField label="ZIP Code" value={mailZip} onChange={setMailZip} autoComplete="postal-code" state={mailZip.trim().length >= 3 ? 'success' : 'default'} />
            </>
          )}
        </div>
      </section>

      {/* Standing in for the parked ID Verification card: the licence details
          the API actually stores, asked for plainly. */}
      <section className="rf-sx-extra">
        <h3 className="rf-sx-extra-title">Driver&rsquo;s Licence</h3>
        <div className="rf-sx-fields">
          <FormField label="Driver's Licence Number" value={dlNumber} onChange={setDlNumber} autoComplete="off" state={dlNumber.trim() ? 'success' : 'default'} />
          <div className="rf-pay-grid">
            {/* A picker, not a typed mask. An expiry is a date the shopper is
                reading off a card in front of them, and it is always in the
                FUTURE — so the calendar opens on today and browses forward,
                which is fewer taps than typing eight digits. */}
            <button type="button" className="rf2-movein rf2-movein--valid" onClick={() => setDlExpOpen(true)}>
              <span className="rf2-movein-text">
                <span className="rf2-movein-label">Expiry Date</span>
                <span className="rf2-movein-value">{dlExp || 'Select a date'}</span>
              </span>
              <CalendarIcon size={24} className="rf2-movein-cal" />
            </button>
            <FormField label="Issuing State" value={dlState} onChange={(v) => setDlState(v.toUpperCase().slice(0, 2))} state={dlState.trim().length === 2 ? 'success' : 'default'} />
          </div>
        </div>
      </section>

      <DateModal
        open={dlExpOpen}
        onClose={() => setDlExpOpen(false)}
        selected={dlExpDate}
        onSelect={(d) => setDlExpDate(d)}
        onConfirm={() => {
          if (dlExpDate) setDlExp(formatMasked(dlExpDate));
          setDlExpOpen(false);
        }}
        onReset={() => { setDlExpDate(null); setDlExp(''); setDlExpOpen(false); }}
        title="Licence Expiry Date"
        ctaLabel="Confirm"
        // Browse mode: an expiry can be years out, so month-and-year jumping
        // beats stepping. Nothing before today — a licence that has already
        // expired is not one to file.
        browse
        minDate={new Date()}
      />

      <section className="rf-sx-extra">
        <h3 className="rf-sx-extra-title">Additional Information</h3>

        {/* .rf2-checks is step 2's column — reused rather than matched by eye,
            so the 4px pitch between checkboxes cannot drift apart again. */}
        <div className="rf2-checks">
        <div className="rf-sx-group">
          <Checkbox checked={business} onChange={setBusiness}>I am renting as a business</Checkbox>
          {business && (
            <div className="rf-sx-fields">
              <AddressAutocomplete value={bizAddress} onChange={setBizAddress}>
                <FormField label="Business Address" required type="search" value={bizAddress} onChange={setBizAddress} error={bad('bizAddress')} />
              </AddressAutocomplete>
              <div className="rf-pay-grid">
                <FormField label="Business Rep First Name" required value={repFirst} onChange={setRepFirst} error={bad('repFirst')} />
                <FormField label="Business Rep Last Name" required value={repLast} onChange={setRepLast} error={bad('repLast')} />
              </div>
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Checkbox checked={military} onChange={setMilitary}>I am active military</Checkbox>
          {military && (
            <div className="rf-sx-fields">
              {/* Typed mask, not a picker: scrolling a calendar back decades to a
                  birth year is slower than typing it. */}
              <FormField label="Date of Birth" required mask="date" value={dob} onChange={setDob} error={bad('dob')} />
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Checkbox checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Checkbox>
          {altContact && (
            <div className="rf-sx-fields">
              <div className="rf-pay-grid">
                <FormField label="First Name" required value={altFirst} onChange={setAltFirst} error={bad('altFirst')} />
                <FormField label="Last Name" required value={altLast} onChange={setAltLast} error={bad('altLast')} />
                <FormField label="Phone" required type="tel" value={altPhone} onChange={setAltPhone} error={bad('altPhone')} />
                <FormField label="Email" required type="email" value={altEmail} onChange={setAltEmail} error={bad('altEmail')} />
              </div>
              {/* Same lookup as the Business Address above it — this one was
                  left as a plain field when the others were wired. */}
              <AddressAutocomplete value={altAddress} onChange={setAltAddress}>
                <FormField label="Address" required type="search" value={altAddress} onChange={setAltAddress} error={bad('altAddress')} />
              </AddressAutocomplete>
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Checkbox checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Checkbox>
          {vehicle && (
            <div className="rf-sx-fields">
              <Select
                label="Vehicle Type" required value={vType} onChange={setVType}
                options={['Car', 'Motorcycle', 'RV', 'Boat', 'Trailer']}
                error={bad('vType')}
              />
              <div className="rf-pay-grid">
                {/* Make/Model/Year/Colour/Plate are NOT required in the frame —
                    only Vehicle Type carries the asterisk. */}
                <FormField label="Make" value={make} onChange={setMake} />
                <FormField label="Model" value={model} onChange={setModel} />
                <FormField label="Year" value={year} onChange={setYear} />
                <FormField label="Color" value={colour} onChange={setColour} />
                <FormField label="License Plate Number" value={plate} onChange={setPlate} />
                <Select label="Country" value={country} onChange={setCountry} options={['United States', 'Canada']} />
              </div>
              <Select label="State" value={stateVal} onChange={setStateVal} options={['California', 'Arizona', 'Nevada', 'Texas']} />
            </div>
          )}
        </div>
        </div>
      </section>

      <button type="button" className="rf-sx-access" onClick={submit}>Get Access</button>
    </div>
  );
}
