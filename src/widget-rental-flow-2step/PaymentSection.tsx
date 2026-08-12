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
import { FormField } from '@shared/ui';
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
        <FormField
          label={label}
          required={required}
          value={value}
          onChange={() => {}}
          state={state}
        />
        <ChevronBig size={24} className="rf-select-chev" />
      </div>
    </div>
  );
}

function BankForm({ total, onPay }: { total: number; onPay: () => void }) {
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
        <FormField label="First Name" required value={first} onChange={setFirst} autoComplete="given-name" />
        <FormField label="Last Name" required value={last} onChange={setLast} autoComplete="family-name" />

        <SelectField
          label="Account Type" required value={accountType} onChange={setAccountType}
          options={['Checking', 'Savings']}
        />
        <FormField
          label="Routing Number" required value={routing} onChange={setRouting}
          infoTitle="The 9-digit number on the bottom left of your cheque"
        />

        <FormField label="Account Number" required value={account} onChange={setAccount} />
        <FormField
          label="Confirm Account Number" required value={confirm} onChange={setConfirm}
          // Only complain once there's enough typed to be a real mismatch, not on
          // the first keystroke of the second field.
          error={confirm && account && confirm !== account ? 'Account numbers do not match' : undefined}
          infoTitle="Re-enter to confirm"
        />

        <SelectField
          label="Billing Country" required value={country} onChange={setCountry}
          options={['United States', 'Canada']}
          state={country ? 'success' : 'default'}
        />
        <FormField label="Billing Address" required type="search" value={address} onChange={setAddress} autoComplete="street-address" />
      </div>

      <button type="button" className="rf-paynow" onClick={onPay}>
        {`Pay Now ${money(total)}`}
      </button>
    </>
  );
}

function CardForm({ total, onPay }: { total: number; onPay: () => void }) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United States');
  const [zip, setZip] = useState('');

  /** "1234567812345678" → "1234 5678 1234 5678" as it's typed. */
  const onNumber = (v: string) =>
    setNumber(v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim());

  /** "1226" → "12 / 26". */
  const onExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
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
      <div className="rf-cardrow">
        <CreditCardIcon size={24} className="rf-cardrow-ico" />
        <input
          className="rf-cardrow-input rf-cardrow-number"
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          placeholder="Card Number *"
          inputMode="numeric"
          autoComplete="cc-number"
          aria-label="Card Number (required)"
        />
        <input
          className="rf-cardrow-input rf-cardrow-exp"
          value={expiry}
          onChange={(e) => onExpiry(e.target.value)}
          placeholder="MM / YY *"
          inputMode="numeric"
          autoComplete="cc-exp"
          aria-label="Card expiry, MM / YY (required)"
        />
        <input
          className="rf-cardrow-input rf-cardrow-cvv"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="CVV *"
          inputMode="numeric"
          autoComplete="cc-csc"
          aria-label="Card security code (required)"
        />
      </div>

      <FormField label="Name on Card" required value={name} onChange={setName} autoComplete="cc-name" />

      <div className="rf-pay-grid">
        <SelectField
          label="Billing Country" required value={country} onChange={setCountry}
          options={['United States', 'Canada']}
          state={country ? 'success' : 'default'}
        />
        <FormField label="Billing ZIP Code" required value={zip} onChange={setZip} autoComplete="postal-code" />
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
