// ===========================================================================
// The Make a Payment panel — Figma 9030-31458 ("Screen after Login (1 Space)").
//
// Reached from the Account Info panel's "Pay Now"; the sidebar card's "Account
// Info" button goes back. Space header, autopay panel, the money lines, the
// past-due box and the four payment tiles.
// ===========================================================================

import { useState } from 'react';
import { Checkbox, InfoIcon, ApplePayMark } from '@shared/ui';
import {
  BankIcon, CreditCardIcon, CreditCardRemoveIcon, CreditCardRepeatIcon,
  GooglePayLockup, ShieldSettingsIcon,
} from './icons';
import type { AccountSpace } from './data';

export function MakePaymentPanel({ space }: { space: AccountSpace }) {
  /* The frame draws the space selected and "Prepay Additional Month(s)"
     unticked. Initial states, not fixed ones — the controls are real so the
     screen can be clicked through in the harness. */
  const [spaceSelected, setSpaceSelected] = useState(true);
  const [updateMethod, setUpdateMethod] = useState(false);
  const [prepay, setPrepay] = useState(false);

  return (
    <section className="ma-pay">
      <h2 className="ma-pay__title">Make a Payment</h2>

      {/* The radio picks WHICH space is being paid. With one space it is
          decorative; it is a real control because the frame is named
          "(1 Space)", implying a multi-space sibling. */}
      <div className="ma-space-head">
        <button
          type="button"
          role="radio"
          aria-checked={spaceSelected}
          className={`ma-radio${spaceSelected ? ' ma-radio--on' : ''}`}
          onClick={() => setSpaceSelected((v) => !v)}
        >
          <span className="ma-radio__dot" aria-hidden="true" />
          <span className="ma-sr-only">Pay space {space.paymentNumber}</span>
        </button>
        <p className="ma-space-head__label">
          <span className="ma-space-head__num">{space.paymentNumber}</span>
          <span className="ma-space-head__sep"> I </span>
          <span className="ma-space-head__addr">{space.paymentAddress}</span>
        </p>
      </div>

      <div className="ma-autopay">
        <div className="ma-autopay__left">
          <div className="ma-autopay__head">
            <CreditCardRepeatIcon />
            <span className="ma-autopay__title">
              {space.autopay.enrolled ? 'Enrolled in Autopay' : 'Not Enrolled in Autopay'}
            </span>
          </div>
          <div className="ma-autopay__detail">
            <p>Charged to xxxx {space.autopay.cardLast4}</p>
            <p>{space.autopay.schedule}</p>
          </div>
        </div>
        <div className="ma-autopay__actions">
          <Checkbox checked={updateMethod} onChange={setUpdateMethod} className="ma-autopay__check">
            Update Payment Method
          </Checkbox>
          <button type="button" className="ma-link-row">
            <CreditCardRemoveIcon />
            <span className="ma-link">Cancel Autopay</span>
          </button>
        </div>
      </div>

      <div className="ma-lines">
        {space.lines.map((line) => (
          <div className="ma-line" key={line.label}>
            <p className="ma-line__label">
              <span className="ma-line__strong">{line.label} </span>
              {line.note && <span className="ma-line__note">{line.note}</span>}
            </p>
            <p className="ma-line__amount ma-line__amount--strong">{line.amount}</p>
          </div>
        ))}

        <div className="ma-line">
          <p className="ma-line__label ma-line__label--plain">{space.coverage.label}</p>
          <div className="ma-line__right">
            <button type="button" className="ma-link-row ma-link-row--tight">
              <ShieldSettingsIcon />
              <span className="ma-link">Change Coverage</span>
            </button>
            <p className="ma-line__amount">{space.coverage.amount}</p>
          </div>
        </div>

        <div className="ma-line">
          <p className="ma-line__label ma-line__label--plain">{space.taxes.label}</p>
          <p className="ma-line__amount">{space.taxes.amount}</p>
        </div>

        <div className="ma-line ma-line--total">
          <p className="ma-line__label ma-line__label--total">Total:</p>
          <p className="ma-line__amount ma-line__amount--total">{space.total}</p>
        </div>
      </div>

      <div className="ma-balance">
        <div className="ma-balance__left">
          <div className="ma-balance__heading">
            <span className="ma-balance__title">Balance Due</span>
            <InfoIcon size={16} className="ma-balance__info" />
          </div>
          <p className="ma-balance__through">{space.balance.payThrough}</p>
        </div>

        <Checkbox checked={prepay} onChange={setPrepay} className="ma-balance__check">
          Prepay Additional Month(s)
        </Checkbox>

        <div className="ma-balance__right">
          <p className="ma-balance__amount">{space.balance.amount}</p>
          {space.balance.pastDue && <p className="ma-balance__past">Past Due</p>}
        </div>
      </div>

      {/* 2×2. Not the kit <Button/>: these are 64px tiles with a 12px radius
          and a 20px label, which is a different control, not a restyled one. */}
      <div className="ma-methods">
        <button type="button" className="ma-method ma-method--dark">
          <GooglePayLockup />
        </button>
        <button type="button" className="ma-method ma-method--dark">
          <span className="ma-applepay" role="img" aria-label="Apple Pay">
            <ApplePayMark />
          </span>
        </button>
        <button type="button" className="ma-method ma-method--outline">
          <CreditCardIcon />
          <span>Credit / Debit</span>
        </button>
        <button type="button" className="ma-method ma-method--outline">
          <BankIcon />
          <span>Pay by Bank</span>
        </button>
      </div>
    </section>
  );
}
