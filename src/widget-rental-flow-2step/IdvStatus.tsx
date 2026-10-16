// ID verification status cards — one copy for both rental flows (Figma
// "Renter ID Verify": Default, Complete, ID Verification Failed, Verify ID Later).
// Each renders the card's contents; the caller owns the <section> around it.
import { TickSingleIcon, AlertTriangleIcon } from './planIcons';

export function IdvCardTitle({ id, required = false }: { id?: string; required?: boolean }) {
  return (
    <h3 id={id} className="rf-sx-idv-title">
      Renter Identity Verification{required && <span className="rf-idd-req" aria-hidden="true"> *</span>}
    </h3>
  );
}

export function IdvPopupNote() {
  return (
    <p className="rf-sx-idv-note">
      Get ready to take a photo of your ID and a Selfie.{' '}
      <a href="#pop-ups" onClick={(e) => e.preventDefault()}>Click here to see how to enable pop-ups</a>{' '}
      if the link you received did not open the ID Verification tool.
    </p>
  );
}

export function IdvCompleteTitle({ id }: { id?: string }) {
  return (
    <h3 id={id} className="rf-sx-idv-title rf-sx-idv-title--tick">
      <TickSingleIcon size={24} className="rf-sx-idv-tick" />
      ID Verification Complete
    </h3>
  );
}

/** Between the complete card and the scanned mailing address. */
export function IdvAddressNotice() {
  return <p className="rf-sx-idv-current">Please make sure the address captured from your license is your mailing address.</p>;
}

export function IdvFailedContent({ id, needsAssistance = false, remoteOperated = false, phone, onReverify }: {
  id?: string;
  /** The start's outcome is unknown: no reverify, contact the store. */
  needsAssistance?: boolean;
  remoteOperated?: boolean;
  phone?: string;
  onReverify: () => void;
}) {
  return (
    <>
      <h3 id={id} className="rf-sx-idv-title rf-sx-idv-title--tick">
        <AlertTriangleIcon size={24} className="rf-sx-idv-alert" />
        {needsAssistance ? 'Verification Needs Assistance' : 'ID Verification Failed'}
      </h3>
      <p className="rf-sx-idv-lede" role="status">
        {needsAssistance
          ? 'We could not confirm the verification request. It may already have started. Please contact the store before trying again.'
          : <>
            Your ID must be verified before getting access.{' '}
            {remoteOperated
              ? `Please reverify your ID or contact us to get access${phone ? ` ${phone}` : ''}.`
              : 'Please reverify or present your government issued ID to the manager at the time of moving-in.'}{' '}
            <button type="button" className="rf-sx-idv-inline" onClick={onReverify}>Reverify ID</button>
          </>}
      </p>
    </>
  );
}

/** Optional: verified in store. Required (not offered by either flow today) keeps the alert wording. */
export function IdvLaterContent({ id, required = false, onVerifyNow }: { id?: string; required?: boolean; onVerifyNow: () => void }) {
  return (
    <>
      <h3 id={id} className="rf-sx-idv-title rf-sx-idv-title--tick">
        <TickSingleIcon size={24} className="rf-sx-idv-tick" />
        Verify ID Later
      </h3>
      <p className="rf-sx-idv-lede" role="status">
        {required
          ? <><b className="rf-sx-idv-danger">ID Verification is required to get access to your space.</b> Please contact us to complete the verification.</>
          : 'Your ID will be verified in store.'}
        <br />
        Changed your mind?{' '}
        <button type="button" className="rf-sx-idv-inline" onClick={onVerifyNow}>Verify ID Now</button>
      </p>
    </>
  );
}
