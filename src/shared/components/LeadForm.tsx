import React, { useEffect, useId, useState } from 'react';
import { Checkbox } from '@shared/ui/Checkbox';
import { FormField, type FieldType } from '@shared/ui/FormField';
import { isPossiblePhone } from '@shared/ui/phone';
import { AlertIcon } from '@shared/ui/icons';
import type { LeadInput } from '@shared/leadsApi';
import './MessageModal.css';

// ---------------------------------------------------------------------------
// The "Send us a Message" lead form — fields, facility picker, consent, submit.
//
// Extracted from MessageModal so it can render in TWO places without a clone:
// inside the modal (#02 / #03 / #05 / #13 open it as a lightbox) and inline on
// a page as #23 widget-contact-form. The modal keeps only its chrome (overlay,
// dialog, title bar, Esc/scroll-lock) and mounts this for the rest. #05 once
// carried a "faithful clone" of #03's modal and fell two revisions behind —
// that is the drift this split exists to prevent, again.
//
// State lives here and resets by MOUNT, not by effect: the modal renders this
// only while open, so closing it unmounts the form and the next open starts
// clean — the job the old reset-on-open effect did.
//
// Class names keep the `pi-msg-` prefix and MessageModal.css keeps the rules:
// renaming 69 live selectors buys nothing. The stylesheet is imported here as
// well so the inline widget gets it without going through the modal.
// ---------------------------------------------------------------------------

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/* Copied from #03's icons.tsx rather than imported: those are used by
   PropertyInfo itself as well, so they cannot move, and a shared component
   reaching into a widget's folder is the wrong direction of dependency. */
function MapPinIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12.0004 13.7105C13.6137 13.7105 14.9215 12.4027 14.9215 10.7895C14.9215 9.17622 13.6137 7.86842 12.0004 7.86842C10.3872 7.86842 9.07936 9.17622 9.07936 10.7895C9.07936 12.4027 10.3872 13.7105 12.0004 13.7105Z" />
      <path d="M12.0004 21.5C13.9478 21.5 19.7899 17.3889 19.7899 11.2222C19.7899 5.05556 14.9215 3 12.0004 3C9.07936 3 4.21094 5.05556 4.21094 11.2222C4.21094 17.3889 10.053 21.5 12.0004 21.5Z" />
    </svg>
  );
}

export interface Facility {
  /** Property id where the list came from the API. Optional because a caller
      with only the page's own property has no id to give — see #03/#05. */
  id?: string;
  name: string;
  address?: string;
}

function ChevronDown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9c1.577 2.181 3.423 4.137 5.49 5.817a.8.8 0 0 0 1.02 0C14.577 13.137 16.423 11.181 18 9" />
    </svg>
  );
}

/**
 * Text inputs are the SHARED FormField, so they behave exactly as the rental
 * flow's do: floating label driven by :placeholder-shown (so browser autofill
 * lifts it too), a border that follows the caret via :focus-within, and a
 * green border plus tick once the value validates.
 *
 * Validation is derived from the field's TYPE, matching how Step 2 does it, so
 * the tick and any submit gate cannot disagree about what "valid" means.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether a value passes for its type — the one rule the tick, the field's
 *  error and the submit gate all share, so they can never disagree. */
function fieldValid(type: FieldType, value: string): boolean {
  return type === 'email'
    ? EMAIL_RE.test(value.trim())
    : type === 'tel'
      ? isPossiblePhone(value, 'US')
      : value.trim().length > 0;
}

/**
 * Why a field fails, as the message under it — or '' when it passes. Shown
 * once Submit has been pressed (every field at once, not just the first), and
 * for a FORMAT fault as soon as the field is left with something typed in it,
 * so a mistyped email is caught at the field rather than at the button.
 */
function fieldProblem(label: string, type: FieldType, value: string): string {
  const v = value.trim();
  if (!v) return `Enter your ${label.toLowerCase()}`;
  if (type === 'email' && !EMAIL_RE.test(v)) return 'Enter a valid email address';
  if (type === 'tel' && !isPossiblePhone(value, 'US')) return 'Enter a valid mobile number';
  return '';
}

function Field({
  label, required, type = 'text', value, onChange, disabled, attempted,
}: {
  label: string; required?: boolean; type?: FieldType;
  value: string; onChange: (v: string) => void; disabled?: boolean;
  /** Submit has been pressed: every fault shows, including an empty field. */
  attempted?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const valid = fieldValid(type, value);
  const problem = fieldProblem(label, type, value);
  // Empty is only a fault once Submit has been tried; a wrong FORMAT shows as
  // soon as the field is left, since the shopper has finished with it.
  const show = problem && (attempted || (touched && value.trim().length > 0));

  return (
    <FormField
      label={label}
      type={type}
      required={required}
      value={value}
      onChange={onChange}
      onBlur={() => setTouched(true)}
      disabled={disabled}
      phoneCountry={type === 'tel' ? 'US' : undefined}
      state={valid ? 'success' : 'default'}
      error={show ? problem : undefined}
    />
  );
}

/**
 * The message box. The kit has no textarea, so this stays bespoke — but it
 * borrows the kit's tokens for its border, focus and valid states so it reads
 * as the same control family rather than a lookalike.
 */
function MessageBox({
  label, required, value, onChange, disabled, error,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; disabled?: boolean;
  /** Shown under the box in the kit's error style, with a red border. */
  error?: string;
}) {
  const filled = value.trim().length > 0;
  const errorId = useId();
  return (
    <div className="pi-msg-area-wrap">
      <label className={`pi-msg-area${filled ? ' pi-msg-area--valid' : ''}${error ? ' pi-msg-area--error' : ''}`}>
        {/* Input before label, and placeholder=" ", so the same
            :placeholder-shown rule the kit uses can float it. */}
        <textarea
          className="pi-msg-area-input"
          value={value}
          placeholder=" "
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pi-msg-area-label">{label}{required && <span className="pi-req" aria-hidden="true">*</span>}</span>
      </label>
      {error && <p className="pi-msg-field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

export function LeadForm({
  facilities, submitLead, termsHref = '#', defaultFacility = null,
  onCancel, onDone, requireFacility = false,
}: {
  facilities: Facility[];
  /** The widget's own createLead — each widget files against its own company
      and property with its own key, so the creds cannot live here. */
  submitLead: (input: LeadInput) => Promise<unknown>;
  termsHref?: string;
  /**
   * The property whose page this is, preselected on mount. The modal's callers
   * sit ON a property, so asking the shopper to pick the one they are already
   * looking at is a step with one right answer.
   *
   * Explicit rather than "preselect facilities[0] when there is only one":
   * that would be an accident of list length, and would silently stop working
   * the moment a caller passes the full portfolio — which is precisely the
   * change most likely to come next.
   *
   * Clearing it is the shopper's call; Clear was already there and still is.
   */
  defaultFacility?: Facility | null;
  /** Renders a Cancel button that calls it — the modal's close. Absent (the
      inline form), no Cancel renders: a page has nothing to cancel back to. */
  onCancel?: () => void;
  /** Where the success screen's Done goes — the modal closes. Absent, Done
      resets to a fresh form, so an inline page can take another message. */
  onDone?: () => void;
  /**
   * Submit refuses until a facility is picked. OFF for the modal: its callers
   * sit on a property and preselect it, and their createLead falls back to the
   * page's own id. ON for the inline contact page, which sits on NO property —
   * there the fallback would be config.json's id, a property of the OLD
   * company that must never receive a live lead.
   */
  requireFacility?: boolean;
}) {
  // Opens on the preselected property when the caller names one, otherwise on
  // the "Select Facility" dropdown (Figma 10199-60873); picking an option swaps
  // to the name + address state (Figma 10199-67707).
  const [selected, setSelected] = useState<Facility | null>(defaultFacility);
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();
  const consentErrorId = useId();
  const [consent, setConsent] = useState(false);

  // Form values + submission state.
  const [form, setForm] = useState({ first: '', last: '', email: '', mobile: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  /* Submit has been pressed with something wrong. From then on EVERY field
     reports its own fault beneath itself — before, one summary line named
     only the first problem, so a form with four faults was fixed one press at
     a time. The faults clear as each field is corrected. */
  const [attempted, setAttempted] = useState(false);
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const submitting = status === 'submitting';

  /* The caller's property, re-applied when its identity settles — the
     portfolio list usually lands AFTER mount, switching the preselection from
     a name key to an id key. Keyed on the NAME/ID, not the object: the
     callers build `{name, address}` inline on every render, so the object is
     new each time. It must not touch the rest of the form — keying a reset on
     this is exactly what used to wipe a half-typed message. */
  const defaultName = defaultFacility?.id ?? defaultFacility?.name;
  useEffect(() => {
    setSelected(defaultFacility ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName]);

  /* The same checks the fields draw from, so the gate and the red borders
     cannot disagree about what is wrong. */
  const formValid = fieldValid('text', form.first) && fieldValid('text', form.last)
    && fieldValid('email', form.email) && fieldValid('tel', form.mobile)
    && form.message.trim().length > 0 && consent
    && (!requireFacility || selected !== null);

  async function handleSubmit() {
    setError('');
    if (!formValid) {
      // Every fault shows at once, at its field — nothing is sent.
      setAttempted(true);
      return;
    }
    const first = form.first.trim();
    const last = form.last.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const message = form.message.trim();

    setStatus('submitting');
    try {
      /* The SELECTED facility rides along as the lead's property. Before the
         extraction the dropdown only changed the consent text — a shopper who
         cleared the page's property and picked another still filed against
         the page's, which is exactly what the picker says doesn't happen.
         Unselected stays undefined, so the caller's own fallback applies. */
      await submitLead({ first, last, email, phone: mobile, message, propertyId: selected?.id });
      setStatus('success');
    } catch (err) {
      console.error('[LeadForm] createLead error:', err);
      setStatus('error');
      setError('Sorry, we couldn’t send your message. Please try again.');
    }
  }

  /** The inline form's Done: back to a blank, idle form for the next message. */
  function reset() {
    setForm({ first: '', last: '', email: '', mobile: '', message: '' });
    setConsent(false);
    setStatus('idle');
    setError('');
    setAttempted(false);
    setSelected(defaultFacility ?? null);
    setListOpen(false);
  }

  const facilityName = selected?.name ?? 'STORAGE FACILITY';

  if (status === 'success') {
    return (
      <div className="pi-msg-body">
        <div className="pi-msg-success" role="status">
          <span className="pi-msg-success-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#028a0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17 4.5 12" /></svg>
          </span>
          <p className="pi-msg-success-title">Message sent!</p>
          <p className="pi-msg-success-text">Thanks for reaching out — a member of our team will be in touch shortly.</p>
          <button type="button" className="pi-msg-submit" onClick={onDone ?? reset}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pi-msg-body">
        {/* Facility: dropdown (unselected) or name + address (selected) */}
        <div className="pi-msg-facility-area">
          {selected ? (
            <div className="pi-msg-facility">
              {/* Static, not a button (Figma 10295-76697). Making the whole
                  block clickable is what gave it a hover fill — and that fill
                  was the host's `button:hover`, since this rule never declared
                  one of its own. Clear is the control now. */}
              <div className="pi-msg-facility-info">
                <span className="pi-msg-facility-name">{selected.name}</span>
                {selected.address && (
                  <span className="pi-msg-facility-addr"><MapPinIcon size={24} /><span>{selected.address}</span></span>
                )}
              </div>
              {/* Clear is the only control. Changing property is Clear then
                  pick from the dropdown — one route to a different facility
                  rather than two doing the same job, and it removes a button
                  that could only ever be shown or hidden depending on how many
                  facilities happened to have loaded. */}
              <div className="pi-msg-facility-actions">
                <button
                  type="button"
                  className="pi-msg-facility-clear"
                  onClick={() => { setSelected(null); setListOpen(false); }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            /* Figma 10295-76823: a single "Select Property" field, no heading above it. */
            <button
              type="button"
              className="pi-msg-dd-btn"
              aria-expanded={listOpen && facilities.length > 0}
              aria-controls={listOpen && facilities.length > 0 ? listId : undefined}
              onClick={() => setListOpen((o) => !o)}
            >
              <span>Select Property</span>
              <ChevronDown size={24} />
            </button>
          )}
          {listOpen && facilities.length > 0 && (
            <ul className="pi-msg-dd-list" id={listId}>
              {/* Keyed on the id where there is one: two facilities CAN share
                  a name (a company with two "Storage Outlet - Chino" rows),
                  and a duplicate React key silently drops one from the list. */}
              {facilities.map((f) => (
                <li key={f.id ?? f.name}>
                  <button type="button" onClick={() => { setSelected(f); setListOpen(false); }}>{f.name}</button>
                </li>
              ))}
            </ul>
          )}
          {requireFacility && attempted && !selected && (
            <p className="pi-msg-field-error" role="alert">Please select a property</p>
          )}
        </div>

        {/* Gaps follow the design: 16px between the name/contact rows, 24px
            before the message box. */}
        <div className="pi-msg-form">
          <div className="pi-msg-rows">
            <div className="pi-msg-row">
              <Field label="First Name" required value={form.first} onChange={set('first')} disabled={submitting} attempted={attempted} />
              <Field label="Last Name" required value={form.last} onChange={set('last')} disabled={submitting} attempted={attempted} />
            </div>
            <div className="pi-msg-row">
              <Field label="Email" required type="email" value={form.email} onChange={set('email')} disabled={submitting} attempted={attempted} />
              <Field label="Mobile" required type="tel" value={form.mobile} onChange={set('mobile')} disabled={submitting} attempted={attempted} />
            </div>
          </div>
          <MessageBox
            label="Leave us a Message" required value={form.message} onChange={set('message')} disabled={submitting}
            error={attempted && !form.message.trim() ? 'Enter your message' : undefined}
          />
        </div>
      </div>

      <div className="pi-msg-foot">
        {/* The shared kit's checkbox, so this matches every other one on the
            site. Imported from its own module rather than the @shared/ui
            barrel — that would drag in Button, FormField, SummaryRail and
            paymentIcons' ~39KB of data URIs for a single control. */}
        {/* Required like the fields: unticked at Submit, the box goes red
            and says so beneath, and clears the moment it is ticked. */}
        <Checkbox
          checked={consent} onChange={setConsent}
          className={`pi-msg-consent${attempted && !consent ? ' pi-msg-consent--error' : ''}`}
          invalid={attempted && !consent}
          describedBy={attempted && !consent ? consentErrorId : undefined}
        >
          <span className="pi-msg-consent-text">
            By providing your phone number, you consent to receive informational text messages from {facilityName}.
            Message frequency varies. Message &amp; data rates may apply. Reply HELP for help or STOP to unsubscribe at any time.
          </span>
        </Checkbox>
        {attempted && !consent && (
          <p className="pi-msg-field-error pi-msg-field-error--consent" id={consentErrorId} role="alert">Please agree to receive messages to continue</p>
        )}
        <a className="pi-msg-terms" href={termsHref}>Click to see our Terms and Privacy Policy</a>

        {/* Only a SEND failure lands here now; field faults sit at their fields. */}
        {error && (
          <div className="pi-msg-error" role="alert">
            <AlertIcon size={24} className="pi-msg-error-ico" />
            <span>{error}</span>
          </div>
        )}

        <div className="pi-msg-actions">
          {/* reCAPTCHA — switched off (2026-10-15): there is no verification
              behind the mock, so it only looked like a gate. Restore by
              uncommenting once a real site key is wired in.
          <div className="pi-msg-captcha" aria-hidden="true">
            <span className="pi-msg-captcha-box" />
            <span className="pi-msg-captcha-label">I&rsquo;m not a robot</span>
            <span className="pi-msg-captcha-brand">reCAPTCHA</span>
          </div>
          */}
          <div className="pi-msg-buttons">
            {onCancel && (
              <button type="button" className="pi-msg-cancel" onClick={onCancel} disabled={submitting}>Cancel</button>
            )}
            <button type="button" className="pi-msg-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
