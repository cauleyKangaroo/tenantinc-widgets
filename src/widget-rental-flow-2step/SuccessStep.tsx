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

import React, { useState } from 'react';
import { FormField } from '@shared/ui';
import { CheckTick } from './icons';
import { ChevronBig } from './planIcons';

import idHandCard from './assets/id-g72.svg';
import idCardFace from './assets/id-g105.svg';
import idPhoneA from './assets/id-g28.svg';
import idPhoneB from './assets/id-g27.svg';
import idScreen from './assets/id-rect.svg';
import idThumbA from './assets/id-p19.svg';
import idThumbB from './assets/id-p18.svg';
import idPortrait from './assets/id-portrait.png';

/** Reveal toggle — the design's dark-fill checkbox above each field group. */
function Toggle({
  checked, onChange, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="rf-sx-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`rf2-box${checked ? ' rf2-box--on' : ''}`}>{checked && <CheckTick size={16} />}</span>
      <span className="rf-sx-toggle-text">{children}</span>
    </label>
  );
}

function Select({
  label, value, onChange, options, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
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
        <FormField label={label} required={required} value={value} onChange={() => {}} />
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

export function SuccessStep({ onGetAccess }: { onGetAccess?: () => void }) {
  const [business, setBusiness] = useState(false);
  const [military, setMilitary] = useState(false);
  const [altContact, setAltContact] = useState(false);
  const [vehicle, setVehicle] = useState(false);

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

  return (
    <div className="rf-card rf-sx">
      <div className="rf-sx-head">
        <p className="rf-sx-eyebrow">You&rsquo;ve got your space!</p>
        <h2 className="rf-sx-heading">Finish up below for access</h2>
      </div>

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

      <section className="rf-sx-extra">
        <h3 className="rf-sx-extra-title">Additional Information</h3>

        <div className="rf-sx-group">
          <Toggle checked={business} onChange={setBusiness}>I am renting as a business</Toggle>
          {business && (
            <div className="rf-sx-fields">
              <FormField label="Business Address" required type="search" value={bizAddress} onChange={setBizAddress} />
              <div className="rf-pay-grid">
                <FormField label="Business Rep First Name" required value={repFirst} onChange={setRepFirst} />
                <FormField label="Business Rep Last Name" required value={repLast} onChange={setRepLast} />
              </div>
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Toggle checked={military} onChange={setMilitary}>I am active military</Toggle>
          {military && (
            <div className="rf-sx-fields">
              {/* Typed mask, not a picker: scrolling a calendar back decades to a
                  birth year is slower than typing it. */}
              <FormField label="Date of Birth" required mask="date" value={dob} onChange={setDob} />
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Toggle checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Toggle>
          {altContact && (
            <div className="rf-sx-fields">
              <div className="rf-pay-grid">
                <FormField label="First Name" required value={altFirst} onChange={setAltFirst} />
                <FormField label="Last Name" required value={altLast} onChange={setAltLast} />
                <FormField label="Phone" required type="tel" value={altPhone} onChange={setAltPhone} />
                <FormField label="Email" required type="email" value={altEmail} onChange={setAltEmail} />
              </div>
              <FormField label="Address" required type="search" value={altAddress} onChange={setAltAddress} />
            </div>
          )}
        </div>

        <div className="rf-sx-group">
          <Toggle checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Toggle>
          {vehicle && (
            <div className="rf-sx-fields">
              <Select
                label="Vehicle Type" required value={vType} onChange={setVType}
                options={['Car', 'Motorcycle', 'RV', 'Boat', 'Trailer']}
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
      </section>

      <button type="button" className="rf-sx-access" onClick={onGetAccess}>Get Access</button>
    </div>
  );
}
