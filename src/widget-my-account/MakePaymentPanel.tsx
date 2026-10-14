// ===========================================================================
// The Make a Payment panel — Figma 8905-133037 (multi-space) and its
// single-space sibling 9030-31458.
//
// Reached from ANY unit's "Pay Now"; the sidebar card's "Account Info" button
// goes back. Every space at that unit's PROPERTY is listed, each with a tick,
// so the tenant can pay several at once or just one; the balance bar totals
// what is ticked. The unit clicked and any space that owes something start
// ticked — a tenant with three units who pays one and leaves two in arrears
// has not solved their problem — and a paid-up neighbour starts unticked.
//
// Each space block is: checkbox + "#310 | address", the autopay strip, then
// its charges and total.
//
// THE AUTOPAY STRIP HAS FOUR STATES (Figma 12239-45881), and they are one
// card in two shapes rather than four separate designs:
//
//   not enrolled  an empty "Autopay Enrollment" checkbox, nothing else.
//   enrolled      the card it is charged to and when, plus Update Payment
//                 Method and Cancel Autopay.
//   updating      enrolled with Update Payment Method ticked — the same card
//                 with the charged-to lines replaced by what will change.
//   cancelled     enrolled, then Cancel Autopay — back to the empty checkbox,
//                 with a Guidance-blue notice under it. Ticking the box again
//                 re-enrols, which is the undo the notice's wording implies.
//
// STATE IS PER SPACE, held as sets of space ids. A tenant can be enrolled on
// one space and not another (the sample data is exactly that), so a single
// flag would tie every strip to whichever space was last clicked.
//
// EVERY SPACE REACHES EVERY STATE, whichever one it starts in. `autopay.enrolled`
// is only the OPENING position: ticking Autopay Enrollment on a space that
// arrived unenrolled moves it to the enrolled card, exactly as Cancel Autopay
// moves an enrolled one back. A space that starts unenrolled has no card on
// file, so its enrolled card reads "Autopay will be updated to the payment
// method used in this transaction" — which is what enrolling during a payment
// actually means — and it has no Update Payment Method tick, because there is
// no stored method to replace.
//
// None of it persists — there is no account API yet, so cancelling and
// re-enrolling live only in this component, like every other control here.
//
// CREDIT / DEBIT AND PAY BY BANK OPEN #99's OWN FORMS. They are imported, not
// reproduced: a tenant paying a bill and a shopper renting a space are filling
// in the same card and the same bank account, and a second copy here would be
// a second place for those fields, their validation and their error messages
// to drift. #18 already reaches into #05's api.ts the same way.
//
// The card form falls back to plain inputs when it is handed no Global
// Payments key, which is what happens here — #19 has no config.json and makes
// no API calls. That is the form's own documented behaviour, not a special
// case added for this panel.
// ===========================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoveragePlan, LeaseCoverage, LeasePaymentMethod, LeasePaymentReceipt, LeasePaymentRequest, PrepayQuote } from '@shared/accountApi';
import { Button, Checkbox, InfoIcon, ApplePayMark } from '@shared/ui';
import { BankForm, CardForm, PaymentFormSkeleton, type CardFormValue } from '@shared/paymentForms';
import {
  BankIcon, ChevronBigLeft24Icon, ChevronBigRight24Icon, CreditCardIcon, CreditCardRemoveIcon,
  CreditCardRepeatIcon, GooglePayLockup, InfoFilledIcon, InfoNoticeIcon,
  MinusIcon, PlusIcon, ShieldSettingsIcon,
} from './icons';
import { AUTOPAY_CANCELLED_NOTE, AUTOPAY_UPDATE_NOTE, COVERAGE_OPTIONS, PAYMENT_RECEIPT_DEMO } from './data';
import { PaymentResult, type PaymentOutcome } from './PaymentResult';
import { CoverageMenu } from './CoverageMenu';
import type { AccountSpace, PaymentReceipt, SavedCard } from './data';

/** Skeleton beat before a payment form appears (Figma 8507-24610). Same 700ms
 *  as #99's step 2, so the two screens feel like one product. */
const FORM_SKELETON_MS = 700;

/**
 * "$123.00", "$ 1,234.50" → 123 / 1234.5. Returns 0 for anything unparseable
 * rather than NaN, which would poison the whole sum into "$NaN".
 */
/**
 * What MyAccount gives the panel to take a real payment.
 *
 * `gpPublicKey` is the Global Payments public key for the listed spaces'
 * PROPERTY (every space on the panel is at one property): a string mounts
 * the hosted card fields, '' means the facility takes no card online and the
 * card option is replaced by a notice, undefined means the lookup is still
 * out. The account payments API takes a hosted-field TOKEN or a saved method
 * — never card digits — so there is no plain-input fallback here on purpose.
 */
export interface PaymentHandlers {
  gpPublicKey: string | undefined;
  gatewayPending: boolean;
  /** Cards on file at this property, for one-tap "saved" payments. */
  savedCards: SavedCard[];
  pay: (leaseId: string, body: LeasePaymentRequest, idempotencyKey: string) =>
    Promise<{ ok: true; receipt: LeasePaymentReceipt } | { ok: false; message: string }>;
  /** What N months ahead would cost on a lease — the figure the prepay sends. */
  quotePrepay: (leaseId: string, months: number) => Promise<PrepayQuote | null>;
}

/** What MyAccount gives the panel to talk to the coverage endpoints. */
export interface CoverageHandlers {
  load: (leaseId: string) => Promise<LeaseCoverage | null>;
  preview: (leaseId: string, insuranceId: string) => Promise<{ ok: true; plan: CoveragePlan } | { ok: false; message: string }>;
  apply: (leaseId: string, insuranceId: string) => Promise<{ ok: true; coverage: LeaseCoverage } | { ok: false; message: string }>;
}

/** "Nov 1, 2026" from the API's "2026-11-01"; the raw value if it is not one. */
function longDate(v: string | undefined): string {
  const s = (v ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return v ?? '';
  const [y, m, d] = s.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function money(v: string): number {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Back to the way the design writes a total: "$350.00". */
function formatMoney(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * A money STRING multiplied.
 *
 * The charge lines are pre-formatted in data.ts, and the frame writes some of
 * them "$ 100.00" and others "$123.00"; re-formatting from the number alone
 * would quietly normalise that away, so the space is put back where the
 * original had one. A factor of 1 returns the string untouched rather than
 * round-tripping it, which is what keeps the default view byte-identical.
 */
function scaleMoney(v: string, factor: number): string {
  if (factor === 1) return v;
  const n = money(v);
  if (!n) return v;
  const out = formatMoney(n * factor);
  return /\$\s/.test(v) ? out.replace('$', '$ ') : out;
}

/**
 * `id` flipped in or out of a set, as a NEW set — mutating and returning the
 * same object would be the same reference and React would not re-render.
 */
function flip(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (!next.delete(id)) next.add(id);
  return next;
}

export function MakePaymentPanel({
  spaces, space, onBack, initialResult = null, coverage, payment,
}: {
  /**
   * Open on a payment result rather than the bare form — the harness uses it
   * to show both banners. Otherwise the result comes from paying.
   */
  initialResult?: PaymentOutcome | null;
  /**
   * The lease's REAL protection plans, when there is a session to read them
   * with (MyAccount supplies these; the harness and the editor do not, and
   * the static COVERAGE_OPTIONS stand in). load → the drop-down's rows;
   * preview → the priced plan the tenant confirms; apply → the change.
   */
  coverage?: CoverageHandlers;
  /**
   * The REAL payment path, when there is a session (MyAccount supplies it).
   * Without it every "Pay Now" is the static demo: the result banner shows the
   * sample receipt and nothing is charged.
   */
  payment?: PaymentHandlers;
  /** Every space with something outstanding — all listed, all selected. */
  spaces: AccountSpace[];
  /** The unit whose "Pay Now" was clicked. Only used as a fallback when no
   *  list is passed, so an older caller still renders. */
  space?: AccountSpace;
  /**
   * Back to Account Info. Optional: without it the control is not drawn at
   * all, rather than drawn and inert — a back arrow that does nothing is worse
   * than no back arrow. A sidebar unit's "Account Info" button is still the
   * other way out, as it was before this existed.
   */
  onBack?: () => void;
}) {
  const list = spaces.length ? spaces : space ? [space] : [];

  /* Ticked on arrival: the unit whose Pay Now was pressed, plus any listed
     space that owes something — paying one and leaving a neighbour in arrears
     solves nothing, which is why those start ticked. A paid-up neighbour
     starts unticked: it is listed so it CAN be paid (prepaid) alongside, not
     because the tenant asked to. A Set of ids rather than a flag per space, so
     the state does not have to be rebuilt when the list changes. */
  const shouldStartTicked = (s: AccountSpace) => s.id === space?.id || money(s.balance.amount) > 0;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(list.filter(shouldStartTicked).map((s) => s.id)),
  );
  /*
   * The list can CHANGE under the panel: it is the landing view for a signed-in
   * customer now, so it mounts on the sample spaces and the real ones arrive
   * a moment later — and a tick seeded once, from the first list, left every
   * real space unticked. Spaces seen for the first time get the opening rule;
   * spaces the tenant has already decided about keep their decision; spaces
   * that have gone are dropped. `seen` is what tells a new arrival from a
   * deliberate untick.
   */
  const seen = useRef<Set<string>>(new Set(list.map((s) => s.id)));
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const s of list) {
        if (seen.current.has(s.id) ? prev.has(s.id) : shouldStartTicked(s)) next.add(s.id);
      }
      seen.current = new Set(list.map((s) => s.id));
      return next;
    });
    // listKey (below) stands in for `list`; shouldStartTicked reads live props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((s) => s.id).join('|'), space?.id]);
  const [prepay, setPrepay] = useState(false);
  /* The three autopay sets — see the header note on why each is per space and
     not a flag. All start empty: the strip's opening state comes from the
     space's own `autopay.enrolled`, and these record what the tenant has
     changed since. `cancelled` wins over both, so turning autopay off always
     turns it off no matter which way the space arrived. */
  const [updateMethod, setUpdateMethod] = useState<Set<string>>(() => new Set());
  const [cancelled, setCancelled] = useState<Set<string>>(() => new Set());
  const [enrolledNow, setEnrolledNow] = useState<Set<string>>(() => new Set());

  /** Drop one id from a set — the half of `flip` that is not a toggle. */
  const clearFor = (
    set: (fn: (prev: Set<string>) => Set<string>) => void,
  ) => (id: string) => set((prev) => {
    if (!prev.has(id)) return prev;
    const next = new Set(prev);
    next.delete(id);
    return next;
  });
  const clearUpdateMethod = clearFor(setUpdateMethod);
  /* MOBILE ONLY (Figma 9038-78423 closed, 9038-78569 open). On a phone the
     screen opens as a LIST — one line per space, number, address and amount —
     so the tenant can pick what to pay without scrolling past four money rows
     and an autopay strip each. "Show Billing Details" opens all of that.
     Closed by default because that list is the point of the mobile frame; the
     amount owed is still on every row, so nothing is hidden that decides
     whether to tick a space. Desktop ignores this entirely — the stylesheet
     only honours it under 720px, where the frame has the control. */
  const [billingOpen, setBillingOpen] = useState(false);
  // Chosen coverage plan per space (static — see CoverageMenu.tsx). Unset
  // means "the current plan", found by matching the coverage line's monthly
  // amount to an option's price.
  const [coverageChoice, setCoverageChoice] = useState<Record<string, string>>({});
  const currentCoverage = (sp: AccountSpace): string | null =>
    coverageChoice[sp.id]
    ?? COVERAGE_OPTIONS.find((o) => o.price && money(o.price) === money(sp.coverage.amount))?.id
    ?? null;

  /* ── LIVE coverage, when `coverage` handlers are supplied ────────────────
     One read per listed space on arrival (the lease id IS the space id), so
     the drop-down opens on the real plans rather than fetching on click. A
     pick is a PREVIEW first — the API prices it and says when it would start
     — and nothing changes until the tenant confirms; then apply, and the
     reply (the GET shape, with the plan under `scheduled`) replaces what was
     read. A refusal shows the proxy's own sentence under the line: it names
     the reason (a lower plan, a plan not offered) better than we could. */
  const [liveCoverage, setLiveCoverage] = useState<Record<string, LeaseCoverage | 'loading' | 'failed'>>({});
  const [pendingPlan, setPendingPlan] = useState<Record<string, CoveragePlan | undefined>>({});
  const [coverageBusy, setCoverageBusy] = useState<Record<string, 'preview' | 'apply' | undefined>>({});
  const [coverageNote, setCoverageNote] = useState<Record<string, { kind: 'ok' | 'error'; text: string } | undefined>>({});
  const listKey = list.map((s) => s.id).join('|');
  useEffect(() => {
    if (!coverage) return undefined;
    let cancelled = false;
    for (const sp of list) {
      setLiveCoverage((prev) => (prev[sp.id] ? prev : { ...prev, [sp.id]: 'loading' }));
      void coverage.load(sp.id).then((cov) => {
        if (cancelled) return;
        setLiveCoverage((prev) => ({ ...prev, [sp.id]: cov ?? 'failed' }));
      });
    }
    return () => { cancelled = true; };
    // listKey stands in for `list`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverage, listKey]);

  const liveFor = (sp: AccountSpace): LeaseCoverage | null => {
    const v = liveCoverage[sp.id];
    return v && v !== 'loading' && v !== 'failed' ? v : null;
  };
  /* The drop-down's rows from the API: a plan the API will not move to is
     listed but disabled — the tenant can see what exists and why the row is
     grey — and the row already scheduled is the highlighted one. */
  const liveOptions = (cov: LeaseCoverage) => cov.options.map((o) => ({
    id: o.id,
    label: o.name,
    price: `$${o.monthlyPremium}/mo`,
    disabled: !o.upgradable && o.id !== cov.scheduled?.insuranceId,
  }));
  const liveValue = (cov: LeaseCoverage): string | null =>
    cov.scheduled?.insuranceId ?? cov.current?.insuranceId ?? null;
  const setNote = (id: string, note: { kind: 'ok' | 'error'; text: string } | undefined) =>
    setCoverageNote((prev) => ({ ...prev, [id]: note }));
  const pickPlan = async (sp: AccountSpace, insuranceId: string) => {
    if (!coverage) return;
    setNote(sp.id, undefined);
    setPendingPlan((prev) => ({ ...prev, [sp.id]: undefined }));
    setCoverageBusy((prev) => ({ ...prev, [sp.id]: 'preview' }));
    const r = await coverage.preview(sp.id, insuranceId);
    setCoverageBusy((prev) => ({ ...prev, [sp.id]: undefined }));
    if (r.ok) setPendingPlan((prev) => ({ ...prev, [sp.id]: r.plan }));
    else setNote(sp.id, { kind: 'error', text: r.message });
  };
  const confirmPlan = async (sp: AccountSpace) => {
    const plan = pendingPlan[sp.id];
    if (!coverage || !plan) return;
    setCoverageBusy((prev) => ({ ...prev, [sp.id]: 'apply' }));
    const r = await coverage.apply(sp.id, plan.insuranceId);
    setCoverageBusy((prev) => ({ ...prev, [sp.id]: undefined }));
    setPendingPlan((prev) => ({ ...prev, [sp.id]: undefined }));
    if (r.ok) {
      setLiveCoverage((prev) => ({ ...prev, [sp.id]: r.coverage }));
      const sch = r.coverage.scheduled;
      setNote(sp.id, { kind: 'ok', text: sch
        ? `Done — ${sch.name} ($${sch.monthlyPremium}/mo) starts ${longDate(sch.startDate)}.`
        : 'Done — your coverage has been updated.' });
    } else setNote(sp.id, { kind: 'error', text: r.message });
  };
  /* The mobile balance box prepays by MONTHS, not just a yes/no. 1 is the
     minimum the stepper can reach: "prepay 0 months" is just not prepaying,
     which the checkbox already says. */
  const [prepayMonths, setPrepayMonths] = useState(1);
  /* Which payment form is expanded, and the skeleton beat before it appears —
     both mirror #99's step 2, because they drive the same two forms. */
  const [payMethod, setPayMethod] = useState<'card' | 'bank' | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const toggle = (id: string) => setSelected((prev) => flip(prev, id));

  /* The bar totals what is TICKED, so the figure always matches what the
     payment buttons would take. Falls back to the space's own printed balance
     when a total will not parse, so a formatting quirk cannot silently
     understate what is owed. */
  /* PREPAYING N MONTHS MULTIPLIES WHAT IS OWED. Rent, coverage and tax are all
     monthly charges, so N additional months is N more of each — which is why
     the whole breakdown scales and not just the bottom line. Unticked is x1,
     the month already due; ticked at 1 is x2, that month plus one more.
     The frames show the control but not the arithmetic behind it, so this is
     the reading, stated here rather than buried in the render. */
  const monthsFactor = payment ? 1 : (prepay ? 1 + prepayMonths : 1);

  /*
   * LIVE PREPAY. The arithmetic above is the sample's: it scales the printed
   * breakdown. A real lease is priced by the proxy — tax and fees ride on the
   * rent — so each selected space is QUOTED for the chosen months (debounced
   * behind the stepper) and the quote's total is what the line, the bar and
   * the payment all use. 'loading' while out, 'failed' when the quote could
   * not be had, and Pay says so rather than guessing a figure.
   */
  const [prepayQuotes, setPrepayQuotes] = useState<Record<string, PrepayQuote | 'loading' | 'failed'>>({});
  /* STRING keys, not the arrays: `list` is rebuilt on every render and
     `selected` is a Set, so keying the effect on them re-ran it each render,
     reset every quote to 'loading' and dropped the replies as cancelled. */
  const selectedKey = [...selected].sort().join('|');
  useEffect(() => {
    if (!payment || !prepay) { setPrepayQuotes({}); return undefined; }
    const ids = selectedKey ? selectedKey.split('|') : [];
    setPrepayQuotes(Object.fromEntries(ids.map((id) => [id, 'loading' as const])));
    let cancelled = false;
    const t = window.setTimeout(() => {
      ids.forEach((id) => {
        void payment.quotePrepay(id, prepayMonths)
          .then((q) => { if (!cancelled) setPrepayQuotes((prev) => ({ ...prev, [id]: q ?? 'failed' })); });
      });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(t); };
    // `payment` is rebuilt by its parent on unrelated state; its quotePrepay is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!payment, prepay, prepayMonths, listKey, selectedKey]);
  const prepayQuoteFor = (sp: AccountSpace): PrepayQuote | null => {
    const q = prepayQuotes[sp.id];
    return q && q !== 'loading' && q !== 'failed' ? q : null;
  };
  const prepayAmount = (sp: AccountSpace): number => prepayQuoteFor(sp)?.total ?? 0;

  const balanceTotal = useMemo(
    () => list.filter((s) => selected.has(s.id))
      .reduce((sum, s) => sum + (money(s.total) || money(s.balance.amount)) * monthsFactor + prepayAmount(s), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, selected, monthsFactor, prepayQuotes],
  );
  const anyPastDue = list.some((s) => selected.has(s.id) && s.balance.pastDue);

  /** A card/bank panel is open, so its tile is replaced by the panel and the
   *  other method relocates beneath it. Wallets are one-tap and never expand. */
  const methodOpen = payMethod === 'card' || payMethod === 'bank';

  const selectMethod = (m: 'card' | 'bank') => {
    const next = payMethod === m ? null : m;
    setPayMethod(next);
    if (next) {
      setFormLoading(true);
      window.setTimeout(() => setFormLoading(false), FORM_SKELETON_MS);
    }
  };

  /* No account-payment API exists yet — this widget is still entirely static
     (see data.ts), so "Pay Now" collapses the form rather than pretending to
     charge anything. The forms hand back a fully validated CardFormValue, so
     the only thing missing here is the call. */
  /* AFTER A PAYMENT (12949-90476 / 12950-91405) the panel stays where it is:
     a result banner goes on top, the heading becomes "Upcoming Payment", and
     the spaces and methods below are what is due NEXT. STATIC — every payment
     "succeeds" with PAYMENT_RECEIPT_DEMO; the real call decides between
     'success' and 'failed', and the receipt comes from its response. */
  const [result, setResult] = useState<PaymentOutcome | null>(initialResult);
  const panelRef = useRef<HTMLElement>(null);
  const pay = () => {
    setPayMethod(null);
    setResult('success');
    // The banner is at the top, the button that was pressed at the bottom.
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── LIVE payment ────────────────────────────────────────────────────────
     ONE CALL PER TICKED SPACE: the API posts a payment against a lease and
     that lease's invoices, so the panel's total is split back into the
     per-lease sums it was built from. A new card is a single-use token: it
     pays the first space with `saveToAccount` when more follow, and the rest
     are paid as that saved method — if the reply does not name one, the run
     stops there and says exactly which spaces are still unpaid, rather than
     sending the same token twice to be refused. The idempotency key is made
     once per lease per attempt and kept until that lease is paid, so a retry
     after a dropped connection cannot charge it twice. */
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [payMessage, setPayMessage] = useState<string>('');
  const idemKeys = useRef<Map<string, string>>(new Map());
  /* The proxy accepts 8–128 of letters, digits, - and _ ONLY. The step key
     carries ':' (lease:prepay:months), which it refused with
     "Idempotency-Key must be 8-128 letters, digits, - or _" (2026-10-14), so
     anything else becomes '-' before it goes on the wire. */
  const idemKeyFor = (stepKey: string) => {
    let k = idemKeys.current.get(stepKey);
    if (!k) {
      k = `pay-${stepKey}-${Date.now().toString(36)}`.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 128);
      idemKeys.current.set(stepKey, k);
    }
    return k;
  };
  const autopayFor = (sp: AccountSpace) =>
    !cancelled.has(sp.id) && (enrolledNow.has(sp.id) || updateMethod.has(sp.id));
  const finishPayment = (outcome: PaymentOutcome, r: PaymentReceipt | null, message: string) => {
    setReceipt(r);
    setPayMessage(message);
    setPayMethod(null);
    setResult(outcome);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const payLive = async (card?: CardFormValue, saved?: SavedCard) => {
    if (!payment || paying) return;
    /*
     * One STEP per thing to pay: a space's open invoices, and — with prepay
     * on — its prepay, each its own call (the API takes `invoices` or
     * `prepayMonths`, and the prepay's amount is the quote's). A space can
     * contribute both. The order is invoices first, so what is owed is
     * settled before anything is paid ahead.
     */
    type Step = { sp: AccountSpace; body: Omit<LeasePaymentRequest, 'paymentMethod'>; label: string; key: string };
    const steps: Step[] = [];
    for (const sp of list.filter((s) => selected.has(s.id))) {
      if (sp.openInvoices.length > 0) {
        const invoices = sp.openInvoices.map((i) => ({ id: i.id, amount: i.amount }));
        const amount = Math.round(invoices.reduce((n, i) => n + i.amount, 0) * 100) / 100;
        steps.push({ sp, body: { amount, invoices }, label: sp.paymentNumber, key: sp.id });
      }
      if (prepay) {
        const q = prepayQuotes[sp.id];
        if (!q || q === 'loading') { finishPayment('failed', null, 'The prepay amount is still being calculated. Please try again in a moment.'); return; }
        if (q === 'failed') { finishPayment('failed', null, `We could not price the prepay for ${sp.paymentNumber}. Please try again.`); return; }
        steps.push({ sp, body: { amount: q.total, prepayMonths: q.months }, label: `${sp.paymentNumber} prepay`, key: `${sp.id}:prepay:${q.months}` });
      }
    }
    if (steps.length === 0) {
      finishPayment('failed', null, 'There is nothing outstanding on the selected space(s) to pay. Tick "Prepay Additional Month(s)" to pay ahead.');
      return;
    }
    if (!saved && !card?.token) {
      // Plain inputs would mean a card number in this bundle, which the API
      // does not take and this page must never hold.
      finishPayment('failed', null, 'Card payments need the secure card fields, which did not load. Please refresh and try again.');
      return;
    }
    setPaying(true);
    let savedId = saved?.id ?? '';
    let paidTotal = 0;
    let last: LeasePaymentReceipt | undefined;
    const paid: Step[] = [];
    let failure = '';
    for (const step of steps) {
      const method: LeasePaymentMethod = savedId
        ? { type: 'saved', id: savedId }
        : { type: 'hosted-card', token: card!.token!, zip: card!.zip, saveToAccount: steps.length > 1, autopay: autopayFor(step.sp) };
      const r = await payment.pay(step.sp.id, { ...step.body, paymentMethod: method }, idemKeyFor(step.key));
      if (!r.ok) { failure = r.message; break; }
      idemKeys.current.delete(step.key);
      paidTotal += step.body.amount; last = r.receipt; paid.push(step);
      if (!savedId && paid.length < steps.length) {
        if (r.receipt.savedPaymentMethodId) savedId = r.receipt.savedPaymentMethodId;
        else { failure = 'The card could only be charged once in this session. Please pay the remaining item(s) separately.'; break; }
      }
    }
    setPaying(false);
    const last4 = saved?.last4 || (card?.maskedCardNumber ?? '').replace(/\D/g, '').slice(-4);
    const summary: PaymentReceipt = {
      number: last?.number || '—',
      amount: formatMoney(paidTotal),
      method: last?.method || (last4 ? `xxxx ${last4}` : '—'),
    };
    if (!failure) { finishPayment('success', summary, ''); return; }
    if (paid.length) {
      const unpaid = steps.filter((s) => !paid.includes(s)).map((s) => s.label).join(', ');
      finishPayment('failed', summary, `${paid.map((s) => s.label).join(', ')} paid (${summary.amount}). Not paid: ${unpaid}. ${failure}`);
    } else finishPayment('failed', null, failure);
  };
  const bankNotLive = () =>
    finishPayment('failed', null, 'Bank payments are not available online yet. Please pay by card, or contact the office.');
  const liveCardKey = payment?.gpPublicKey;
  const cardUnavailable = !!payment && !payment.gatewayPending && !liveCardKey;
  /* "Pay through" is per space; with several selected they can disagree, so the
     bar shows the FURTHEST date — that is what paying this total covers. */
  const payThrough = list.find((s) => selected.has(s.id))?.balance.payThrough ?? '';

  return (
    <section className={`ma-pay${result === 'success' ? ' ma-pay--result' : ''}`} ref={panelRef}>
      {result && <PaymentResult outcome={result} receipt={receipt ?? PAYMENT_RECEIPT_DEMO} message={payMessage || undefined} />}

      {/* Back arrow, then the title to its right. The heading keeps its own
          element and styling; only the row around it is new, so the title reads
          the same to a screen reader and in the document outline. */}
      <header className="ma-pay__head">
        {/* No back arrow on the result frames: the payment is done, and the
            sidebar's Account Info is still there. */}
        {onBack && result !== 'success' && (
          <button type="button" className="ma-pay__back" onClick={onBack} aria-label="Back to account info">
            <ChevronBigLeft24Icon />
          </button>
        )}
        {/* "Upcoming" only once something WAS paid: after a refusal the form
            below is still the payment to make, with the banner saying why. */}
        <h2 className="ma-pay__title">{result === 'success' ? 'Upcoming Payment' : 'Make a Payment'}</h2>
      </header>

      {list.map((sp) => {
        const on = selected.has(sp.id);
        /* Off beats on: a space is enrolled if it arrived that way OR was
           enrolled here, unless it has since been cancelled. One rule for
           both starting positions, so Cancel Autopay and the enrolment tick
           behave the same on every space. */
        const justCancelled = cancelled.has(sp.id);
        /* "Enrolled in Autopay" is what the ACCOUNT says — a card at this
           property with autopay on — never the tick alone. Ticking the box
           only ticks it: the enrolment goes out with the payment (`autopay`
           on the payment method), and the enrolled detail appears when the
           record comes back saying so. Changed 2026-10-14; it used to swap to
           the enrolled card the moment the box was ticked. */
        const enrolled = !justCancelled && sp.autopay.enrolled;
        /* The tick ALONE decides which copy shows, on every space. It used to
           also be forced on for a space with no card on file, which meant one
           space could read "will be updated" with no tick beside it while its
           neighbour had one — see the enrol handler for how that case is
           handled now instead. */
        const hasCardOnFile = Boolean(sp.autopay.cardLast4);
        const updating = enrolled && updateMethod.has(sp.id);
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
              {/* MOBILE ONLY. With the breakdown closed this is the only figure
                  on the row, and it is what the tick is deciding about — so the
                  list stays useful collapsed. The desktop frame has no such
                  column and the stylesheet hides it there. */}
              <span className="ma-space-head__amount">{scaleMoney(sp.total, monthsFactor)}</span>
            </div>

            {/* ONE disclosure, not two: the frame's closed state shows neither
                the autopay strip nor the money rows, so they open together. */}
            <div className={`ma-detail${billingOpen ? '' : ' ma-detail--hidden'}`}>
            {enrolled ? (
              <div className="ma-autopay">
                <div className="ma-autopay__left">
                  <div className="ma-autopay__head">
                    <CreditCardRepeatIcon />
                    <span className="ma-autopay__title">Enrolled in Autopay</span>
                  </div>
                  {/* The SAME slot, either way — ticking Update Payment Method
                      swaps what is charged today for what is about to change,
                      because once it is ticked the old card is no longer the
                      answer to "what pays this". */}
                  <div className="ma-autopay__detail">
                    {updating ? (
                      <p className="ma-autopay__updating">{AUTOPAY_UPDATE_NOTE}</p>
                    ) : (
                      <>
                        {/* Only when there IS one. A space enrolled during this
                            payment has no stored card, and "Charged to xxxx "
                            with nothing after it is worse than not saying it. */}
                        {hasCardOnFile && <p>Charged to xxxx {sp.autopay.cardLast4}</p>}
                        <p>{sp.autopay.schedule}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="ma-autopay__actions">
                  {/* On EVERY enrolled space. Two spaces enrolled the same way
                      must offer the same controls, or the one missing a tick
                      looks broken next to the one that has it. */}
                  <Checkbox
                    checked={updateMethod.has(sp.id)}
                    onChange={() => setUpdateMethod((prev) => flip(prev, sp.id))}
                    className="ma-autopay__check"
                  >
                    Update Payment Method
                  </Checkbox>
                  <button
                    type="button"
                    className="ma-link-row"
                    onClick={() => {
                      setCancelled((prev) => flip(prev, sp.id));
                      clearUpdateMethod(sp.id);
                    }}
                  >
                    <CreditCardRemoveIcon />
                    <span className="ma-link">Cancel Autopay</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Not enrolled — whether it never was or was just cancelled, the
                 strip is the same empty checkbox. Cancelling only adds the
                 notice beneath it and turns the card Guidance blue. */
              <div className={`ma-autopay ma-autopay--offer${justCancelled ? ' ma-autopay--cancelled' : ''}`}>
                <div className="ma-autopay__enroll">
                  {/* The box IS the enrolment control, so it never sits ticked
                      here: ticking it moves the space to the enrolled card and
                      this shape stops being rendered. Cancel Autopay is the
                      way back, on every space. */}
                  <Checkbox
                    checked={enrolledNow.has(sp.id)}
                    onChange={() => {
                      if (justCancelled) {
                        /* Re-enrol — the notice recommends staying enrolled, so
                           the box beneath it has to be the way back. Whatever
                           the space's starting position, dropping it out of
                           `cancelled` restores that. */
                        setCancelled((prev) => flip(prev, sp.id));
                        clearUpdateMethod(sp.id);
                      } else {
                        /* Enrol a space that arrived without autopay. With no
                           card on file the method can only be this payment's,
                           so the tick starts ON — the frame's "Update Autopay"
                           state exactly. It can still be turned off, and then
                           the space just shows its schedule. */
                        // Just the tick. This payment's method becomes the
                        // autopay card (autopayFor); nothing else changes here.
                        setEnrolledNow((prev) => flip(prev, sp.id));
                      }
                    }}
                    className="ma-autopay__check"
                  >
                    <span className="ma-autopay__enrollLabel">
                      Autopay Enrollment
                      <InfoFilledIcon className="ma-autopay__info" />
                    </span>
                  </Checkbox>
                </div>
                {justCancelled && (
                  <div className="ma-autopay__notice">
                    <InfoNoticeIcon className="ma-autopay__noticeIcon" />
                    <p>{AUTOPAY_CANCELLED_NOTE}</p>
                  </div>
                )}
              </div>
            )}

            <div className="ma-lines">
              {sp.lines.map((line) => (
                <div className="ma-line" key={`${line.label}|${line.note ?? ''}`}>
                  <p className="ma-line__label">
                    <span className="ma-line__strong">{line.label} </span>
                    {line.note && <span className="ma-line__note">{line.note}</span>}
                  </p>
                  <p className="ma-line__amount ma-line__amount--strong">{scaleMoney(line.amount, monthsFactor)}</p>
                </div>
              ))}

              {/* COVERAGE, only when there is some. Live, that is the lease's
                  current plan from the coverage read — while it is out, or when a
                  lease simply has no plan, no line is drawn: the account record
                  carries no coverage charge, so the mapped $0.00 was never a real
                  figure to print. The sample (no handlers) keeps its line. */}
              {(!coverage || !!liveFor(sp)?.current) && (<>
                <div className="ma-line">
                  <p className="ma-line__label ma-line__label--plain">{sp.coverage.label}</p>
                  <div className="ma-line__right">
                    {(() => {
                      const cov = liveFor(sp);
                      return (
                        <CoverageMenu
                          value={cov ? liveValue(cov) : currentCoverage(sp)}
                          options={cov ? liveOptions(cov) : undefined}
                          onChange={(o) => (cov
                            ? void pickPlan(sp, o.id)
                            : setCoverageChoice((prev) => ({ ...prev, [sp.id]: o.id })))}
                        >
                          <ShieldSettingsIcon />
                          <span className="ma-link">
                            <span className="ma-only-desktop">{coverageBusy[sp.id] === 'preview' ? 'Pricing…' : 'Change Coverage'}</span>
                            <span className="ma-only-mobile">{coverageBusy[sp.id] === 'preview' ? '…' : 'Change'}</span>
                          </span>
                        </CoverageMenu>
                      );
                    })()}
                    {/* The live plan's premium when it is known: the account record
                        carries no coverage charge of its own, so the mapped line
                        is $0.00 until the coverage read answers. */}
                    <p className="ma-line__amount">
                      {liveFor(sp)?.current
                        ? scaleMoney(formatMoney(liveFor(sp)!.current!.monthlyPremium), monthsFactor)
                        : scaleMoney(sp.coverage.amount, monthsFactor)}
                    </p>
                  </div>
                </div>
                {/* A change already on the books — from the record. Right after a
                    confirm the "Done —" note below says the same thing, so only
                    one of the two is shown. */}
                {liveFor(sp)?.scheduled && !pendingPlan[sp.id] && coverageNote[sp.id]?.kind !== 'ok' && (
                  <p className="ma-coverage-note">
                    Changes to {liveFor(sp)!.scheduled!.name} (${liveFor(sp)!.scheduled!.monthlyPremium}/mo) from {longDate(liveFor(sp)!.scheduled!.startDate)}.
                  </p>
                )}
                {/* The preview, waiting for a decision. Nothing has been sent. */}
                {pendingPlan[sp.id] && (
                  <div className="ma-coverage-confirm" role="group" aria-label="Confirm coverage change">
                    <p className="ma-coverage-confirm__text">
                      <strong>{pendingPlan[sp.id]!.name}</strong> — ${pendingPlan[sp.id]!.monthlyPremium}/mo, starting {longDate(pendingPlan[sp.id]!.startDate)}. Your current plan runs until then.
                    </p>
                    <div className="ma-coverage-confirm__actions">
                      <Button tone="dark" className="ma-btn-40" busy={coverageBusy[sp.id] === 'apply'} onClick={() => void confirmPlan(sp)}>
                        Confirm change
                      </Button>
                      <Button tone="dark" fill="outline" className="ma-btn-40" disabled={coverageBusy[sp.id] === 'apply'}
                        onClick={() => { setPendingPlan((prev) => ({ ...prev, [sp.id]: undefined })); setNote(sp.id, undefined); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {coverageNote[sp.id] && (
                  <p className={`ma-coverage-note${coverageNote[sp.id]!.kind === 'error' ? ' ma-coverage-note--error' : ''}`} role={coverageNote[sp.id]!.kind === 'error' ? 'alert' : 'status'}>
                    {coverageNote[sp.id]!.text}
                  </p>
                )}
              </>)}

              {/* LIVE PREPAY, as quoted for this space: the months and the date
                  it pays the lease through, and the proxy's total. */}
              {payment && prepay && selected.has(sp.id) && (
                <div className="ma-line">
                  <p className="ma-line__label ma-line__label--plain">
                    Prepay {prepayMonths} month{prepayMonths === 1 ? '' : 's'}
                    {prepayQuoteFor(sp)?.paidThrough && (
                      <span className="ma-line__note"> · paid through {prepayQuoteFor(sp)!.paidThrough}</span>
                    )}
                  </p>
                  <p className="ma-line__amount">
                    {prepayQuotes[sp.id] === 'loading' ? 'Calculating…'
                      : prepayQuotes[sp.id] === 'failed' ? 'Unavailable'
                        : formatMoney(prepayAmount(sp))}
                  </p>
                </div>
              )}
              <div className="ma-line">
                <p className="ma-line__label ma-line__label--plain">{sp.taxes.label}</p>
                <p className="ma-line__amount">{scaleMoney(sp.taxes.amount, monthsFactor)}</p>
              </div>

              <div className="ma-line ma-line--total">
                <p className="ma-line__label ma-line__label--total">Total:</p>
                <p className="ma-line__amount ma-line__amount--total">
                  {prepayAmount(sp) ? formatMoney(money(sp.total) + prepayAmount(sp)) : scaleMoney(sp.total, monthsFactor)}
                </p>
              </div>
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
        {/* The 24px export, not the 32px one scaled — both frames draw this
            chevron at 24, and a 32px stroke squeezed down is a thinner line
            than the one Payment Activity shows below it. */}
        <ChevronBigRight24Icon className={`ma-billing-toggle__chev${billingOpen ? ' ma-billing-toggle__chev--up' : ''}`} />
      </button>

      <div className="ma-balance">
        <div className="ma-balance__left">
          <div className="ma-balance__heading">
            <span className="ma-balance__title">Balance Due</span>
            <InfoIcon size={16} className="ma-balance__info" />
          </div>
          <p className="ma-balance__through">{payThrough}</p>
        </div>

        {/* Prepay: live, each ticked space is quoted for the months chosen
            (see prepayQuotes) and paid with its own prepay call. */}
        {(
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
        )}

        <div className="ma-balance__right">
          <p className="ma-balance__amount">{formatMoney(balanceTotal)}</p>
          {anyPastDue && <p className="ma-balance__past">Past Due</p>}
        </div>
      </div>

      {/* 2×2. Not the kit <Button/>: these are 64px tiles with a 12px radius
          and a 20px label, which is a different control, not a restyled one.

          Wallets always sit at the top. The two method tiles only share that
          grid while NEITHER is open — once one is, the open panel takes their
          place and the other method moves below it, exactly as #99's step 2
          does with the same forms. */}
      {/* Cards on file at this property — one tap, no form. Only live: the
          sample has none, and the frame's tiles below stay as they are. */}
      {payment && payment.savedCards.length > 0 && !methodOpen && (
        <div className="ma-saved">
          {payment.savedCards.map((c) => (
            <button
              type="button"
              key={c.id}
              className="ma-method ma-method--outline ma-saved__card"
              disabled={paying}
              onClick={() => void payLive(undefined, c)}
            >
              <CreditCardIcon />
              <span>{paying ? 'Paying…' : `Pay with ${c.cardType ? c.cardType.toUpperCase() : 'card'} xxxx ${c.last4}`}</span>
            </button>
          ))}
        </div>
      )}
      <div className="ma-methods">
        <button type="button" className="ma-method ma-method--dark">
          <GooglePayLockup />
        </button>
        <button type="button" className="ma-method ma-method--dark">
          <span className="ma-applepay" role="img" aria-label="Apple Pay">
            <ApplePayMark />
          </span>
        </button>
        {!methodOpen && (
          <>
            <button
              type="button"
              className="ma-method ma-method--outline"
              onClick={() => selectMethod('card')}
            >
              <CreditCardIcon />
              <span>Credit / Debit</span>
            </button>
            <button
              type="button"
              className="ma-method ma-method--outline"
              onClick={() => selectMethod('bank')}
            >
              <BankIcon />
              <span>Pay by Bank</span>
            </button>
          </>
        )}
      </div>

      {/* The forms are #99's, from `@shared/paymentForms` — same fields, same
          validation, same "Pay Now $X". Only the total differs: here it is the
          selected spaces' balance rather than a move-in cost. Preceded by the
          same skeleton beat (8507-24610) so the panel does not snap in. */}
      {methodOpen && (
        <section
          className="rf-method-panel ma-payform"
          aria-label={payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}
        >
          <header className="rf-method-panel-head">
            {payMethod === 'card' ? <CreditCardIcon /> : <BankIcon />}
            <span>{payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}</span>
          </header>

          {formLoading ? (
            <PaymentFormSkeleton rows={payMethod === 'bank' ? 3 : 2} />
          ) : payMethod === 'card' ? (
            cardUnavailable ? (
              /* No key ⇒ no hosted fields ⇒ no honest way to take a card. */
              <p className="ma-pay__notice" role="status">
                Card payments are not available online for this facility. Please contact the office to pay.
              </p>
            ) : (
              <CardForm
                total={balanceTotal}
                onPay={(v) => (payment ? void payLive(v) : pay())}
                busy={paying}
                gpPublicKey={liveCardKey}
                gatewayPending={payment?.gatewayPending}
                zipOnlyBilling={!!payment}
                /* The form will not submit without a billing country; the
                   account is a US tenant's. */
                defaultCountry="United States"
              />
            )
          ) : (
            <>
              {/* The account payments API takes a card token or a saved method
                  and nothing else yet. The tile stays — bank is on the way —
                  but on a live account it must say so before the details are
                  typed, and a "Pay Now" here cannot pretend to have paid. */}
              {payment && (
                <p className="ma-pay__notice" role="status">
                  Bank payments are coming soon and are not available online yet. Please pay by card for now.
                </p>
              )}
              <BankForm
                total={balanceTotal}
                onPay={() => (payment ? bankNotLive() : pay())}
                defaultCountry="United States"
              />
            </>
          )}
        </section>
      )}

      {/* The method NOT open, relocated below the panel — full width, since it
          no longer shares a row. */}
      {methodOpen && (
        <button
          type="button"
          className="ma-method ma-method--outline ma-method--alt"
          onClick={() => selectMethod(payMethod === 'card' ? 'bank' : 'card')}
        >
          {payMethod === 'card' ? <BankIcon /> : <CreditCardIcon />}
          <span>{payMethod === 'card' ? 'Pay by Bank' : 'Credit / Debit'}</span>
        </button>
      )}
    </section>
  );
}
