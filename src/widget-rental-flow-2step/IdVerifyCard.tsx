import { IdIllustration } from './IdIllustration';

/**
 * The "choose how to verify" ID card — Figma 8624-80648.
 *
 * SHARED, because the one-step layout renders it inside the form (before
 * payment) while the post-purchase screen renders it after. In a one-step
 * rental a shopper can therefore meet this card TWICE in one journey, and two
 * copies of the markup would eventually disagree with each other.
 *
 * Still a DUMMY FLOW, exactly as the note on SuccessStep's copy says: the
 * rental-flow API exposes no verification endpoint, so neither button talks to
 * anything. It is built so the real service can be wired to the modal without
 * redesigning.
 */
export function IdVerifyCard({
  title, required = false, variant = 'success', onVerifyNow, onInStore,
}: {
  /** The heading. The two surfaces word it differently — the form states the
   *  requirement ("ID Validation required before accessing the property"),
   *  the post-purchase screen simply labels the section. */
  title: string;
  /**
   * Draw the red asterisk after the title.
   *
   * MARKS THE REQUIREMENT, DOES NOT ENFORCE IT. The frame prints it, and it is
   * true of the property — you cannot get through the gate unverified — but
   * nothing here can check it, so it must never gate the payment button. A
   * shopper blocked by a dummy flow could not rent at all.
   */
  required?: boolean;
  /**
   * Which arrangement the card takes.
   *
   * `success` is the post-purchase one, where the card has a wide column to
   * itself: illustration beside the buttons, buttons stacked. `form` is the
   * frame's: buttons side by side ABOVE the illustration, which is what fits
   * a 345px phone and what 8624-80648 draws. Only the arrangement differs —
   * same box, same type, same copy.
   */
  variant?: 'success' | 'form';
  onVerifyNow: () => void;
  onInStore: () => void;
}) {
  return (
    <section className={`rf-sx-idv${variant === 'form' ? ' rf-sx-idv--form' : ''}`}>
      <h3 className="rf-sx-idv-title">
        {title}{required && <> <span className="rf-req">*</span></>}
      </h3>
      <div className="rf-sx-idv-body">
        <IdIllustration />
        <div className="rf-sx-idv-actions">
          <button type="button" className="rf-sx-btn rf-sx-btn--solid" onClick={onVerifyNow}>
            Verify ID Now
          </button>
          <button type="button" className="rf-sx-btn rf-sx-btn--outline" onClick={onInStore}>
            Verify In-Store
          </button>
        </div>
      </div>
      <p className="rf-sx-idv-note">
        Get ready to take a photo of your ID and a Selfie.{' '}
        <a href="#pop-ups" onClick={(e) => e.preventDefault()}>Click here to see how to enable pop-ups</a>{' '}
        if the link you received did not open the the ID Verification tool.
      </p>
    </section>
  );
}
