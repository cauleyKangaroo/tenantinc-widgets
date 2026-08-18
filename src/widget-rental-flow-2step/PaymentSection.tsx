// ===========================================================================
// Payment method selection — Figma nodes 10080-28749 (Pay by Bank) and
// 10080-30277 (Credit / Debit).
//
// Both frames are the same layout with one panel expanded: the chosen method
// becomes a bordered panel (2px --hb-cta) containing its form and its own
// "Pay Now $X" button, and the other collapses to a 2px dark outline button.
// So this is ONE component with `selected` state, not two screens.
//
// The fields are Figma's "Mariposa Form 2.0" — the same component the shared UI
// kit was built from (node 8215-19040/19107) — so they come from `@shared/ui`
// rather than being restyled here. That is why the borders, 56px height, floating
// label, red asterisk and green validated state all match without new CSS.
//
// The card-number row is the one exception: the design packs Card Number, MM/YY
// and CVV into a single bordered box, which no single FormField models, so it is
// composed by hand from the same tokens.
// ===========================================================================

import React, { useState } from 'react';
import { FormField, CheckIcon } from '@shared/ui';
import { Shimmer } from '@shared/Shimmer';
import { BankIcon, CreditCardIcon, CheckTick, InfoIcon } from './icons';
import { ChevronBig } from './planIcons';

export type PayMethod = 'googlepay' | 'applepay' | 'card' | 'bank' | null;

/** Money as the design writes it: "Pay Now $120.00". */
const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * A select rendered as a FormField plus the chevron affordance. The design uses
 * the same box for selects and text inputs, distinguished only by the chevron,
 * so this keeps them visually identical by construction.
 */
/* ---------------------------------------------------------------------------
 * Validation (Figma 10080-28126: 1px #028a0c border + a check tick at 24px).
 *
 * Two success treatments, deliberately:
 *   ok()      — green border AND the tick. Plain text fields.
 *   okQuiet() — green border ONLY. For fields whose icon slot is already
 *               occupied: the location selects (chevron), and anything with an
 *               info or search affordance. Two icons in one slot is what put
 *               the "2 chevrons" on Billing Country.
 * ------------------------------------------------------------------------ */
const ok = (valid: boolean) => (valid ? 'success' as const : 'default' as const);
const okQuiet = (valid: boolean) => (valid ? 'rf-valid' : undefined);

const digits = (v: string) => v.replace(/\D/g, '');

/* Field lengths. Every onChange strips non-digits before it reaches state, so
   letters can never be typed into the row in the first place — there is no
   "invalid character" state to render because the character never lands. */
const CARD_DIGITS = 16;
const EXPIRY_DIGITS = 4;
const CVV_DIGITS = 3;
/** 13–19 digits covers every brand we accept; the row does not brand-detect. */
const validCard = (v: string) => digits(v).length === CARD_DIGITS;
const validCvv = (v: string) => digits(v).length === CVV_DIGITS;
const validRouting = (v: string) => digits(v).length === 9;
const filled = (v: string) => v.trim().length > 0;

/**
 * Why an expiry is unusable, or undefined when it is fine — a reason rather
 * than a bare boolean, so the row can say WHAT is wrong instead of only
 * turning red.
 *
 * Silent until all four digits are in: complaining that "08" is expired while
 * someone is still typing the year would be wrong on nearly every card.
 *
 * A card is valid THROUGH its printed month, so the current month passes and
 * only an earlier one fails. Two-digit years are read as 20xx, which is the
 * industry assumption — no card carries a 70-year expiry.
 */
function expiryError(v: string): string | undefined {
  const d = digits(v);
  if (d.length < EXPIRY_DIGITS) return undefined;
  const mm = Number(d.slice(0, 2));
  const yy = Number(d.slice(2));
  if (mm < 1 || mm > 12) return 'Enter a valid expiry month (01\u201312).';
  const now = new Date();
  const curYY = now.getFullYear() % 100;
  const curMM = now.getMonth() + 1;
  if (yy < curYY || (yy === curYY && mm < curMM)) {
    return 'Please check the expiry date on this card.';
  }
  return undefined;
}
const validExpiry = (v: string) => digits(v).length === EXPIRY_DIGITS && !expiryError(v);

function SelectField({
  label, value, onChange, options, required, state,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  state?: 'default' | 'success';
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
      {/* Presentational twin: shows the floating label + value in the exact form
          styling, while the real <select> above sits transparently over it so the
          native picker (and mobile wheel) still does the work. */}
      <div className="rf-select-face" aria-hidden="true">
        {/* state is NOT forwarded: the kit draws a check tick for 'success',
            which would land on top of the chevron below — that pair is what
            read as "two chevrons" on Billing Country. The valid look here is
            the green border alone, exactly as the frame has it (its Icons slot
            is empty). */}
        <FormField
          label={label}
          required={required}
          value={value}
          onChange={() => {}}
          className={state === 'success' ? 'rf-valid' : undefined}
        />
        <ChevronBig size={24} className="rf-select-chev" />
      </div>
    </div>
  );
}

/**
 * Skeleton stood in for a payment form while it "loads" — Figma 8507-24610.
 * The frame is grey blocks at `rgba(0,0,0,.08)` / 4px radius: a 24px heading
 * pair, then 50px field blocks two-up with 20px gaps. Built from the shared
 * `Shimmer` primitive so the sweep matches every other skeleton on the site
 * rather than shipping a second animation.
 */
export function PaymentFormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rf-pay-skeleton" aria-hidden="true">
      <Shimmer w={318} h={24} mb={12} r={4} />
      <Shimmer w="100%" h={24} mb={20} r={4} />
      {Array.from({ length: rows }, (_, i) => (
        <div className="rf-pay-skeleton-row" key={i}>
          <Shimmer w="100%" h={50} r={4} />
          <Shimmer w="100%" h={50} r={4} />
        </div>
      ))}
      <Shimmer w="100%" h={50} r={4} />
    </div>
  );
}

export function BankForm({ total, onPay }: { total: number; onPay: () => void }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [accountType, setAccountType] = useState('');
  const [routing, setRouting] = useState('');
  const [account, setAccount] = useState('');
  const [confirm, setConfirm] = useState('');
  // Pre-filled and validated in the design — the common case for a US site.
  const [country, setCountry] = useState('United States');
  const [address, setAddress] = useState('');

  return (
    <>
      <div className="rf-pay-grid">
        <FormField label="First Name" required value={first} onChange={setFirst} autoComplete="given-name" state={ok(filled(first))} />
        <FormField label="Last Name" required value={last} onChange={setLast} autoComplete="family-name" state={ok(filled(last))} />

        <SelectField
          label="Account Type" required value={accountType} onChange={setAccountType}
          options={['Checking', 'Savings']}
          state={ok(filled(accountType))}
        />
        <FormField
          label="Routing Number" required value={routing} onChange={setRouting}
          infoTitle="The 9-digit number on the bottom left of your cheque"
          className={okQuiet(validRouting(routing))}
        />

        {/* Masked by default with an eye toggle (Figma 10080-28132 / -28133).
            type="password" is the shared field's own reveal: it starts hidden,
            swaps the input to text on click, and already ships the frame's exact
            eye-on / eye-off artwork — the paths are byte-identical to the
            exports, so there was nothing to re-trace. */}
        <FormField
          label="Account Number" required type="password"
          value={account} onChange={setAccount}
          state={ok(digits(account).length >= 4)}
        />
        <FormField
          label="Confirm Account Number" required type="password"
          value={confirm} onChange={setConfirm}
          // Only complain once there's enough typed to be a real mismatch, not on
          // the first keystroke of the second field.
          error={confirm && account && confirm !== account ? 'Account numbers do not match' : undefined}
          infoTitle="Re-enter to confirm"
          className={okQuiet(digits(account).length >= 4 && confirm === account)}
        />

        <SelectField
          label="Billing Country" required value={country} onChange={setCountry}
          options={['United States', 'Canada']}
          state={country ? 'success' : 'default'}
        />
        {/* Search affordance owns the icon slot — border only. */}
        <FormField label="Billing Address" required type="search" value={address} onChange={setAddress} autoComplete="street-address" className={okQuiet(filled(address))} />
      </div>

      <button type="button" className="rf-paynow" onClick={onPay}>
        {`Pay Now ${money(total)}`}
      </button>
    </>
  );
}

export function CardForm({ total, onPay }: { total: number; onPay: () => void }) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United States');
  const [zip, setZip] = useState('');

  /* The row is one bordered box holding three inputs, so it turns green as a
     unit rather than per-input — there is only one border to turn. */
  const cardRowValid = validCard(number) && validExpiry(expiry) && validCvv(cvv);
  const expError = expiryError(expiry);

  /** "1234567812345678" → "1234 5678 1234 5678" as it's typed. */
  const onNumber = (v: string) =>
    setNumber(v.replace(/\D/g, '').slice(0, CARD_DIGITS).replace(/(.{4})/g, '$1 ').trim());

  /** "1226" → "12 / 26". */
  const onExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, EXPIRY_DIGITS);
    setExpiry(d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d);
  };

  return (
    <>
      {/*
        One bordered box holding three inputs — the design's card row. Not a
        FormField: that models a single labelled input, and forcing three into it
        would mean fighting its internals. Same tokens, so it sits flush with the
        real form fields above and below it.
      */}
      <div className={`rf-cardrow${cardRowValid ? ' rf-cardrow--valid' : ''}${expError ? ' rf-cardrow--error' : ''}`}>
        <CreditCardIcon size={24} className="rf-cardrow-ico" />

        {/*
          Each cell floats its own label, the same way the FormFields below do —
          the label rises and STAYS above the value instead of vanishing on the
          first keystroke. Input before label in the DOM so the CSS sibling
          selector can key off :placeholder-shown, and placeholder=" " (a space)
          so that pseudo-class is reliable. Exactly the kit's mechanism; see
          FormField.css.
        */}
        <span className="rf-cardcell rf-cardcell--number">
          <input
            className="rf-cardrow-input"
            value={number}
            onChange={(e) => onNumber(e.target.value)}
            placeholder=" "
            inputMode="numeric"
            autoComplete="cc-number"
            aria-label="Card Number (required)"
          />
          <label className="rf-cardcell-label">Card Number<span className="rf-req">*</span></label>
        </span>

        <span className="rf-cardcell rf-cardcell--exp">
          <input
            className="rf-cardrow-input"
            value={expiry}
            onChange={(e) => onExpiry(e.target.value)}
            placeholder=" "
            inputMode="numeric"
            autoComplete="cc-exp"
            aria-label="Card expiry, MM / YY (required)"
          />
          <label className="rf-cardcell-label">MM / YY<span className="rf-req">*</span></label>
        </span>

        <span className="rf-cardcell rf-cardcell--cvv">
          <input
            className="rf-cardrow-input"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, CVV_DIGITS))}
            placeholder=" "
            inputMode="numeric"
            autoComplete="cc-csc"
            aria-label="Card security code (required)"
          />
          <label className="rf-cardcell-label">CVV<span className="rf-req">*</span></label>
        </span>

        {/* One tick for the row, not three: the three inputs share a single
            border, so they succeed as a unit (Figma 10080-28126). */}
        {cardRowValid && <CheckIcon className="rf-cardrow-tick" />}
      </div>
      {expError && <p className="rf-cardrow-msg" role="alert">{expError}</p>}

      <FormField label="Name on Card" required value={name} onChange={setName} autoComplete="cc-name" state={ok(filled(name))} />

      <div className="rf-pay-grid">
        <SelectField
          label="Billing Country" required value={country} onChange={setCountry}
          options={['United States', 'Canada']}
          state={country ? 'success' : 'default'}
        />
        <FormField label="Billing ZIP Code" required value={zip} onChange={setZip} autoComplete="postal-code" state={ok(zip.trim().length >= 3)} />
      </div>

      <button type="button" className="rf-paynow" onClick={onPay}>
        {`Pay Now ${money(total)}`}
      </button>
    </>
  );
}

export function PaymentSection({
  total, autopay, onAutopay, onPay,
}: {
  total: number;
  autopay: boolean;
  onAutopay: (v: boolean) => void;
  /** Fires when a "Pay Now" is pressed — the caller opens the processing modal. */
  onPay: (method: PayMethod) => void;
}) {
  const [selected, setSelected] = useState<PayMethod>(null);

  /** Collapsed method button — 2px dark outline, per both frames. */
  const methodButton = (method: 'card' | 'bank') => (
    <button type="button" className="rf-method" onClick={() => setSelected(method)}>
      {method === 'card' ? <CreditCardIcon size={24} /> : <BankIcon size={24} />}
      {method === 'card' ? 'Credit / Debit' : 'Pay by Bank'}
    </button>
  );

  /** Expanded panel — 2px CTA border, holding the method's form. */
  const methodPanel = (method: 'card' | 'bank') => (
    <section className="rf-method-panel" aria-label={method === 'card' ? 'Credit / Debit' : 'Pay by Bank'}>
      <header className="rf-method-panel-head">
        {method === 'card' ? <CreditCardIcon size={24} /> : <BankIcon size={24} />}
        <span>{method === 'card' ? 'Credit / Debit' : 'Pay by Bank'}</span>
      </header>
      {method === 'card'
        ? <CardForm total={total} onPay={() => onPay('card')} />
        : <BankForm total={total} onPay={() => onPay('bank')} />}
    </section>
  );

  return (
    <section className="rf-payment">
      <h3 className="rf-payment-title">Payment</h3>

      <div className="rf-autopay-card">
        <label className="rf-autopay-line">
          <input type="checkbox" checked={autopay} onChange={(e) => onAutopay(e.target.checked)} />
          <span className={`rf2-box${autopay ? ' rf2-box--on' : ''}`}>{autopay && <CheckTick size={16} />}</span>
          <span className="rf-autopay-text">Autopay Enrollment</span>
        </label>
        <InfoIcon size={16} className="rf-autopay-i" />
      </div>

      <div className="rf-wallets">
        <button type="button" className="rf-wallet" onClick={() => onPay('googlepay')} aria-label="Pay with Google Pay">
          {/* Wordmarks are the brands' own and must not be re-drawn; these are the
              existing inline marks already used by step 2's payment grid. */}
          <span className="rf-wallet-mark rf-wallet-mark--g" />
          <span className="rf-wallet-label">Pay</span>
        </button>
        <button type="button" className="rf-wallet" onClick={() => onPay('applepay')} aria-label="Pay with Apple Pay">
          <span className="rf-wallet-apple">&#xF8FF;</span>
          <span className="rf-wallet-label">Pay</span>
        </button>
      </div>

      {/* Card first when card is chosen, bank first when bank is — matching the
          two frames, where the expanded panel always sits above the collapsed one. */}
      {selected === 'card' ? (
        <>{methodPanel('card')}{methodButton('bank')}</>
      ) : selected === 'bank' ? (
        <>{methodPanel('bank')}{methodButton('card')}</>
      ) : (
        <>{methodButton('card')}{methodButton('bank')}</>
      )}
    </section>
  );
}
