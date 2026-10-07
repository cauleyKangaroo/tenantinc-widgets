// ===========================================================================
// "Verify ID Now" — Figma node 8509-35693.
//
// Connected mode starts/resends a hosted verification and reflects its poll
// lifecycle. Disconnected editor mode keeps three clearly labelled scaffold
// buttons so every designed outcome can be reviewed without an API call.
//
// Same overlay shell as MoveInDateModal and ProtectionPlanModal: Escape, click
// outside, scroll lock, portalled to <body>.
// ===========================================================================

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { Shimmer } from '@shared/Shimmer';
import { CloseCircleIcon, FormField, isPossiblePhone } from '@shared/ui';
import { IdCardIcon } from './planIcons';
import { IdIllustration } from './IdIllustration';

export type IdVerifyResult = 'complete' | 'failed' | 'later';

export function IdVerifyModal({
  open,
  onClose,
  onResult,
  phone = '',
  connected = false,
  lifecycle,
  notificationStatus,
  onResend,
  resendUncertain = false,
  verificationUrl,
}: {
  open: boolean;
  onClose: () => void;
  /** Fired with the outcome the verification app reported. */
  onResult: (result: IdVerifyResult) => void;
  /** The number the text went to — the contact's, pre-filled and editable. */
  phone?: string;
  connected?: boolean;
  lifecycle?: string;
  notificationStatus?: 'sent' | 'failed' | 'skipped';
  onResend?: () => Promise<'sent' | 'failed' | 'skipped' | undefined>;
  resendUncertain?: boolean;
  /** The hosted capture page — the same link the text carries — as a QR for
   *  the renter's phone camera. Absent until the start call has returned. */
  verificationUrl?: string;
}) {
  const [num, setNum] = useState(phone);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

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
  useEffect(() => {
    if (open) { setNum(phone); setSent(false); setResendMessage(''); }
  }, [open, phone]);

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
              32, filling the 32px button. Same glyph, same box, so the two
              modals close the same way — change one, change both (and the
              !important pin in screens.css, which would otherwise win). */}
          <button type="button" className="rf-modal-close" onClick={onClose} aria-label="Close">
            {/* Filled disc: .rf-modal is #fff. */}
            <CloseCircleIcon size={32} />
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
              disabled={connected}
              state={valid ? 'success' : 'default'}
              autoComplete="tel"
            />
            <button
              type="button"
              className="rf-sx-btn rf-sx-btn--solid rf-idm-resend-btn"
              onClick={() => {
                if (!connected) { setSent(true); return; }
                setResending(true);
                setResendMessage('');
                void onResend?.()
                  .then((status) => setResendMessage(
                    status === 'sent'
                      ? 'A new text message was requested.'
                      : 'The text could not be delivered. Try again, or continue on this device.',
                  ))
                  .catch(() => setResendMessage('We could not request another text. Try again, or continue on this device.'))
                  .finally(() => setResending(false));
              }}
              disabled={!valid || resending || resendUncertain || (connected && lifecycle !== 'pending')}
            >
              {resending ? 'Resending…' : 'Resend Text'}
            </button>
          </div>
          {/* Nothing was sent. Said plainly rather than "Text sent!", which
              would be a claim the widget cannot make. */}
          {sent && !connected && <p className="rf-idm-note">No text is sent yet — verification is not connected.</p>}
          {connected && resendMessage && <p className="rf-idm-note">{resendMessage}</p>}
          {connected && resendUncertain && <p className="rf-idm-note">We could not confirm the resend. Your existing verification is still available below. Contact the store before requesting another text.</p>}
          {connected && <p className="rf-idm-note">
            {lifecycle === 'pending'
              ? notificationStatus === 'failed'
                ? 'The first text was not delivered. Try Resend Text, or continue on this device.'
                : 'Verification is in progress. Complete it on your phone.'
              : 'Starting verification…'}
          </p>}

          {/* The legacy flow's QR, between Resend Text and Return to this
              Device: scanning it opens the same page the text links to. The
              preview has no session, so it shows a placeholder that scans to
              nothing actionable. */}
          {(verificationUrl || !connected || lifecycle === 'ready' || lifecycle === 'starting') && (
            <div className="rf-idm-qr">
              <div className="rf-idm-qr-code">
                {verificationUrl || !connected ? (
                  <QRCode
                    value={verificationUrl ?? 'ID verification preview'}
                    size={148}
                    level="M"
                    fgColor="#101318"
                    bgColor="#ffffff"
                    title="QR code for the ID verification page"
                  />
                ) : (
                  <div role="status" aria-label="Preparing QR code"><Shimmer w={148} h={148} r={4} /></div>
                )}
              </div>
              <p className="rf-idm-para rf-idm-qr-note">Or scan this code with your phone&rsquo;s camera.</p>
            </div>
          )}

          <div className="rf-idm-or"><span>or</span></div>

          {/* Back to the page. Verification carries on — the screen keeps
              polling and updates when the phone finishes. */}
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
          {!connected && <div className="rf-idm-stub">
            <p className="rf-idm-stub-label">Demo only — pick the result the ID app would return:</p>
            <div className="rf-idm-stub-row">
              <button type="button" onClick={() => { onResult('complete'); onClose(); }}>Complete</button>
              <button type="button" onClick={() => { onResult('failed'); onClose(); }}>Failed</button>
              <button type="button" onClick={() => { onResult('later'); onClose(); }}>Verify later</button>
            </div>
          </div>}
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
