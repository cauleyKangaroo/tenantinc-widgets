import React, { useEffect, useRef, useState, useMemo , useId} from 'react';
import { CalendarIcon, FileArrowIcon, ChevronSolidIcon, InfoIcon, CreditCardIcon, BankIcon, GooglePayMark, ApplePayMark } from './icons';
import { PlanCoverageBody, ProtectionPlanModal } from './ProtectionPlanModal';
import { LeaseModal } from './LeaseModal';
import { RfCheckbox } from './RfCheckbox';
import {
  MilitaryFields, AltContactFields, VehicleFields,
  extraFieldProblems, EMPTY_EXTRA_FIELDS, type ExtraFieldValues,
} from './additionalInfo';
import { BankForm, CardForm, PaymentFormSkeleton, type CardFormValue, type BankFormValue, type BillingCountry } from '@shared/paymentForms';
// The protection-plan lightbox's styles (rf-pp-*) live here. Imported from Step2
// rather than the shell because Step2 is now the only screen that mounts it.
import './screens.css';
import { FormField, Button, isPossiblePhone, type FieldType, type PhoneCountry } from '@shared/ui';
import { splitBusinessName } from './businessName';
import { skipValidation } from '@shared/devBypass';
import creditCardRepeat from './assets/credit-card-repeat.svg';

// ---------------------------------------------------------------------------
// Rental Flow — step 2, "Secure your space now" (Figma 8507-23329).
// Contact form + selected move-in date, Protection Plan, Additional Info
// toggles, Rental Agreement (+ "I agree"), and Payment method selection.
// ---------------------------------------------------------------------------

/** How long the static payment form's skeleton shows before the form. */
const FORM_SKELETON_MS = 700;

/**
 * The lease body, rendered BOTH in the inline preview and in the "View
 * Document" lightbox — one definition, so the two can never disagree about
 * what the shopper is agreeing to.
 *
 * Static copy, because the documents API gives us a name/type/signed flag and
 * NO url (see LeaseDocument in api.ts) — there is nothing to embed yet. When a
 * document URL exists this becomes an <iframe>/<embed> and both surfaces get it
 * at once.
 */
function LeaseDocBody({ title }: { title?: string }) {
  return (
    <div className="rf2-doc-page">
      <p className="rf2-doc-title">{title ?? 'Self Storage Rental Agreement'}</p>
      <p className="rf2-doc-h">General Disclosures:</p>
      <p className="rf2-doc-p">
        This Rental Agreement is a month-to-month rental agreement which shall commence on the date of
        execution and shall terminate on the last day of the current month, and each and every month
        thereafter, unless notice is given ten (10) days prior to the end of the last month of tenancy by
        either party, subject to all terms and conditions hereafter stated.
      </p>
      <p className="rf2-doc-p">
        If Tenant elects to hold over or for any reason fails to remove his/her property from the Space after
        the term of this Agreement, then this Agreement shall be automatically renewed, on a month-to-month
        basis. In the event this Agreement is extended or renewed, it is expressly agreed that the covenants
        and terms of this Agreement shall remain in full force and effect.
      </p>
      <p className="rf2-doc-p">
        Tenant agrees to pay the monthly rent in advance on the first day of each month during the term of
        this Agreement. Rent is considered late if not received by the Owner within five (5) days.
      </p>
    </div>
  );
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const formatDate = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

// Label-above text field (empty state, grey border).
function FieldAbove({
  label, required, value, onChange, type = 'text', error, phoneCountry, valid,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: FieldType;
  /** Payment was attempted while this required field is empty/invalid. */
  error?: boolean;
  /** Opt in libphonenumber as-you-type formatting for a tel field. */
  phoneCountry?: PhoneCountry;
  /** Override the type-derived rule when a field validates differently. */
  valid?: boolean;
}) {
  const errorMsg = error
    ? type === 'email'
      ? 'Enter a valid email address'
      : type === 'tel'
        ? 'Enter a valid phone number'
        : `${label} is required`
    : undefined;

  /*
   * Green border + tick as soon as the value is good, matching the payment
   * panel (Figma 10080-28126).
   *
   * Derived here from the field's own TYPE rather than wired at each of the
   * ~20 call sites: the rules are the same ones the `required` list applies
   * (a real address for email, a possible number for tel, non-empty
   * otherwise), so deriving them once keeps the tick and the submit gate from
   * ever disagreeing. `valid` overrides it where a field needs a rule of its
   * own.
   *
   * Unlike the red state, this does NOT wait for a submit attempt —
   * confirmation is only useful while the shopper is still in the field.
   */
  const autoValid = type === 'email'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    : type === 'tel'
      ? isPossiblePhone(value, phoneCountry ?? 'US')
      : value.trim().length > 0;

  return (
    <FormField
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      error={errorMsg}
      phoneCountry={phoneCountry}
      state={!errorMsg && (valid ?? autoValid) ? 'success' : 'default'}
    />
  );
}

function Check({
  checked, onChange, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <RfCheckbox checked={checked} onChange={onChange}>
      {children}
    </RfCheckbox>
  );
}

/** The optional Additional Information sections, as the rental APIs want them. */
export interface RentalExtras {
  business: boolean;
  businessAddress?: string;
  businessFirst?: string;
  businessLast?: string;
  military: boolean;
  /** YYYY-MM-DD — the API's format, not the display one. */
  dateOfBirth?: string;
  altContact: boolean;
  altFirst?: string;
  altLast?: string;
  altPhone?: string;
  altEmail?: string;
  altAddress?: string;
  vehicle: boolean;
  vehicleType?: string;
}

/** Desktop pointer devices only — mirrored by a @media block in the CSS. */
const PLAN_HOVER_QUERY = '(min-width: 901px) and (hover: hover) and (pointer: fine)';

/** The four autopay treatments a property can be configured with. */
export type AutopayMode = 'default' | 'optional' | 'preselected' | 'fee';

/** The three billing periods the Payment Cycle card offers. */
export type PaymentCycle = 'monthly' | 'quarterly' | 'annual';

/*
 * Labels verbatim from the frame, in the frame's order.
 *
 * The frame also put "Save 10%" and "Save 15%" beside quarterly and annual.
 * Those are GONE: nothing in the API carries a discount for a billing period
 * — `payment_cycles` returns booleans and a `revert_payment_cycle` month count
 * and no rates at all — so the figures were frame copy being printed as if
 * they were this property's terms. Restore them when a real percentage has a
 * source, per property and per space type.
 */
const PAYMENT_CYCLES: Array<{ id: PaymentCycle; label: string }> = [
  { id: 'monthly',   label: 'Pay Monthly' },
  { id: 'quarterly', label: 'Pay Quarterly' },
  { id: 'annual',    label: 'Pay Annual' },
];

/** One Nokē key-share tier. */
export interface KeyShareOption { id: string; shares: number; price: string; }

/* No endpoint supplies these — the rental APIs carry nothing about key-shares
   — so the frame's single tier is the default and `keyShareOptions` is how an
   operator (or a later API) supplies more. Inventing a ladder of tiers here
   would be inventing prices. */
const DEFAULT_KEY_SHARES: KeyShareOption[] = [
  { id: 'ks-2', shares: 2, price: 'Included' },
];

/** Verbatim from 12285-189509, the card the Learn More reveals. */
const KEY_SHARE_BLURB = 'Keyshares let tenants securely share temporary or ongoing unit '
  + 'access with trusted people. Recipients receive a digital key by text, and access can '
  + 'be monitored or revoked at any time.';

export function Step2({
  moveIn, plans = [], leaseDocName, onEditDate, payNowTotal, onPaymentComplete,
  brochureUrl, onPlanChange, paying, payError, contact, gpPublicKey, autopayMode, paymentCycles, keyShareOptions,
  gatewayPending, zipOnlyBilling, defaultCountry, oneStep = false,
}: {
  moveIn: Date;
  /**
   * The content menu's `formType` radio, as a flag — the ONE thing that
   * differs between the two layouts.
   *
   * Off (`2step`, the default): the Additional Information checkboxes are
   * ticks only. What the shopper opted into travels to the post-purchase
   * screen, which opens the matching sections already ticked and asks for the
   * values there. Choosing here, filling there.
   *
   * On (`1step`): ticking one opens its fields immediately, and its required
   * fields then gate payment like any other. The post-purchase screen still
   * shows those sections afterwards — this moves where they are FIRST answered,
   * it does not remove them from anywhere.
   */
  oneStep?: boolean;
  /**
   * The property's autopay treatment, from Hummingbird. Unset shows a small
   * demo picker so all four can be reviewed — pass a value and it disappears.
   */
  autopayMode?: AutopayMode;
  /**
   * Which periods THIS property offers for THIS space type, from
   * `/properties?payment_cycles=true` matched on the unit's `unit_type_id`.
   * Storage and parking are configured separately — live on Storage Outlet -
   * COFFEE, storage offers all three while parking offers monthly alone.
   *
   * This ALONE decides whether the Payment Cycle card (Figma 12285-189429)
   * appears. There is deliberately no operator toggle beside it: the property
   * already answers the question in its own configuration, and a checkbox that
   * could only ever contradict it would let a facility advertise a term it
   * does not sell, or hide one it does.
   *
   * Empty ⇒ the property offers none and the card is hidden entirely.
   * Undefined ⇒ not known yet (the unit's type resolves with the quote, a beat
   * after first paint) and the card stays hidden until it is, so a period the
   * property does not sell is never briefly on screen.
   */
  paymentCycles?: PaymentCycle[];
  /** Nokē key-share tiers. Omitted → the frame's single "2 Key-shares —
   *  Included" row. */
  keyShareOptions?: KeyShareOption[];
  /** Protection plans to choose between, already narrowed to the space type
   *  being rented. Empty → the "confirmed at checkout" note, which now means
   *  the property has no coverage products configured for that type. */
  plans?: import('./api').ProtectionPlan[];
  /** Protection-plan brochure PDF for the "Learn More" lightbox. Absent → the
   *  modal's download button is inert rather than a dead link. */
  brochureUrl?: string;
  /** Lease template name from the documents API. */
  leaseDocName?: string;
  onEditDate: () => void;
  /** The chosen coverage id, or undefined for "I have my own insurance".
   *  Reported upward because the choice re-prices the move-in quote — it is not
   *  a display-only toggle. */
  onPlanChange?: (insuranceId: string | undefined) => void;
  /** Authoritative move-in total (hold-aware quote) — printed on the pay button. */
  payNowTotal?: number;
  /** Card tokenized — parent takes over (interstitial → confirmation). */
  onPaymentComplete?: (info: {
    firstName: string;
    /** Entered card + billing details. Present only on the static card path —
     *  the hosted-fields path never has card data to give. */
    card?: CardFormValue;
    /** Entered bank account + billing details, on the Pay by Bank path.
     *  Mutually exclusive with `card`. */
    bank?: BankFormValue;
    /** Step 2's own contact fields, which the shopper may have edited after
     *  step 1, so these win over the ones captured there. */
    contact?: { first: string; last: string; email: string; phone: string; businessName?: string };
    /** Autopay Enrollment checkbox. */
    autopay?: boolean;
    /** The Additional Information sections the shopper opened and filled.
     *  Only the ticked ones carry meaning — an unticked section's fields are
     *  whatever was typed before it was closed again. */
    extras?: RentalExtras;
  }) => void;
  /** What the shopper typed in step 1, used as the starting values here so they
   *  do not retype their own name and email one screen later. */
  contact?: { first: string; last: string; email: string; phone: string; business?: boolean; businessName?: string };
  /** Payment in flight — locks the pay button against a double charge. */
  paying?: boolean;
  /** Why the rental could not be completed. Shown by the payment panel so the
   *  shopper sees it next to the button they pressed, with their details still
   *  filled in. */
  payError?: string;
  /** Global Payments PUBLIC key — turns on hosted (iframe) card fields. */
  gpPublicKey?: string;
  /** The property's gateway is still being looked up, so which card form to
   *  draw is not yet known. The card row waits rather than guessing — swapping
   *  form mid-typing would throw away what the shopper had entered. */
  gatewayPending?: boolean;
  /** tenant_payments: the card panel asks for the billing ZIP only. */
  zipOnlyBilling?: boolean;
  /** Country both payment forms open their Billing Country select on, from the
   *  content menu's Country Default. Unset → no preselection. */
  defaultCountry?: BillingCountry;
}) {
  // Ticked when step 1 said this is a business rental, so the shopper does not
  // answer the same question twice and its fields open ready to fill.
  const [business, setBusiness] = useState(contact?.business ?? false);
  // Seeded from step 1. Initialisers, not props: these are editable fields, so
  // step 1 supplies the STARTING value and anything typed here wins from then
  // on — re-syncing on every render would fight the shopper's own edits.
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [first, setFirst] = useState(contact?.first ?? '');
  const [last, setLast] = useState(contact?.last ?? '');
  // The trading name, when renting as a business — replaces First + Last here
  // exactly as it does on step 1, so the answer carries across the Rent click.
  const [bizName, setBizName] = useState(contact?.businessName ?? '');
  const [military, setMilitary] = useState(false);
  // Off, like every other optional section. On, it opens five REQUIRED fields
  // (name, phone, email, address) that block the step until they are filled —
  // so defaulting it to checked made an optional section mandatory.
  const [altContact, setAltContact] = useState(false);
  const [vehicle, setVehicle] = useState(false);

  const [agree, setAgree] = useState(false);
  /* The values behind the three Additional Information ticks — collected here
     only when `oneStep` puts the fields on this screen. One object rather than
     fourteen useStates: they are written by one patch setter, read as one
     payload, and the shape is the shared module's. */
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>(EMPTY_EXTRA_FIELDS);
  const setExtra = (patch: Partial<ExtraFieldValues>) => setExtraFields((v) => ({ ...v, ...patch }));
  /**
   * Which autopay treatment this property uses.
   *
   *   default      always enrolled. No checkbox at all — the terms sit at the
   *                foot of the section and the pay button carries the consent
   *                ("Agree & Pay"). Figma 11940-18784.
   *   optional     an unticked checkbox and nothing else. 11940-18948's base.
   *   preselected  ticked, with a blue bar attached under it arguing for
   *                staying enrolled. 11940-18948.
   *   fee          unticked, with a separate blue box below stating the card
   *                processing fee. 11940-18880.
   *
   * Comes from the content panel's `enrollmentAutoCheck` radio, mapped in
   * RentalFlow2Step. Falling back to `optional` matches that radio's own
   * default, so an instance saved before the field existed behaves as it did.
   */
  const mode: AutopayMode = autopayMode ?? 'optional';

  /* PAYMENT CYCLE (Figma 12285-189429). Local state: nothing downstream reads
     it yet — the rental APIs take no billing period — so this is the control
     and its selection, and the price does NOT move. Wiring it to the quote is
     the one change when a term-priced endpoint exists; until then a radio that
     silently rewrote the total would be inventing a discount.
     `useId` because a page can hold two of these and radios group by name. */
  const cycleName = useId();
  const [cycle, setCycle] = useState<PaymentCycle>('monthly');
  /* The frame's three rows, narrowed to what this property sells for this
     space type. Undefined `paymentCycles` means not yet known, which renders
     nothing rather than all three. */
  const cycleOptions = paymentCycles
    ? PAYMENT_CYCLES.filter((c) => paymentCycles.includes(c.id))
    : [];
  /* Keep the selection on an offered period. Monthly is the default and is
     offered by every property in the live data, but it is configurable, so a
     property that sells quarterly and annual only must not sit on a monthly
     radio that is not on screen. */
  useEffect(() => {
    if (!cycleOptions.length) return;
    if (!cycleOptions.some((c) => c.id === cycle)) setCycle(cycleOptions[0].id);
    // cycleOptions is derived from paymentCycles; depending on the array
    // identity would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentCycles?.join(','), cycle]);
  /* With no checkbox to tick, the pay button is where the shopper accepts the
     recurring charge — so it says so. undefined elsewhere, leaving the forms'
     own "Pay Now $X". */
  /* One month on from the move-in, which is what the terms below name. Built
     from `moveIn` rather than today: a shopper booking three weeks out is not
     billed a month from now. */
  const nextBillingDate = useMemo(() => {
    const d = new Date(moveIn);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [moveIn]);

  const agreeLabel = mode === 'default' && payNowTotal != null
    ? `Agree & Pay ${payNowTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
    : undefined;

  /* Ticked to begin with for the two modes whose frames show it ticked. Keyed
     on `mode` so the demo picker re-seeds it, which is the whole point of the
     picker. `default` is enrolled and cannot be turned off. */
  const [autopay, setAutopay] = useState(mode === 'default' || mode === 'preselected');
  useEffect(() => {
    setAutopay(mode === 'default' || mode === 'preselected');
  }, [mode]);
  // "Learn More" coverage card (Figma 8509-36480). The plan CARD in the page is
  // API-driven (see `plan`); this is the explanatory content behind it.
  //
  // Desktop pointer devices get it as a hover popover; tablet and mobile keep
  // the tap-to-open lightbox. Gated on hover/pointer as well as width because
  // hover on a touchscreen fires on tap and then STICKS — the card would sit
  // there with nothing to dismiss it. The query is duplicated in
  // RentalFlow2Step.css and the two must stay in step: if they disagree there
  // is a width at which both the popover and the lightbox fire.
  const [planOpen, setPlanOpen] = useState(false);
  const [canHover, setCanHover] = useState(
    // Seeded synchronously rather than in the effect: a desktop user who clicks
    // in the first frame would otherwise get the lightbox.
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(PLAN_HOVER_QUERY).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(PLAN_HOVER_QUERY);
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  // "View Document" lightbox. The agree checkbox inside it drives the SAME
  // `agree` state as the one on the page, so accepting in either place counts.
  const [leaseOpen, setLeaseOpen] = useState(false);

  // Autopay explainer tooltip (Figma 8509-34934).
  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!tipOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setTipOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTipOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tipOpen]);

  // Protection-plan dropdown. Defaults to the plan the operator marked (name
  // "Best Value"), else the first — never nothing, so the card always states a
  // choice rather than looking unanswered. 'own' is the "I have my own
  // insurance" branch, which is a decision rather than a product and so is not
  // in `plans`.
  const [planListOpen, setPlanListOpen] = useState(false);
  const [planChoice, setPlanChoice] = useState<string | 'own'>(
    () => plans.find((p) => /best value/i.test(p.name ?? ''))?.id ?? plans[0]?.id ?? 'own',
  );
  const chosenPlan = plans.find((p) => p.id === planChoice);
  // Plans arrive from the API AFTER first render, so the initializer above
  // usually runs against an empty list and lands on 'own'. Adopt the real
  // default once they load — but only until the shopper has chosen for
  // themselves, so this can never overwrite a deliberate "own insurance".
  const planTouched = useRef(false);
  useEffect(() => {
    if (planTouched.current || !plans.length) return;
    const preferred = plans.find((p) => /best value/i.test(p.name ?? ''))?.id ?? plans[0]?.id;
    if (preferred && preferred !== planChoice) setPlanChoice(preferred);
  }, [plans, planChoice]);
  const choosePlan = (id: string | 'own') => {
    planTouched.current = true;
    setPlanChoice(id);
    setPlanListOpen(false);
  };
  // Report upward whenever the effective coverage changes ('own' = none).
  useEffect(() => {
    onPlanChange?.(planChoice === 'own' ? undefined : planChoice);
  }, [planChoice, onPlanChange]);

  /* KEY-SHARE (12285-189422). Same shape as the protection plan above it, so
     it reuses that section's classes rather than growing a parallel set. */
  const keyShares = keyShareOptions?.length ? keyShareOptions : DEFAULT_KEY_SHARES;
  const [ksOpen, setKsOpen] = useState(false);
  const [ksChoice, setKsChoice] = useState(keyShares[0].id);
  const [ksTipOpen, setKsTipOpen] = useState(false);
  const ksRef = useRef<HTMLDivElement>(null);
  const chosenKeyShare = keyShares.find((k) => k.id === ksChoice) ?? keyShares[0];

  useEffect(() => {
    if (!ksOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ksRef.current && !ksRef.current.contains(e.target as Node)) setKsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setKsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ksOpen]);

  // Close on outside click / Escape, like a native select.
  const planRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!planListOpen) return;
    const onDown = (e: MouseEvent) => {
      if (planRef.current && !planRef.current.contains(e.target as Node)) setPlanListOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlanListOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [planListOpen]);

  // Payment method + Hosted Fields tokenization result. The temporary
  // token is single-use with a 30-minute expiry — comfortably inside the
  // 15-minute unit hold. It is what the (future) server-side move-in
  // charge consumes; no card data exists widget-side.
  const [payMethod, setPayMethod] = useState<'gpay' | 'apple' | 'card' | 'bank' | null>(null);
  const [payAttempted, setPayAttempted] = useState(false);
  /** Skeleton beat before a static payment form appears (Figma 8507-24610). */
  const [formLoading, setFormLoading] = useState(false);

  // Everything the lease POST / payment step requires. Conditional
  // sections only gate while expanded (their checkbox is optional; the
  // fields inside are not).
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneOk = isPossiblePhone(phone, 'US');
  /* Only when the fields are actually on this screen. On 2step they are not,
     and a rule for an input nobody can see would disable Pay Now with no way
     to find out why — the exact thing the old comment below warned about. */
  const extraProblems = oneStep
    ? extraFieldProblems({ military, altContact, vehicle }, extraFields)
    : {};
  const required: Array<[key: string, ok: boolean]> = [
    ['email', emailOk],
    ['phone', phoneOk],
    // Whichever name fields are actually on screen — a hidden First Name must
    // never be what stops Pay Now.
    ...(business
      ? [['bizName', bizName.trim().length > 0]] as Array<[string, boolean]>
      : [['first', first.trim().length > 0],
        ['last', last.trim().length > 0]] as Array<[string, boolean]>),
    ['agree', agree],
    /* On 2step the optional sections are TICKS — their fields live on the
       post-purchase screen, so there is nothing here to validate. On 1step
       they are on screen, so the ones that are open and incomplete do gate
       payment; `extraProblems` is empty in the other case, so this line adds
       nothing to the two-step form. */
    ...Object.entries(extraProblems).map(([k, msg]) => [k, !msg] as [string, boolean]),
  ];
  /* Harness bypass — compiled out of production builds, see @shared/devBypass.
     Both the gate and the per-field red state read it, so they cannot
     disagree about whether the form is finished. */
  const skip = skipValidation();
  const formComplete = skip || required.every(([, ok]) => ok);
  const bad = (key: string) => !skip && payAttempted
    && !(required.find(([k]) => k === key)?.[1] ?? true);
  /* The shared groups render FormField's own message, so they need the text
     rather than this screen's boolean. Same gate — nothing is flagged until
     payment has been attempted, and the harness bypass silences both. */
  const extraBad = (key: string) =>
    (!skip && payAttempted && extraProblems[key] ? extraProblems[key] : undefined);
  /** A card/bank panel is open, so its button is replaced by the panel and the
   *  other method relocates beneath it. Wallets are one-tap and never expand. */
  const methodOpen = payMethod === 'card' || payMethod === 'bank';

  const selectPayMethod = (m: 'gpay' | 'apple' | 'card' | 'bank') => {
    if (!formComplete) { setPayAttempted(true); return; }
    const next = payMethod === m ? null : m;
    setPayMethod(next);
    // Skeleton beat before the panel appears (Figma 8507-24610), so it does
    // not snap in.
    if (next && (next === 'card' || next === 'bank')) {
      setFormLoading(true);
      window.setTimeout(() => setFormLoading(false), FORM_SKELETON_MS);
    }
  };

  /** "Pay Now" — hands the parent everything the rental APIs need. */
  const payStatically = (card?: CardFormValue, bank?: BankFormValue) => onPaymentComplete?.({
    firstName: first.trim() || 'there',
    card,
    bank,
    contact: business
      ? { ...splitBusinessName(bizName), email: email.trim(), phone, businessName: bizName.trim() }
      : { first: first.trim(), last: last.trim(), email: email.trim(), phone },
    autopay,
    // Which sections the shopper opted into. The VALUES are collected on the
    // post-purchase screen, so this step sends the choices and nothing else.
    extras: { business, military, altContact, vehicle },
  });


  return (
    <div className="rf-card rf2-card">
      <div className="rf-title">
        <p className="rf-eyebrow">Great choice!</p>
        <h2 className="rf-heading">Secure your space now</h2>
      </div>

      <RfCheckbox checked={business} onChange={setBusiness} className="rf-business">
        I am renting as a business
      </RfCheckbox>
      {/* Tick only. The business details themselves are asked for on the
          post-purchase screen, with the rest of the optional sections. */}

      <div className="rf2-form">
        <div className="rf2-row">
          <FieldAbove label={business ? 'Business Email' : 'Email'} required value={email} onChange={setEmail} type="email" error={bad('email')} />
          <FieldAbove label={business ? 'Business Phone' : 'Phone Number'} required value={phone} onChange={setPhone} type="tel" phoneCountry="US" error={bad('phone')} />
        </div>
        {business ? (
          <FieldAbove label="Business Name" required value={bizName} onChange={setBizName} error={bad('bizName')} />
        ) : (
          <div className="rf2-row">
            <FieldAbove label="First Name" required value={first} onChange={setFirst} error={bad('first')} />
            <FieldAbove label="Last Name" required value={last} onChange={setLast} error={bad('last')} />
          </div>
        )}
        {/* Where step 2 comes to rest. The shopper filled their contact details
            in step 1, so landing on them again is a screen of finished work.

            BELOW the name row, not above it: the scroll offsets back up by the
            sticky header's height, so whatever sits just before this marker is
            what ends up under the header. Above the row that was the email
            pair; here it is the name pair. Marked in the markup rather than
            measured from the top of the form, so it follows the fields if the
            layout changes. */}
        <span data-rf2-rest aria-hidden="true" />
        <button type="button" className="rf2-movein rf2-movein--valid" onClick={onEditDate}>
          <span className="rf2-movein-text">
            <span className="rf2-movein-label">Move-in Date<span className="rf-req">*</span></span>
            <span className="rf2-movein-value">{formatDate(moveIn)}</span>
          </span>
          <CalendarIcon size={24} />
        </button>
      </div>

      <div className="rf2-sections">
        {/* Protection Plan */}
        <section className="rf2-panel">
          <div className="rf2-rowhead">
            <span className="rf2-h">Select Protection Plan</span>
            {/* The card is a CHILD of the hover target, not a sibling, so
                moving the pointer onto it keeps :hover true — there is no gap
                to cross and nothing to flicker. It is also positioned OVER the
                trigger, so the pointer is already inside the box the moment it
                appears. :focus-within gives keyboard users the same card. */}
            <div className="rf2-learn">
              <button
                type="button"
                className="rf2-link rf2-link--btn"
                aria-haspopup={canHover ? undefined : 'dialog'}
                // On desktop the click is a no-op: hover and focus both already
                // show the card, so opening a lightbox as well would be the
                // very thing this replaced.
                onClick={() => { if (!canHover) setPlanOpen(true); }}
              >
                Learn More
              </button>
              {canHover && (
                <div className="rf2-learn-pop" role="tooltip">
                  <div className="rf-pp-card">
                    <PlanCoverageBody brochureUrl={brochureUrl} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {plans.length ? (
            <div className="rf2-plan-wrap" ref={planRef}>
              {/* Closed control (Figma 8507-23352). The chevron is a separate
                  cell behind a divider, per the frame — but the whole control
                  toggles, so the small cell is not the only target. */}
              <button
                type="button"
                className="rf2-plan"
                aria-haspopup="listbox"
                aria-expanded={planListOpen}
                onClick={() => setPlanListOpen((o) => !o)}
              >
                <span className="rf2-plan-body">
                  {chosenPlan ? (
                    <>
                      <span className="rf2-plan-left">
                        <span className="rf2-plan-cov">
                          <b>${chosenPlan.coverage?.toLocaleString()}</b> Coverage
                        </span>
                        {/best value/i.test(chosenPlan.name ?? '') && (
                          <span className="rf2-plan-best">Best Value</span>
                        )}
                      </span>
                      <span className="rf2-plan-price"><b>${chosenPlan.premium}</b><span>/mo</span></span>
                    </>
                  ) : (
                    <span className="rf2-plan-own-sel">I Have My Own Insurance</span>
                  )}
                </span>
                <span className="rf2-plan-drop">
                  {/* Solid variant (Figma 8508-32282), not the outline
                      ChevronIcon used elsewhere — a visibly heavier mark. */}
                  <ChevronSolidIcon size={14} className={`rf2-chev-down${planListOpen ? ' rf2-chev-up' : ''}`} />
                </span>
              </button>

              {/* Open list (Figma 8508-32894) */}
              {planListOpen && (
                <div className="rf2-plan-menu" role="listbox" aria-label="Protection plans">
                  {plans.map((p, i) => {
                    const best = /best value/i.test(p.name ?? '');
                    return (
                      <React.Fragment key={p.id}>
                        {/* Divider is a SIBLING of the rows, not a border on them:
                            the frame draws it as its own child of the gap-8
                            column, so 8px sits above AND below each line. A
                            border-top would hug the next row instead. */}
                        {i > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
                        <button
                          type="button"
                          role="option"
                          aria-selected={planChoice === p.id}
                          className={`rf2-plan-opt${best ? ' rf2-plan-opt--best' : ''}`}
                          onClick={() => choosePlan(p.id)}
                        >
                          <span className="rf2-plan-opt-left">
                            <span className="rf2-plan-opt-cov">
                              <b>${p.coverage?.toLocaleString()}</b> Coverage
                            </span>
                            {best && <span className="rf2-plan-best rf2-plan-best--sm">Best Value</span>}
                          </span>
                          <span className="rf2-plan-price"><b>${p.premium}</b><span>/month</span></span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                  {plans.length > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
                  {/* Not a plan — a declaration that they will supply their own.
                      Hence no price and its own layout in the frame. */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={planChoice === 'own'}
                    className="rf2-plan-opt rf2-plan-opt--own"
                    onClick={() => choosePlan('own')}
                  >
                    <span className="rf2-plan-own-t">I Have My Own Insurance</span>
                    <span className="rf2-plan-own-d">
                      I’ll provide proof of coverage - I’ll buy the Basic Protection Plan if I
                      don’t provide proof of coverage through my homeowners or renters insurance
                      by the end of the month.
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* NO-DEMO-MONEY: the property returned no coverage products for
               this space type — say so instead of faking $2,000/$12. */
            <div className="rf2-plan rf2-plan--pending">
              Protection plan options and pricing will be confirmed at checkout.
            </div>
          )}
        </section>

        {/* NOKĒ KEY-SHARE (Figma 12285-189422). Deliberately the protection
            plan's own classes, not a parallel set: the frame draws the
            identical control, so one stylesheet for both is what keeps them
            consistent as either moves. Only the price type differs. */}
        <section className="rf2-panel">
          <div className="rf2-rowhead">
            <span className="rf2-h">Select Nokē Key-Share Plan</span>
            {/* The dark card from 12285-189509. Hover and focus both reveal
                it; on a touch screen, where neither happens, the tap does. */}
            <span className="rf2-tip-anchor">
              <button
                type="button"
                className="rf2-link rf2-link--btn"
                aria-expanded={ksTipOpen}
                onMouseEnter={() => { if (canHover) setKsTipOpen(true); }}
                onMouseLeave={() => { if (canHover) setKsTipOpen(false); }}
                onFocus={() => setKsTipOpen(true)}
                onBlur={() => setKsTipOpen(false)}
                onClick={() => { if (!canHover) setKsTipOpen((o) => !o); }}
              >
                Learn More
              </button>
              {ksTipOpen && (
                <span className="rf2-tip rf2-tip--wide" role="tooltip">{KEY_SHARE_BLURB}</span>
              )}
            </span>
          </div>

          <div className="rf2-plan-wrap" ref={ksRef}>
            <button
              type="button"
              className="rf2-plan"
              aria-haspopup="listbox"
              aria-expanded={ksOpen}
              onClick={() => setKsOpen((o) => !o)}
            >
              <span className="rf2-plan-body">
                <span className="rf2-plan-left">
                  <span className="rf2-plan-cov">
                    <b>{chosenKeyShare.shares} Key-shares</b> Plan
                  </span>
                </span>
                <span className="rf2-ks-price">{chosenKeyShare.price}</span>
              </span>
              <span className="rf2-plan-drop">
                <ChevronSolidIcon size={14} className={`rf2-chev-down${ksOpen ? ' rf2-chev-up' : ''}`} />
              </span>
            </button>

            {ksOpen && (
              <div className="rf2-plan-menu" role="listbox" aria-label="Key-share plans">
                {keyShares.map((k, i) => (
                  <React.Fragment key={k.id}>
                    {i > 0 && <span className="rf2-plan-sep" aria-hidden="true" />}
                    <button
                      type="button"
                      role="option"
                      aria-selected={ksChoice === k.id}
                      className="rf2-plan-opt"
                      onClick={() => { setKsChoice(k.id); setKsOpen(false); }}
                    >
                      <span className="rf2-plan-opt-left">
                        <span className="rf2-plan-opt-cov"><b>{k.shares} Key-shares</b> Plan</span>
                      </span>
                      <span className="rf2-ks-price">{k.price}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Additional Information */}
        <section className="rf2-plain">
          <span className="rf2-h">Additional Information</span>
          <div className="rf2-checks">
            {/* On 2step these are ticks only and the fields are answered on the
                post-purchase screen — choosing here, filling there. On 1step
                each tick opens its own fields directly beneath it, rather than
                the three ticks sitting together and the fields appearing lower
                down: a section's question and its answers belong next to each
                other.

                The groups come from ./additionalInfo, shared with the
                post-purchase screen, which asks for exactly the same things
                and must not drift from this. */}
            <div className="rf-sx-group">
              <Check checked={military} onChange={setMilitary}>I am active military</Check>
              {oneStep && military && <MilitaryFields v={extraFields} set={setExtra} bad={extraBad} validated />}
            </div>
            <div className="rf-sx-group">
              <Check checked={altContact} onChange={setAltContact}>I am providing an alternate contact</Check>
              {oneStep && altContact && <AltContactFields v={extraFields} set={setExtra} bad={extraBad} validated />}
            </div>
            <div className="rf-sx-group">
              <Check checked={vehicle} onChange={setVehicle}>I am storing a vehicle</Check>
              {oneStep && vehicle && <VehicleFields v={extraFields} set={setExtra} bad={extraBad} validated />}
            </div>
          </div>
        </section>

        {/* Rental Agreement. Ringed in the CTA colour once agreed — the tick
            is 18px in a tall section, so the box itself confirms the state. */}
        <section className={`rf2-agree${agree ? ' rf2-agree--on' : ''}`}>
          <div className="rf2-agree-head">
            <span className="rf2-h">Rental Agreement <span className="rf-req">*</span></span>
            <button type="button" className="rf2-link rf2-link--btn" onClick={() => setLeaseOpen(true)}>
              <FileArrowIcon size={24} />
              {/* "View Document" wraps to two lines in the narrow header row on
                  mobile. Swapped in CSS rather than by state so it responds to
                  the container, not a re-render; display:none also drops the
                  unused label from the accessibility tree, so only one is
                  announced. */}
              <span className="rf2-link-long">View Document</span>
              <span className="rf2-link-short">View</span>
            </button>
          </div>
          <div className="rf2-agree-doc">
            <LeaseDocBody title={leaseDocName} />
          </div>
          <RfCheckbox
            checked={agree}
            onChange={setAgree}
            className="rf2-agree-bar"
          >
            <span className="rf2-agree-text"><b>I agree</b> to the terms and conditions as set out by the rental agreement.</span>
          </RfCheckbox>
          {/* Says what is wrong instead of ringing the row in red. role="alert"
              so it is announced when it appears, not silently drawn. */}
          {bad('agree') && (
            <p className="rf2-agree-error" role="alert">
              You must accept the rental agreement to continue.
            </p>
          )}
        </section>

        {/* Payment */}
        <section className="rf2-panel rf2-payment">
          <span className="rf2-h">Payment</span>
          {/* `default` is always enrolled, so it has no control at all — the
              terms move to the foot of the section and the pay button carries
              the consent. The other three keep the checkbox. */}
          {mode !== 'default' && (
          <div className={`rf2-autopay${autopay ? ' rf2-autopay--on' : ''}${mode === 'preselected' ? ' rf2-autopay--withbar' : ''}`}>
            <div className="rf2-autopay-head">
            <Check checked={autopay} onChange={setAutopay}>
              <span className="rf2-autopay-label">Autopay Enrollment</span>
            </Check>
            {/* Click, not hover: a hover-only tooltip is unreachable on touch,
                and this explains a recurring charge. */}
            <span className="rf2-tip-anchor" ref={tipRef}>
              <button
                type="button"
                className="rf2-autopay-info"
                aria-label="About autopay enrollment"
                aria-expanded={tipOpen}
                onClick={() => setTipOpen((o) => !o)}
              >
                <InfoIcon size={16} />
              </button>
              {tipOpen && (
                <span className="rf2-tip" role="tooltip">
                  Enrolling in autopay automatically charges your payment method each month
                </span>
              )}
            </span>
            </div>
            {/* Attached, INSIDE the box (11940-18948) — where the fee notice
                below is a separate box. One argues for a choice the shopper is
                making here; the other states a fact about the whole payment. */}
            {/* Only while it is UNticked. The bar argues for staying enrolled;
                once the shopper has stayed enrolled there is nothing left to
                argue, and the blue box would read as a warning about a choice
                they already made. The border goes with it — see
                .rf2-autopay--withbar.rf2-autopay--on. */}
            {mode === 'preselected' && !autopay && (
              <p className="rf2-autopay-bar">
                <InfoIcon size={20} className="rf2-autopay-bar-ico" />
                Stay enrolled to make sure you get the best price available.
              </p>
            )}
          </div>
          )}

          {mode === 'fee' && (
            <p className="rf2-autopay-note">
              <InfoIcon size={20} className="rf2-autopay-bar-ico" />
              A processing fee of 2.5% will be added to all payments made on a card.
              No fee for ACH bank transfer.
            </p>
          )}
          {/* PAYMENT CYCLE (Figma 12285-189429) — between autopay and the
              payment methods, which is where the frame puts it. A real
              radiogroup, so arrow keys move between the three and a screen
              reader announces one of three rather than three checkboxes. */}
          {/* Hidden outright when the property offers no period for this space
              type — a radiogroup with nothing in it, or with one forced answer,
              is not a choice. */}
          {cycleOptions.length > 0 && (
            <div className="rf2-cycle">
              <div className="rf2-cycle-row">
                <span className="rf2-cycle-head">
                  <img src={creditCardRepeat} width={24} height={24} alt="" aria-hidden="true" />
                  <span className="rf2-cycle-title">Payment Cycle</span>
                  <InfoIcon size={16} className="rf2-cycle-info" />
                </span>

                <div className="rf2-cycle-opts" role="radiogroup" aria-label="Payment cycle">
                  {cycleOptions.map((c) => (
                    <label className="rf2-cycle-opt" key={c.id}>
                      <input
                        type="radio"
                        name={cycleName}
                        value={c.id}
                        checked={cycle === c.id}
                        onChange={() => setCycle(c.id)}
                      />
                      <span className="rf2-cycle-radio"><span className="rf2-cycle-dot" /></span>
                      <span className="rf2-cycle-text">
                        <span>{c.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="rf2-cycle-disclaimer">
                <span className="rf2-cycle-disclaimer-lead">Disclaimer:</span>
                {' '}Only one discount can be applied at a time. Multiple discounts or
                promotions cannot be combined. Please choose the discount that provides
                the greatest benefit to you. Other promotions or offers may not be used
                simultaneously. Terms and conditions may apply.
              </p>
            </div>
          )}

          {/* Wallets always sit at the top. The two method buttons only share
              that grid while NEITHER is open — once one is, the open panel
              takes their place and the other method moves below it
              (Figma 10080-28749). */}
          <div className={`rf2-paygrid${methodOpen ? ' rf2-paygrid--wallets' : ''}`}>
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('gpay')}><GooglePayMark /></button>
            <button type="button" className="rf2-pay rf2-pay--dark" onClick={() => selectPayMethod('apple')}><ApplePayMark /></button>
            {!methodOpen && (
              <>
                <Button
                  tone="dark"
                  fill="outline"
                  block
                  icon={<CreditCardIcon size={24} />}
                  className="rf2-pay-btn"
                  onClick={() => selectPayMethod('card')}
                >
                  Credit / Debit
                </Button>
                <Button
                  tone="dark"
                  fill="outline"
                  block
                  icon={<BankIcon size={24} />}
                  className="rf2-pay-btn"
                  onClick={() => selectPayMethod('bank')}
                >
                  Pay by Bank
                </Button>
              </>
            )}
          </div>
          {payAttempted && !formComplete && (
            <p className="rf2-gp-note rf2-gp-note--error">
              Complete the highlighted fields (and accept the rental agreement) to continue to payment.
            </p>
          )}
          {payError && (
            <p className="rf2-gp-note rf2-gp-note--error" role="alert">{payError}</p>
          )}
          {/* No Global Payments key on this site yet, so card and bank are the
              static forms from Figma 10080-30277 / 10080-28749 rather than the
              hosted-fields iframes. With a key set, the real GP path below runs
              untouched. Either way the form is preceded by a brief skeleton
              (8507-24610) so the panel doesn't snap in. */}
          {(payMethod === 'card' || payMethod === 'bank') && (
            <section
              className="rf-method-panel"
              aria-label={payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}
            >
              <header className="rf-method-panel-head">
                {payMethod === 'card' ? <CreditCardIcon size={24} /> : <BankIcon size={24} />}
                <span>{payMethod === 'card' ? 'Credit / Debit' : 'Pay by Bank'}</span>
              </header>

              {formLoading ? (
                <PaymentFormSkeleton rows={payMethod === 'bank' ? 3 : 2} />
              ) : payMethod === 'card' ? (
                <CardForm total={payNowTotal ?? 0} onPay={payStatically} busy={paying} gpPublicKey={gpPublicKey} gatewayPending={gatewayPending} zipOnlyBilling={zipOnlyBilling} defaultCountry={defaultCountry} payLabel={agreeLabel} />
              ) : (
                <BankForm total={payNowTotal ?? 0} onPay={(bank) => payStatically(undefined, bank)} busy={paying} defaultCountry={defaultCountry} payLabel={agreeLabel} />
              )}
            </section>
          )}
          {/* The method NOT open, relocated below the panel — full width, since
              it no longer shares a row (Figma 10080-28749). */}
          {methodOpen && (
            <Button
              tone="dark"
              fill="outline"
              block
              icon={payMethod === 'card' ? <BankIcon size={24} /> : <CreditCardIcon size={24} />}
              className="rf2-pay-btn rf2-pay-btn--alt"
              onClick={() => selectPayMethod(payMethod === 'card' ? 'bank' : 'card')}
            >
              {payMethod === 'card' ? 'Pay by Bank' : 'Credit / Debit'}
            </Button>
          )}

          {/* Always-on autopay states its terms here instead of behind a
              tooltip on a checkbox that no longer exists (11940-18784). Last in
              the section, below every payment method, because it governs all of
              them rather than the one that happens to be open. */}
          {mode === 'default' && (
            <p className="rf2-autopay-terms">
              Your next monthly rent payment is due on {nextBillingDate}, and will recur monthly
              thereafter. Rental rates are subject to change in accordance with your Rental
              Agreement and applicable law. To avoid the next month&rsquo;s charge, you must
              complete your move-out before your next billing date. You may initiate a move-out
              through your account or by contacting the facility. By entering a payment method,
              you accept these terms and authorize recurring automatic payments using your
              selected payment method.
            </p>
          )}

        </section>
      </div>

      <ProtectionPlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        brochureUrl={brochureUrl}
      />
      <LeaseModal
        open={leaseOpen}
        onClose={() => setLeaseOpen(false)}
        agree={agree}
        onAgreeChange={setAgree}
      >
        <LeaseDocBody title={leaseDocName} />
      </LeaseModal>
    </div>
  );
}
