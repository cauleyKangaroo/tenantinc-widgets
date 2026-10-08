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
// IDV is connected when an IdvController is supplied. The editor keeps a
// deterministic presentation preview so every Figma outcome remains reviewable
// without creating a hosted verification session.
// ===========================================================================

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Checkbox, FormField } from '@shared/ui';
import { AddressAutocomplete } from '@shared/AddressAutocomplete';
import { CUSTOMER_ADDRESS_COUNTRIES } from '@shared/placesApi';
import {
  TickSingleIcon, AlertTriangleIcon, ClockGlyph, PhoneGlyph,
} from './planIcons';
import { IdIllustration } from './IdIllustration';
import { IdVerifyModal } from './IdVerifyModal';
import {
  MilitaryFields, AltContactFields, VehicleFields,
  extraFieldProblems, EMPTY_EXTRA_FIELDS, type ExtraFieldValues,
} from './additionalInfo';
import { skipValidation } from '@shared/devBypass';
import { RENTAL_IDV_REQUIREMENT, type IdvRequirement } from './idvPolicy';
import { resolveIdvPresentation, type IdvPresentationOutcome } from './idvPresentation';
import type { useIdvController } from './useIdvController';

/** API dates are YYYY-MM-DD; the form's masked field is MM/DD/YYYY. */
function isoToMasked(value: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value ?? '';
}

/** What this screen can actually file against the contact after the lease. */
/**
 * DUMMY — what the ID verification app hands back once a scan succeeds. Values
 * from Figma 8754-49724. It carries more than the widget's own fields do (a
 * full state name, a written-out date), which is why the read-only summaries
 * render THIS rather than re-deriving from the inputs: those hold the two-letter
 * code and MM/DD/YYYY the record actually stores.
 *
 * Replace with the app's real response; nothing else here has to change.
 */
const IDV_SOURCE = {
  mailing: {
    line: '4920 Campus Drive Suite B, Newport Beach, CA 92660',
    address: '4920 Campus Drive Suite B',
    city: 'Newport Beach',
    state: 'CA',
    zip: '92660',
  },
  licence: {
    number: 'DL7833839393',
    state: 'CA',
    stateLabel: 'California',
    exp: '09/20/2035',
    expLabel: 'Sep 20, 2035',
  },
};

export interface SuccessDetails {
  driverLicense?: string;
  /** As typed, MM/DD/YYYY — the parent converts. */
  driverLicenseExp?: string;
  driverLicenseState?: string;
  mailingAddress?: { address: string; city?: string; state?: string; zip?: string };
  /** Did the shopper actually get through ID verification? Only a `complete`
   *  result counts — ignoring the card, choosing the counter, failing, or
   *  deferring all leave them without a verified ID, and so without a code. */
  idVerified: boolean;
  /**
   * The Additional Information answers, as typed.
   *
   * This screen MAKES THEM REQUIRED — `extraFieldProblems` blocks Get Access
   * until the opted-in sections are complete — and used to send none of them,
   * so a shopper was stopped by a date of birth and five alternate-contact
   * fields that were then dropped. Handing them to the parent is the minimum
   * honest thing; what it can file is its business.
   *
   * Only `dateOfBirth` has a documented destination today (the contact update
   * takes `dob`). The alternate contact and vehicle have none, which is a
   * question for TenantInc rather than something to invent a field name for.
   */
  extras?: ExtraFieldValues;
}

export function SuccessStep({
  onGetAccess,
  chosen,
  verificationPhone,
  idvRequirement = RENTAL_IDV_REQUIREMENT,
  idvPreview = false,
  idvServiceConnected = false,
  idvController,
  facility,
  remoteOperated = false,
  oneStep = false,
  handheld = false,
}: {
  /** Fires with everything the contact update can file. The parent decides
   *  what to do with it; this screen just collects. */
  onGetAccess?: (details?: SuccessDetails) => void;
  /** What the shopper ticked back in step 2. Those screens ask the QUESTION;
   *  this one asks for the details, so it opens the same sections already
   *  ticked rather than making them answer twice. */
  chosen?: { business?: boolean; military?: boolean; altContact?: boolean; vehicle?: boolean };
  /** The only renter identity field this presentational view needs. */
  verificationPhone?: string;
  idvRequirement?: IdvRequirement;
  /** Editor/harness-only presentation preview; never set on a live page. */
  idvPreview?: boolean;
  idvServiceConnected?: boolean;
  idvController?: ReturnType<typeof useIdvController>;
  facility?: { address?: string; phone?: string; officeHours?: string[] };
  /** Presentation policy supplied by trusted property configuration once that
   * source exists. It changes failure copy, never whether IDV is required. */
  remoteOperated?: boolean;
  /** One-step checkout: Additional Information was answered before payment,
   *  so this screen asks only for ID verification and its details. */
  oneStep?: boolean;
  /** Phone-shaped: capture runs here, so no hand-off modal. */
  handheld?: boolean;
}) {
  const facilityPhoneHref = (() => {
    const raw = facility?.phone?.trim();
    // Reject free text and extensions rather than manufacturing a plausible-
    // looking but incorrect dial target from arbitrary property content.
    if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return undefined;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return undefined;
    return `tel:${raw.startsWith('+') ? '+' : ''}${digits}`;
  })();
  // Initialisers, not synced props: the boxes stay the shopper's to change here.
  // Off on one-step so the hidden sections' required fields cannot block Get Access.
  const [business, setBusiness] = useState(!oneStep && (chosen?.business ?? false));
  const [military, setMilitary] = useState(!oneStep && (chosen?.military ?? false));
  const [altContact, setAltContact] = useState(!oneStep && (chosen?.altContact ?? false));
  const [vehicle, setVehicle] = useState(!oneStep && (chosen?.vehicle ?? false));

  // Mailing address — where notices go when it is not the space's address.
  // Filed on the contact as an Addresses entry of type "mailing" (verified
  // 2026-08-21: it persists).
  /**
   * ID verification presentation. Remote complete/failed results come from the
   * controller; in-store/later are shopper choices local to this post-rental
   * screen because the IDV API has no endpoint for recording either choice.
   *
   *   choose    the card with the illustration and the two buttons
   *   instore   "Verify ID In-Store" — hours, address, phone, and a way back
   *   complete / failed / later   the three results the service can return
   *
   * The detail sections below are shown only in `instore`, per the brief. Their
   * VALUES live in this component either way, so switching back and forth keeps
   * everything already typed — unmounting the markup does not touch the state.
   */
  const [idv, setIdv] = useState<IdvPresentationOutcome>('choose');
  const [localIdvChoice, setLocalIdvChoice] = useState<'instore' | 'later' | undefined>();
  const [idvModal, setIdvModal] = useState(false);
  /* A completed scan arrives pre-filled and collapsed to a summary; "Edit" is
     how the tenant overrides what the scan read off the card. One flag each,
     because the two boxes are independent in the frame. */
  const [mailEditing, setMailEditing] = useState(false);
  const [mailFromScan, setMailFromScan] = useState(false);
  const [dlEditing, setDlEditing] = useState(false);
  /* The two detail groups belong to every state once a choice is made:
     complete (the scan supplies them, and they can be overridden), and
     in-store, later and failed, where nothing was captured so the renter types
     them. Only `choose` hides them — nothing has been decided yet. */
  // Off, the two groups are simply always on the page — there is no branch
  // left to decide otherwise.
  const remoteKind = idvController?.state.kind;
  const startUncertain = idvServiceConnected && idvController?.state.kind === 'error'
    && !idvController.state.retryable;
  const serviceIdv: IdvPresentationOutcome = idvServiceConnected
    ? remoteKind === 'complete'
      ? 'complete'
      : remoteKind === 'failed' || remoteKind === 'expired' || remoteKind === 'error'
        ? 'failed'
        : 'choose'
    : idv;
  const displayedIdv: IdvPresentationOutcome = localIdvChoice ?? serviceIdv;
  const idvDecision = resolveIdvPresentation(idvRequirement, displayedIdv, {
    serviceConnected: idvServiceConnected,
    preview: idvPreview === true,
  });
  const idvEnabled = idvDecision.enabled;
  const detailsShown = idvDecision.detailsShown;
  // Read-only only when the scan SUPPLIED the address. A connected scan returns
  // licence details but no address; locking an empty field would leave Get
  // Access failing its required-address check with nothing to fill in.
  const mailReadOnly = displayedIdv === 'complete' && mailFromScan && !mailEditing;
  const dlReadOnly = displayedIdv === 'complete' && !dlEditing;

  /* Pending: a session already exists, so reopen it rather than start a new
     one (no second text). The desktop modal carries the QR and Resend Text; a
     phone reopens the same capture page in a separate tab. */
  const continueVerification = () => {
    if (handheld) { idvController?.continueInNewTab(); return; }
    setIdvModal(true);
  };

  const beginVerification = () => {
    if (idvServiceConnected && remoteKind !== 'ready') return;
    if (!handheld || !idvServiceConnected) setIdvModal(true);
    if (idvServiceConnected) void idvController?.start();
  };

  const verifyNow = () => {
    if (idvServiceConnected && remoteKind === 'pending') continueVerification();
    else beginVerification();
  };

  useEffect(() => {
    if (!idvServiceConnected) return;
    if (remoteKind === 'complete' || remoteKind === 'failed' || remoteKind === 'expired' || remoteKind === 'error') {
      setIdvModal(false);
    }
    // A verified service result is authoritative even if the shopper selected
    // the in-store/later presentation while the lookup or poll was pending.
    if (remoteKind === 'complete') setLocalIdvChoice(undefined);
  }, [idvServiceConnected, remoteKind]);

  const [mailAddress, setMailAddress] = useState('');
  const [mailCity, setMailCity] = useState('');
  const [mailState, setMailState] = useState('');
  const [mailZip, setMailZip] = useState('');

  // Driver's licence. THESE are what "ID verification" means to this API —
  // there is no verification service, only these three fields on the contact,
  // and all three persist.
  const [dlNumber, setDlNumber] = useState('');
  const [dlExp, setDlExp] = useState('');
  const [dlState, setDlState] = useState('');
  const [usePassport, setUsePassport] = useState(false);
  const passportAvailable = idvEnabled && idvServiceConnected
    && remoteKind === 'complete' && displayedIdv === 'complete';
  const passportSelected = passportAvailable && usePassport;

  /** A picked or typed mailing address — the city/state/ZIP follow it. */
  const [mailPicked, setMailPicked] = useState(false);
  const [attemptedReveal, setAttemptedReveal] = useState(false);
  /* Revealed by the lookup, by content already in them, or by a failed submit.
     That last one matters now they are REQUIRED: an address typed straight into
     the box without choosing a suggestion leaves `mailPicked` false, so without
     it the three fields would be demanded while still hidden. */
  const showMailParts = mailPicked
    || !!(mailCity.trim() || mailState.trim() || mailZip.trim())
    || (attemptedReveal && !!mailAddress.trim());

  // Business
  const [bizAddress, setBizAddress] = useState('');
  const [repFirst, setRepFirst] = useState('');
  const [repLast, setRepLast] = useState('');
  /* Military, alternate contact and vehicle — one object in the shared shape.
     The same three groups now also render on the rental form when it is set to
     1step, so the fields and their rules live in ./additionalInfo and both
     screens import them rather than keeping two copies that drift. */
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>(EMPTY_EXTRA_FIELDS);
  const setExtra = (patch: Partial<ExtraFieldValues>) => setExtraFields((v) => ({ ...v, ...patch }));

  /**
   * Required fields, and only for the sections actually switched on — an
   * unticked section is not an incomplete one. Messages appear on the first
   * attempt to continue, not while typing: flagging a field the shopper has not
   * reached yet is noise, and this form can be twenty inputs long.
   */
  const [attempted, setAttempted] = useState(false);
  const filled = (v: string) => v.trim().length > 0;
  const problems: Record<string, string> = {
    // Only while the detail groups are mounted — a required field that is not
    // on screen produces a message nobody can act on.
    ...(detailsShown ? {
      mailAddress: filled(mailAddress) ? '' : 'Enter your mailing address',
      // Keyed off the ADDRESS, not off whether the three are on screen. Keying
      // it off visibility would read the pre-click render, where the reveal has
      // not happened yet, and let the first submit through.
      ...(filled(mailAddress) ? {
        mailCity: filled(mailCity) ? '' : 'Enter the city',
        mailState: mailState.trim().length === 2 ? '' : 'Enter the two-letter state',
        mailZip: mailZip.trim().length >= 5 ? '' : 'Enter a valid ZIP code',
      } : {}),
      /* The three Driver's Licence fields are OPTIONAL and deliberately absent
         from this map. Dropping their asterisks without dropping these would
         have left the submit blocked by fields no longer marked as needed —
         a dead button with nothing on screen explaining it. They are still
         sent when filled; see the payload below. */
    } : {}),
    ...(business ? {
      bizAddress: filled(bizAddress) ? '' : 'Enter the business address',
      repFirst: filled(repFirst) ? '' : 'Enter the business rep’s first name',
      repLast: filled(repLast) ? '' : 'Enter the business rep’s last name',
    } : {}),
    /* The three optional groups' rules, from the same module that renders
       them — so a field this screen marks required cannot disagree with the
       rental form's copy of the same field. */
    ...extraFieldProblems({ military, altContact, vehicle }, extraFields),
  };
  /* Harness bypass — compiled out of production builds, see @shared/devBypass. */
  const skip = skipValidation();
  const bad = (k: string) => (!skip && attempted && problems[k] ? problems[k] : undefined);

  /**
   * Bumped on every FAILED attempt, not just the first, so pressing Get Access
   * again after fixing one field still takes you to the next one. A boolean
   * would only ever fire once.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const [failures, setFailures] = useState(0);

  /* Seed the fields from the scan whenever one completes. It OVERWRITES on
     purpose: the whole point of verification is that the card is the source of
     truth, and "Edit" is the documented way to disagree with it. Keyed on `idv`
     alone, so editing afterwards does not re-run it. */
  useEffect(() => {
    if (displayedIdv !== 'complete') return;
    setUsePassport(false);
    if (idvServiceConnected) {
      const licence = idvController?.state.kind === 'complete'
        ? idvController.state.result.driversLicense
        : undefined;
      setDlNumber(licence?.number ?? '');
      setDlState(licence?.state ?? '');
      setDlExp(isoToMasked(licence?.expiration));
      setMailFromScan(false);
    } else {
      setMailAddress(IDV_SOURCE.mailing.address);
      setMailCity(IDV_SOURCE.mailing.city);
      setMailState(IDV_SOURCE.mailing.state);
      setMailZip(IDV_SOURCE.mailing.zip);
      setMailPicked(true);
      setMailFromScan(true);
      setDlNumber(IDV_SOURCE.licence.number);
      setDlState(IDV_SOURCE.licence.state);
      setDlExp(IDV_SOURCE.licence.exp);
    }
    setMailEditing(false);
    setDlEditing(false);
  }, [displayedIdv, idvController?.state, idvServiceConnected]);
  const submit = () => {
    setAttempted(true);
    setAttemptedReveal(true);
    /* The bypass belongs here too — `bad()` above only hides the messages,
       this is what actually refuses. See @shared/devBypass. */
    if (!skip && Object.values(problems).some(Boolean)) { setFailures((n) => n + 1); return; }
    // Only what was filled — the update must not blank a value the tenant may
    // have given at the counter.
    onGetAccess?.({
      // Off, nothing is being verified, so nothing may be withheld for it —
      // the confirmation page must not claim verification is required.
      idVerified: idvDecision.idVerified,
      driverLicense: passportSelected ? undefined : dlNumber.trim() || undefined,
      driverLicenseExp: passportSelected ? undefined : dlExp.trim() || undefined,
      driverLicenseState: passportSelected ? undefined : dlState.trim() || undefined,
      mailingAddress: mailAddress.trim()
        ? {
          address: mailAddress.trim(),
          city: mailCity.trim() || undefined,
          state: mailState.trim() || undefined,
          zip: mailZip.trim() || undefined,
        }
        : undefined,
      // Required on this screen, so they travel with it - see SuccessDetails.
      extras: extraFields,
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

      {/* ID VERIFICATION. The connected controller owns lookup/start/poll;
          local state owns the designed in-store/later alternatives. */}
      {idvEnabled && displayedIdv === 'choose' && (
        <section className="rf-sx-idv">
          <h3 className="rf-sx-idv-title">ID Verification</h3>
          <div className="rf-sx-idv-body">
            <IdIllustration />
            <div className="rf-sx-idv-actions">
              <button
                type="button"
                className="rf-sx-btn rf-sx-btn--solid"
                onClick={verifyNow}
                disabled={idvServiceConnected && remoteKind !== 'ready' && remoteKind !== 'pending'}
              >
                {idvServiceConnected && remoteKind === 'pending'
                  ? 'Continue Verification'
                  : idvServiceConnected && (remoteKind === 'checking' || remoteKind === 'starting')
                    ? 'Verification in progress'
                    : 'Verify ID Now'}
              </button>
              {idvRequirement === 'optional' && (
                <button type="button" className="rf-sx-btn rf-sx-btn--outline" onClick={() => setLocalIdvChoice('later')}>
                  Verify ID Later
                </button>
              )}
            </div>
          </div>
          {handheld && remoteKind === 'pending' && idvController?.popupBlocked && (
            <p className="rf-sx-idv-note" role="status">
              The verification tab could not be opened.{' '}
              <a href={idvController.verificationUrl} target="_blank" rel="noopener noreferrer"
                onClick={(event) => {
                  if (idvController.state.kind !== 'pending' || Date.now() >= idvController.state.expiresAt * 1_000) event.preventDefault();
                }}>
                Open verification in a new tab
              </a>. This page will stay open.
            </p>
          )}
          <p className="rf-sx-idv-note">
            Get ready to take a photo of your ID and a Selfie.{' '}
            <a href="#pop-ups" onClick={(e) => e.preventDefault()}>Click here to see how to enable pop-ups</a>{' '}
            if the link you received did not open the the ID Verification tool.
          </p>
        </section>
      )}

      {/* Figma 10080-26478. Two columns: what to bring and where to bring it on
          the left, the way back on the right.

          The hours and the phone number are the FRAME'S placeholders, not this
          property's — SuccessStep is not passed the property, and the record
          separates access hours from office hours, so picking one here would be
          a guess. Thread the real pair in when the verification work lands. */}
      {idvEnabled && displayedIdv === 'instore' && (
        <section className="rf-sx-idv rf-sx-idv--instore">
          <div className="rf-sx-idv-instore-main">
            <h3 className="rf-sx-idv-title rf-sx-idv-title--tick">
              <TickSingleIcon size={24} className="rf-sx-idv-tick" />
              Verify ID In-Store
            </h3>
            <p className="rf-sx-idv-lede">Bring in your ID upon move-in or call the store to get access.</p>
            <div className="rf-sx-idv-row">
              <ClockGlyph size={24} className="rf-sx-idv-ico" />
              <div>
                <p className="rf-sx-idv-strong">Office Hours</p>
                {(facility?.officeHours?.length ? facility.officeHours : ['Hours unavailable — call the store']).map((line) => (
                  <p className="rf-sx-idv-line" key={line}>{line}</p>
                ))}
              </div>
            </div>
            {facility?.address && <p className="rf-sx-idv-line rf-sx-idv-address">{facility.address}</p>}
            <div className="rf-sx-idv-row rf-sx-idv-row--mid">
              <PhoneGlyph size={24} className="rf-sx-idv-ico" />
              {facilityPhoneHref && facility?.phone
                ? <a className="rf-sx-idv-link" href={facilityPhoneHref}>{facility.phone}</a>
                : <span className="rf-sx-idv-line">Phone unavailable</span>}
            </div>
          </div>
          <div className="rf-sx-idv-instore-aside">
            <p className="rf-sx-idv-strong">Changed your mind?</p>
            {/* Two-line label (Figma 11940-47763, whose text is the sibling
                11940-47764 drawn over it): a regular lede above the bold
                action. Both lines are the button's own content, not a caption
                beside it — the green CTA is 286x49 and the text box sits
                inside it. */}
            <button
              type="button"
              className="rf-sx-btn rf-sx-btn--solid rf-sx-btn--stack"
              onClick={() => { setLocalIdvChoice(undefined); setIdv('choose'); verifyNow(); }}
            >
              <span className="rf-sx-btn-lede">Save time and skip the office!</span>
              <span className="rf-sx-btn-main">Verify ID Now</span>
            </button>
          </div>
        </section>
      )}

      {/* The three results a verification can end in (Figma 8507-24189 /
          8507-24120 / 8507-24130). Reachable from the modal today so the flow
          can be walked through; the real service sets `idv` instead. */}
      {idvEnabled && displayedIdv === 'complete' && (
        <section className="rf-sx-idv rf-sx-idv--done">
          <h3 className="rf-sx-idv-title rf-sx-idv-title--tick">
            <TickSingleIcon size={24} className="rf-sx-idv-tick" />
            ID Verification Complete
          </h3>
        </section>
      )}

      {idvEnabled && displayedIdv === 'failed' && (
        <section className="rf-sx-idv rf-sx-idv--alert">
          <h3 className="rf-sx-idv-title rf-sx-idv-title--tick">
            <AlertTriangleIcon size={24} className="rf-sx-idv-alert" />
            {startUncertain ? 'Verification Needs Assistance' : 'ID Verification Failed'}
          </h3>
          <p className="rf-sx-idv-lede">
            {startUncertain ? 'We could not confirm the verification request. It may already have started. Please contact the store before trying again.' : <>Your ID must be verified before getting access.{remoteOperated
              ? ' This remotely operated property cannot verify your ID in store.'
              : ` Please reverify your ID or contact the store${facilityPhoneHref && facility?.phone ? ` at ${facility.phone}` : ''} to get access.`}{' '}
            <button
              type="button"
              className="rf-sx-idv-inline"
              onClick={() => {
                setLocalIdvChoice(undefined);
                if (idvServiceConnected) idvController?.retry();
                else { setIdv('choose'); setIdvModal(true); }
              }}
            >
              Reverify ID
            </button>
            </>}
          </p>
        </section>
      )}

      {idvEnabled && displayedIdv === 'later' && (
        <section className="rf-sx-idv rf-sx-idv--alert">
          <h3 className="rf-sx-idv-title rf-sx-idv-title--tick">
            <AlertTriangleIcon size={24} className="rf-sx-idv-alert" />
            Verify ID Later
          </h3>
          <p className="rf-sx-idv-lede">
            <b className="rf-sx-idv-danger">ID Verification is required to get access to your space.</b>{' '}
            Please contact us to complete the verification.<br />
            Changed your mind?{' '}
            <button
              type="button"
              className="rf-sx-idv-inline"
              onClick={() => { setLocalIdvChoice(undefined); setIdv('choose'); verifyNow(); }}
            >
              Verify ID Now
            </button>
          </p>
        </section>
      )}


      {/* Mailing address and licence, in whichever form the current state calls
          for. Additional Information is NOT in here: Figma 8507-25408 has it on
          the page from the start.

          UNMOUNTED, not hidden — but every value they edit is state on this
          component, so switching back and forth keeps whatever was typed. */}
      {detailsShown && (
        <>
        {idvEnabled && displayedIdv === 'complete' && (
          <p className="rf-sx-idv-current">
            For the purpose of important notifications, please make sure the address captured from
            your license is current.
          </p>
        )}

        {/* Mailing address first: it is the one most tenants will fill, and the
            licence group reads as a follow-up rather than a gate. */}
        <section className="rf-sx-extra">
          <h3 className="rf-sx-extra-title">Mailing Address</h3>
          {mailReadOnly ? (
            <div className="rf-sx-readout">
              <p className="rf-sx-readout-val">
                {idvServiceConnected
                  ? [mailAddress, mailCity, mailState, mailZip].filter(Boolean).join(', ')
                  : IDV_SOURCE.mailing.line}
              </p>
              <button type="button" className="rf-sx-edit" onClick={() => setMailEditing(true)}>Edit</button>
            </div>
          ) : (
          <div className="rf-sx-fields">
            <AddressAutocomplete
              country={CUSTOMER_ADDRESS_COUNTRIES}
              value={mailAddress}
              onChange={setMailAddress}
              onPick={(place) => {
                if (place.address.city) setMailCity(place.address.city);
                if (place.address.stateCode) setMailState(place.address.stateCode);
                if (place.address.zip) setMailZip(place.address.zip);
                setMailPicked(true);
              }}
            >
              <FormField label="Mailing Address" required type="search" value={mailAddress} onChange={setMailAddress} autoComplete="street-address" state={mailAddress.trim() ? 'success' : 'default'} error={bad('mailAddress')} />
            </AddressAutocomplete>
            {/* City, state and ZIP appear once the lookup has filled them, if
                anything is already in them, or on a failed submit. They are
                required as soon as there IS an address — a street on its own is
                not one the counter can post to. */}
            {showMailParts && (
              <>
                {/* One row of three, sharing .rf-sx-grid3 with the licence
                    row above — ZIP used to sit on a line of its own under a
                    50/50 City/State pair. Collapses to one column at the same
                    widths that row does. */}
                <div className="rf-sx-grid3">
                  <FormField label="City" required value={mailCity} onChange={setMailCity} autoComplete="address-level2" state={mailCity.trim() ? 'success' : 'default'} error={bad('mailCity')} />
                  <FormField label="State" required value={mailState} onChange={(v) => setMailState(v.toUpperCase().slice(0, 2))} autoComplete="address-level1" state={mailState.trim().length === 2 ? 'success' : 'default'} error={bad('mailState')} />
                  <FormField label="ZIP Code" required value={mailZip} onChange={setMailZip} autoComplete="postal-code" state={mailZip.trim().length >= 5 ? 'success' : 'default'} error={bad('mailZip')} />
                </div>
              </>
            )}
          </div>
          )}
        </section>

        {/* Figma 10078-25737 — three equal columns, all three required. */}
        <section className="rf-sx-extra">
          <div className="rf-sx-extra-head">
            <h3 className="rf-sx-extra-title">{passportSelected ? 'Passport' : 'Driver\u2019s Licence'}</h3>
            {passportAvailable && !dlReadOnly && (
              <Checkbox checked={usePassport} onChange={setUsePassport}>Use passport for ID</Checkbox>
            )}
          </div>
          {dlReadOnly ? (
            <div className="rf-sx-readout">
              {/* Three lines, as the frame has them — and the app's own wording:
                  the full state name and a written-out date, neither of which the
                  two inputs behind this hold. */}
              <p className="rf-sx-readout-val">
                {idvServiceConnected ? (
                  <>
                    {dlNumber || 'Not returned'}<br />
                    {dlState || 'State not returned'}<br />
                    {dlExp ? `EXP ${dlExp}` : 'Expiration not returned'}
                  </>
                ) : (
                  <>
                    {IDV_SOURCE.licence.number}<br />
                    {IDV_SOURCE.licence.stateLabel}<br />
                    {IDV_SOURCE.licence.expLabel}
                  </>
                )}
              </p>
              <button type="button" className="rf-sx-edit" onClick={() => setDlEditing(true)}>Edit</button>
            </div>
          ) : passportSelected ? (
            <p className="rf-sx-idv-lede rf-sx-passport-note">
              Passport capture is handled by the hosted ID verification tool. This page does not confirm which document was used and does not collect passport details.
            </p>
          ) : (
          <div className="rf-sx-fields">
            <div className="rf-sx-grid3">
              <FormField
                label="License Number"
                value={dlNumber}
                onChange={setDlNumber}
                autoComplete="off"
                state={dlNumber.trim() ? 'success' : 'default'}
              />
              {/* A text box, not the frame's dropdown: the record stores a
                  two-letter code, and no canonical state+province list exists
                  in the widget to populate a <Select> with. */}
              <FormField
                label="State/Province"
                value={dlState}
                onChange={(v) => setDlState(v.toUpperCase().slice(0, 2))}
                state={dlState.trim().length === 2 ? 'success' : 'default'}
              />
              {/* Typed, not a picker. An expiry is read straight off the card in
                  the shopper's hand — eight digits is quicker than browsing to a
                  date they can already see, and it is the same control the Date
                  of Birth field above uses. The kit's mask rests as the label
                  and reveals MM/DD/YYYY on focus. */}
              <FormField
                label="Expiration Date"
                mask="date"
                value={dlExp}
                onChange={setDlExp}
                autoComplete="off"
                state={dlExp.length === 10 ? 'success' : 'default'}
              />
            </div>
          </div>
          )}
        </section>
        </>
      )}

      {!oneStep && (
      <section className="rf-sx-extra">
        <h3 className="rf-sx-extra-title">Additional Information</h3>

        {/* .rf2-checks is step 2's column — reused rather than matched by eye,
            so the 4px pitch between checkboxes cannot drift apart again. */}
        <div className="rf2-checks">
        {/* Business is the one section that does NOT reappear here unasked.
            `chosen.business` is what step 2 was told, and if the answer was no
            then it has been answered — re-offering it invites a shopper to
            reclassify their rental after the lease is signed, which the other
            three sections cannot do. Ticked in step 2, the row is here so the
            rep's details can be filled in. */}
        {chosen?.business && (
        <div className="rf-sx-group">
          <Checkbox checked={business} onChange={setBusiness}>I am renting as a business</Checkbox>
          {business && (
            <div className="rf-sx-fields">
              <AddressAutocomplete country={CUSTOMER_ADDRESS_COUNTRIES} value={bizAddress} onChange={setBizAddress}>
                <FormField label="Business Address" required type="search" value={bizAddress} onChange={setBizAddress} error={bad('bizAddress')} />
              </AddressAutocomplete>
              <div className="rf-pay-grid">
                <FormField label="Business Rep First Name" required value={repFirst} onChange={setRepFirst} error={bad('repFirst')} />
                <FormField label="Business Rep Last Name" required value={repLast} onChange={setRepLast} error={bad('repLast')} />
              </div>
            </div>
          )}
        </div>
        )}

        <div className="rf-sx-group">
          <Checkbox checked={military} onChange={setMilitary}>I am active military</Checkbox>
          {military && <MilitaryFields v={extraFields} set={setExtra} bad={bad} />}
        </div>

        <div className="rf-sx-group">
          <Checkbox checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Checkbox>
          {altContact && <AltContactFields v={extraFields} set={setExtra} bad={bad} />}
        </div>

        <div className="rf-sx-group">
          <Checkbox checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Checkbox>
          {vehicle && <VehicleFields v={extraFields} set={setExtra} bad={bad} />}
        </div>
        </div>
      </section>
      )}

      <button type="button" className="rf-sx-access" onClick={submit}>Get Access</button>

      {idvEnabled && (
      <IdVerifyModal
        open={idvModal}
        onClose={() => setIdvModal(false)}
        onResult={(result) => { setLocalIdvChoice(result === 'later' ? 'later' : undefined); setIdv(result); }}
        phone={verificationPhone}
        connected={idvServiceConnected}
        lifecycle={remoteKind}
        notificationStatus={idvController?.state.kind === 'pending' ? idvController.state.notificationStatus : undefined}
        onResend={idvController?.resend}
        resendUncertain={idvController?.state.kind === 'pending' && idvController.state.resendUncertain === true}
        verificationUrl={idvController?.verificationUrl}
      />
      )}
    </div>
  );
}
