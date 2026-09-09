// ===========================================================================
// The Make a Payment panel — Figma 8905-133037 (multi-space) and its
// single-space sibling 9030-31458.
//
// Reached from ANY unit's "Pay Now"; the sidebar card's "Account Info" button
// goes back. Every space with something outstanding is listed and SELECTED, so
// the default action pays the account off in full — which is what the balance
// bar then totals. Unticking a space drops it from that total.
//
// WHY EVERYTHING IS SELECTED even though only one unit's button was clicked:
// the frame draws it that way, and it is the kinder default — a tenant with
// three units who pays one and leaves two in arrears has not solved their
// problem. The per-space checkbox is there for the case where they genuinely
// mean to pay only some.
//
// Each space block is: checkbox + "#310 | address", the autopay strip
// (enrolled → card + Update/Cancel; not enrolled → "Enroll in Autopay"), then
// its charges and total.
// ===========================================================================

import { useMemo, useState } from 'react';
import { Checkbox, InfoIcon, ApplePayMark } from '@shared/ui';
import {
  BankIcon, ChevronBigRightIcon, CreditCardIcon, CreditCardRemoveIcon,
  CreditCardRepeatIcon, GooglePayLockup, MinusIcon, PlusIcon, ShieldSettingsIcon,
} from './icons';
import type { AccountSpace } from './data';

/**
 * "$123.00", "$ 1,234.50" → 123 / 1234.5. Returns 0 for anything unparseable
 * rather than NaN, which would poison the whole sum into "$NaN".
 */
function money(v: string): number {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Back to the way the design writes a total: "$350.00". */
function formatMoney(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function MakePaymentPanel({
  spaces, space,
}: {
  /** Every space with something outstanding — all listed, all selected. */
  spaces: AccountSpace[];
  /** The unit whose "Pay Now" was clicked. Only used as a fallback when no
   *  list is passed, so an older caller still renders. */
  space?: AccountSpace;
}) {
  const list = spaces.length ? spaces : space ? [space] : [];

  /* Everything selected on arrival — see the header note. A Set of ids rather
     than a flag per space, so the state does not have to be rebuilt when the
     list changes. */
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(list.map((s) => s.id)),
  );
  const [updateMethod, setUpdateMethod] = useState(false);
  const [prepay, setPrepay] = useState(false);
  const [autopayOptIn, setAutopayOptIn] = useState<Set<string>>(() => new Set());
  /* MOBILE ONLY (Figma 9007-22768). The billing breakdown collapses behind
     "Hide Billing Details" on a phone, where four money rows per space push the
     payment buttons off screen. Open by default — the frame shows it open, and
     hiding what someone owes by default would be the wrong way round. */
  const [billingOpen, setBillingOpen] = useState(true);
  /* The mobile balance box prepays by MONTHS, not just a yes/no. 1 is the
     minimum the stepper can reach: "prepay 0 months" is just not prepaying,
     which the checkbox already says. */
  const [prepayMonths, setPrepayMonths] = useState(1);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  /* The bar totals what is TICKED, so the figure always matches what the
     payment buttons would take. Falls back to the space's own printed balance
     when a total will not parse, so a formatting quirk cannot silently
     understate what is owed. */
  const balanceTotal = useMemo(
    () => list.filter((s) => selected.has(s.id))
      .reduce((sum, s) => sum + (money(s.total) || money(s.balance.amount)), 0),
    [list, selected],
  );
  const anyPastDue = list.some((s) => selected.has(s.id) && s.balance.pastDue);
  /* "Pay through" is per space; with several selected they can disagree, so the
     bar shows the FURTHEST date — that is what paying this total covers. */
  const payThrough = list.find((s) => selected.has(s.id))?.balance.payThrough ?? '';

  return (
    <section className="ma-pay">
      <h2 className="ma-pay__title">Make a Payment</h2>

      {list.map((sp) => {
        const on = selected.has(sp.id);
        return (
          <div className="ma-pay-space" key={sp.id}>
            {/* A CHECKBOX, not the radio the single-space frame had: several
                spaces can be paid at once, which a radio cannot express. */}
            <div className="ma-space-head">
              <Checkbox
                checked={on}
                onChange={() => toggle(sp.id)}
                className="ma-space-head__check"
              >
                <span className="ma-space-head__label">
                  <span className="ma-space-head__num">{sp.paymentNumber}</span>
                  <span className="ma-space-head__sep"> I </span>
                  <span className="ma-space-head__addr">{sp.paymentAddress}</span>
                </span>
              </Checkbox>
            </div>

            {sp.autopay.enrolled ? (
              <div className="ma-autopay">
                <div className="ma-autopay__left">
                  <div className="ma-autopay__head">
                    <CreditCardRepeatIcon />
                    <span className="ma-autopay__title">Enrolled in Autopay</span>
                  </div>
                  <div className="ma-autopay__detail">
                    <p>Charged to xxxx {sp.autopay.cardLast4}</p>
                    <p>{sp.autopay.schedule}</p>
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
            ) : (
              /* Not enrolled: the frame replaces the whole strip with a single
                 opt-in row, shorter than the enrolled one. */
              <div className="ma-autopay ma-autopay--offer">
                <Checkbox
                  checked={autopayOptIn.has(sp.id)}
                  onChange={() => setAutopayOptIn((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(sp.id)) next.add(sp.id);
                    return next;
                  })}
                  className="ma-autopay__check"
                >
                  <span className="ma-autopay__title">Enroll in Autopay</span>
                </Checkbox>
                <InfoIcon size={24} className="ma-autopay__info" />
              </div>
            )}

            <div className={`ma-lines${billingOpen ? '' : ' ma-lines--hidden'}`}>
              {sp.lines.map((line) => (
                <div className="ma-line" key={line.label}>
                  <p className="ma-line__label">
                    <span className="ma-line__strong">{line.label} </span>
                    {line.note && <span className="ma-line__note">{line.note}</span>}
                  </p>
                  <p className="ma-line__amount ma-line__amount--strong">{line.amount}</p>
                </div>
              ))}

              <div className="ma-line">
                <p className="ma-line__label ma-line__label--plain">{sp.coverage.label}</p>
                <div className="ma-line__right">
                  <button type="button" className="ma-link-row ma-link-row--tight">
                    <ShieldSettingsIcon />
                    <span className="ma-link">
                      <span className="ma-only-desktop">Change Coverage</span>
                      <span className="ma-only-mobile">Change</span>
                    </span>
                  </button>
                  <p className="ma-line__amount">{sp.coverage.amount}</p>
                </div>
              </div>

              <div className="ma-line">
                <p className="ma-line__label ma-line__label--plain">{sp.taxes.label}</p>
                <p className="ma-line__amount">{sp.taxes.amount}</p>
              </div>

              <div className="ma-line ma-line--total">
                <p className="ma-line__label ma-line__label--total">Total:</p>
                <p className="ma-line__amount ma-line__amount--total">{sp.total}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Mobile only — hidden by the stylesheet on desktop, where the frame has
          no such control and there is room for every row. */}
      <button
        type="button"
        className="ma-billing-toggle"
        aria-expanded={billingOpen}
        onClick={() => setBillingOpen((v) => !v)}
      >
        <span>{billingOpen ? 'Hide Billing Details' : 'Show Billing Details'}</span>
        <ChevronBigRightIcon className={`ma-billing-toggle__chev${billingOpen ? ' ma-billing-toggle__chev--up' : ''}`} />
      </button>

      <div className="ma-balance">
        <div className="ma-balance__left">
          <div className="ma-balance__heading">
            <span className="ma-balance__title">Balance Due</span>
            <InfoIcon size={16} className="ma-balance__info" />
          </div>
          <p className="ma-balance__through">{payThrough}</p>
        </div>

        <div className="ma-balance__prepay">
          <Checkbox checked={prepay} onChange={setPrepay} className="ma-balance__check">
            Prepay Additional Month(s)
          </Checkbox>

          {/* Only once prepay is on: a stepper for something you have not opted
              into is a control with nothing to control. */}
          {prepay && (
            <div className="ma-stepper">
              <button
                type="button"
                className="ma-stepper__btn"
                aria-label="One month fewer"
                onClick={() => setPrepayMonths((n) => Math.max(1, n - 1))}
              >
                <MinusIcon />
              </button>
              <button
                type="button"
                className="ma-stepper__btn"
                aria-label="One month more"
                onClick={() => setPrepayMonths((n) => n + 1)}
              >
                <PlusIcon />
              </button>
              <output className="ma-stepper__value">{prepayMonths}</output>
              <span className="ma-stepper__unit">Month(s)</span>
            </div>
          )}
        </div>

        <div className="ma-balance__right">
          <p className="ma-balance__amount">{formatMoney(balanceTotal)}</p>
          {anyPastDue && <p className="ma-balance__past">Past Due</p>}
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
