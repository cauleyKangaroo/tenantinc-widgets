// ===========================================================================
// "Verify ID Now" — Figma node 8509-35693.
//
// DUMMY. There is no identity-verification service wired up: nothing here
// sends a text, and "Resend Text" does not resend one. The modal exists so the
// flow can be walked end to end, and so whoever connects the real service has
// the finished screen and the three outcomes to hang it on.
//
// `onResult` is the seam. The three buttons at the foot are NOT in the Figma —
// they are a scaffold, clearly labelled as such on screen, standing in for the
// callback the verification app will fire. Delete that block, call `onResult`
// from the real response, and everything else here is final.
//
// Same overlay shell as MoveInDateModal and ProtectionPlanModal: Escape, click
// outside, scroll lock, portalled to <body>.
// ===========================================================================

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseCircleIcon, FormField, isPossiblePhone } from '@shared/ui';
import { IdCardIcon } from './planIcons';
import { IdIllustration } from './IdIllustration';

export type IdVerifyResult = 'complete' | 'failed' | 'later';

export function IdVerifyModal({
  open,
  onClose,
  onResult,
  phone = '',
}: {
  open: boolean;
  onClose: () => void;
  /** Fired with the outcome the verification app reported. */
  onResult: (result: IdVerifyResult) => void;
  /** The number the text went to — the contact's, pre-filled and editable. */
  phone?: string;
}) {
  const [num, setNum] = useState(phone);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Re-open should start clean, and pick up a number that arrived after mount.
  useEffect(() => { if (open) { setNum(phone); setSent(false); } }, [open, phone]);

  if (!open) return null;

  const valid = isPossiblePhone(num, 'US');

  const overlay = (
    <div className="rf-overlay" onClick={onClose} role="presentation">
      <div
        className="rf-modal rf-idm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rf-idm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rf-modal-head">
          <h2 className="rf-modal-title rf-idm-title" id="rf-idm-title">
            <IdCardIcon size={24} />
            Verify ID Now
          </h2>
          {/* The kit's mark at the size #03's "Send us a Message" modal uses:
              18 in a 32px button. Same glyph, same box, so the two modals close
              the same way. */}
          <button type="button" className="rf-modal-close" onClick={onClose} aria-label="Close">
            {/* Filled disc: .rf-modal is #fff. */}
            <CloseCircleIcon size={18} />
          </button>
        </div>

        <div className="rf-idm-body">
          <div className="rf-idm-top">
            <div className="rf-idm-copy">
              <p className="rf-idm-lede">Session continues on your phone.</p>
              <p className="rf-idm-para">
                For your safety and convenience we&rsquo;re verifying your identity.{' '}
                <b>We will send you a text message with a link to our verification page to your phone.</b>
              </p>
            </div>
            <IdIllustration className="rf-idm-illus" />
          </div>

          <p className="rf-idm-para">
            Just in case you did <b>NOT</b> get the Text message.
          </p>

          <div className="rf-idm-resend">
            <FormField
              label="Phone"
              required
              type="tel"
              value={num}
              onChange={(v) => { setNum(v); setSent(false); }}
              state={valid ? 'success' : 'default'}
              autoComplete="tel"
            />
            <button
              type="button"
              className="rf-sx-btn rf-sx-btn--solid rf-idm-resend-btn"
              onClick={() => setSent(true)}
              disabled={!valid}
            >
              Resend Text
            </button>
          </div>
          {/* Nothing was sent. Said plainly rather than "Text sent!", which
              would be a claim the widget cannot make. */}
          {sent && <p className="rf-idm-note">No text is sent yet — verification is not connected.</p>}

          <div className="rf-idm-or"><span>or</span></div>

          <button type="button" className="rf-sx-btn rf-sx-btn--outline rf-idm-return" onClick={onClose}>
            Return to this Device
          </button>

          <p className="rf-idm-para rf-idm-foot">
            If the text link you received did not redirect you to our identity verification tool, then
            enable pop-ups in your browser settings and try again.{' '}
            <a href="#pop-ups" onClick={(e) => e.preventDefault()}>Click here to see how to enable pop-ups.</a>
          </p>

          {/* ── SCAFFOLD ──────────────────────────────────────────────────
              Not part of the design. Stands in for the verification app's
              response so all three outcomes can be seen and styled. Remove
              this block once the real service calls `onResult`. */}
          <div className="rf-idm-stub">
            <p className="rf-idm-stub-label">Demo only — pick the result the ID app would return:</p>
            <div className="rf-idm-stub-row">
              <button type="button" onClick={() => { onResult('complete'); onClose(); }}>Complete</button>
              <button type="button" onClick={() => { onResult('failed'); onClose(); }}>Failed</button>
              <button type="button" onClick={() => { onResult('later'); onClose(); }}>Verify later</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Portalled for the same reason as the other two: a `position: fixed` overlay
  // is contained by the nearest ancestor with layout containment, and the flow's
  // content column is `container-type: inline-size`.
  return typeof document !== 'undefined' && document.body
    ? createPortal(overlay, document.body)
    : overlay;
}
