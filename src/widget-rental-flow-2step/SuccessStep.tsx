// ===========================================================================
// "You've got your space! Finish up below for access" — the post-purchase screen.
// Figma: Mariposa — Duda, node 8507-25408.
//
// Additional Information, whose field groups are each revealed by their own
// checkbox. In the Figma frame every checkbox is ticked so all groups show at
// once; here they start from what the shopper chose on step 2, because that is
// what the checkbox is for — showing 20 fields to someone storing nothing but
// boxes would be a worse screen than the design.
//
// Fields are `@shared/ui` FormField — the frame is built from the same
// "Mariposa Form 2.0" component the kit was traced from.
//
// The frame's ID VERIFICATION card was removed on request (2026-08-21). It had
// nothing behind it: the rental API has no verification endpoint, only
// driver_license fields on the contact, so "Verify ID Now" could never have
// done anything. Its line-art illustration went with it — eight inlined assets
// that cost real bundle weight for a card nobody can use. Both are one revert
// away in git if it comes back.
//
// STATIC, as briefed: nothing on this screen is submitted.
// ===========================================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { Checkbox, FormField, isPossiblePhone } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import { ChevronBig } from './planIcons';


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


export function SuccessStep({ onGetAccess, chosen }: {
  onGetAccess?: () => void;
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
    onGetAccess?.();
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
