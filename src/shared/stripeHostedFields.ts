// ===========================================================================
// Stripe hosted card fields — the card number, expiry and CVC live inside
// Stripe's embedded element, so none of them ever enter our JavaScript. The
// counterpart of gpHostedFields.ts for properties whose gateway is
// `tenant_payments_stripe`.
//
// ONE ROW, ONE IFRAME. This is Stripe's classic Card Element — a single
// inline field asking number / expiry / CVC — not the Payment Element the
// hand-off sketched, which stacks its fields in its own two-line layout and
// cannot be made a row. Chosen 2026-10-22 at the client's request. The
// server-side contract is IDENTICAL: createPaymentMethod mints the same
// single-attempt pm_… either way, and the lease still gets
// `{type:'hosted-card', token: pm_…}` — so the switch is invisible to
// Hummingbird. (`hidePostalCode` because ZIP is our own billing field.)
//
// Still per TenantInc's Stripe hand-off (received 2026-10-21):
//   - the gateway reply's `gateway_config` carries the PUBLISHABLE key, the
//     facility's CONNECTED ACCOUNT id and the currency; all safe in the
//     browser. (The Card Element itself is amount-less — nothing is charged
//     client-side, so the amount only matters server-side.)
//   - name and billing stay OUR fields, passed to createPaymentMethod as
//     `billing_details`.
//   - a pm id is a single-attempt credential: it is handed to the caller and
//     never logged, and a declined payment needs a FRESH submit.
//   - 3-D Secure is out of scope; a card that requires it declines with the
//     processor's message and the shopper is asked for another card.
//
// Loading js.stripe.com is this module's one remote dependency. It fails
// soft: mountStripeCard resolves null and the caller shows its own notice —
// there is no plain-input fallback on a Stripe property, because a typed PAN
// has nowhere lawful to go.
// ===========================================================================

const STRIPE_JS_URL = 'https://js.stripe.com/v3/';

// --- The slivers of Stripe.js this module touches -----------------------------

interface StripeElementLike {
  mount(selector: string): void;
  unmount(): void;
  on(event: 'ready' | 'change' | 'loaderror', handler: (e?: { complete?: boolean; error?: { message?: string } }) => void): void;
}
interface StripeElementsLike {
  create(type: 'card' | 'payment', options: Record<string, unknown>): StripeElementLike;
  /** Deferred mode only: re-prices the element (e.g. the quote changed). */
  update(options: Record<string, unknown>): void;
  /** Deferred mode only: validates the element before createPaymentMethod. */
  submit(): Promise<{ error?: { message?: string } } | undefined>;
}
interface StripePaymentMethodResult {
  paymentMethod?: {
    id: string;
    card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number };
    us_bank_account?: { last4?: string; bank_name?: string };
  };
  error?: { message?: string };
}
interface StripeLike {
  elements(options?: Record<string, unknown>): StripeElementsLike;
  createPaymentMethod(options: Record<string, unknown>): Promise<StripePaymentMethodResult>;
}
type StripeCtor = (publishableKey: string, options?: { stripeAccount?: string }) => StripeLike;

const stripeCtor = (): StripeCtor | undefined =>
  (window as unknown as { Stripe?: StripeCtor }).Stripe;

/** Load Stripe.js once per page; reuse a tag something else injected. Resolves
 *  null on failure and never rejects — the caller shows the notice. */
let loader: Promise<StripeCtor | null> | null = null;
function loadStripeJs(): Promise<StripeCtor | null> {
  if (loader) return loader;
  loader = new Promise<StripeCtor | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    const ready = stripeCtor();
    if (ready) { resolve(ready); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${STRIPE_JS_URL}"]`);
    const tag = existing ?? document.createElement('script');
    tag.addEventListener('load', () => resolve(stripeCtor() ?? null));
    tag.addEventListener('error', () => {
      console.warn('[stripeHostedFields] Stripe.js failed to load.');
      resolve(null);
    });
    if (!existing) {
      tag.src = STRIPE_JS_URL;
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return loader;
}

// --- Public surface ------------------------------------------------------------

/** `gateway_config`, as the gateway lookup hands it over. */
export interface StripeGatewayConfig {
  /** `public_key` — the publishable key ("pk_test_…" / "pk_live_…"). */
  publicKey: string;
  /** `merchant_account` — the facility's connected account ("acct_…"), so the
   *  PaymentMethod belongs to the facility, not the platform. */
  merchantAccount: string;
  /** `currency`, e.g. "usd". Unused by the Card Element (it is amount-less);
   *  kept because the gateway reply carries it and a future element may not be. */
  currency: string;
}

export interface StripeBillingDetails {
  name: string;
  zip: string;
  /** ISO-2, defaulted to US by the caller's country select. */
  country?: string;
  /** Present only when the panel collected a full address. */
  line1?: string;
  city?: string;
  state?: string;
}

export interface StripeCardResult {
  /** The single-attempt pm_… id. Sensitive: hand on, never log. */
  paymentMethodId: string;
  /** For display only — "xxxx 4242" on receipts; never sent as a card number. */
  last4: string;
  /** "visa" | "mastercard" | … as Stripe spells it. */
  brand: string;
  /** From the PaymentMethod reply — Stripe's element holds the typed expiry. */
  expMonth: string;
  expYear: string;
}

export interface StripeCardHandle {
  /** No-op for the Card Element (it carries no amount — nothing is charged
   *  client-side). Kept so the caller does not change if the element does. */
  updateAmount(amountCents: number): void;
  /** Validate the element and mint a PaymentMethod. One attempt per call. */
  submit(billing: StripeBillingDetails): Promise<
    { ok: true; card: StripeCardResult } | { ok: false; message: string }
  >;
  unmount(): void;
}

const GENERIC_DECLINE = 'The card could not be verified. Please check the details and try again.';

/** The bank form's values, as Stripe's us_bank_account wants them. */
export interface StripeBankDetails {
  /** Account holder, "First Last". */
  name: string;
  email?: string;
  /** Nine digits. */
  routingNumber: string;
  accountNumber: string;
  /** 'checking' | 'savings' — lower-case, Stripe's spelling. */
  accountType: 'checking' | 'savings';
  /** The billing address, from the bank form. The processor REQUIRES the
   *  zip — "Payment Method billing address zip code is required" (live,
   *  2026-10-23) — so it rides in billing_details like the card path's. */
  zip: string;
  /** ISO-2; the caller maps its country select. */
  country?: string;
  line1?: string;
  city?: string;
  state?: string;
}

/**
 * Pay-by-Bank on a Stripe property: the typed routing/account go STRAIGHT to
 * Stripe (never to our server), which mints a us_bank_account PaymentMethod —
 * the account payments API then takes `{type: 'hosted-ach', token: pm_…}`
 * (client contract, 2026-10-23). Same single-attempt rules as a card pm.
 */
export async function createStripeBankAccount(
  config: StripeGatewayConfig,
  d: StripeBankDetails,
): Promise<{ ok: true; paymentMethodId: string; last4: string } | { ok: false; message: string }> {
  const Ctor = await loadStripeJs();
  if (!Ctor) return { ok: false, message: 'The secure payment service could not load. Please refresh and try again.' };
  try {
    const stripe = Ctor(config.publicKey, { stripeAccount: config.merchantAccount });
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'us_bank_account',
      us_bank_account: {
        routing_number: d.routingNumber,
        account_number: d.accountNumber,
        account_holder_type: 'individual',
        account_type: d.accountType,
      },
      billing_details: {
        name: d.name,
        ...(d.email ? { email: d.email } : {}),
        address: {
          postal_code: d.zip,
          country: d.country || 'US',
          ...(d.line1?.trim() ? { line1: d.line1.trim() } : {}),
          ...(d.city?.trim() ? { city: d.city.trim() } : {}),
          ...(d.state?.trim() ? { state: d.state.trim() } : {}),
        },
      },
    });
    if (error || !paymentMethod?.id) {
      return { ok: false, message: error?.message || 'The bank account could not be verified. Please check the details and try again.' };
    }
    const pm = paymentMethod as { id: string; us_bank_account?: { last4?: string } };
    return { ok: true, paymentMethodId: pm.id, last4: pm.us_bank_account?.last4 ?? '' };
  } catch (err) {
    console.warn('[stripeHostedFields] bank createPaymentMethod threw:', err);
    return { ok: false, message: 'The bank account could not be verified. Please check the details and try again.' };
  }
}

export interface StripeBankElementHandle {
  /** Deferred mode prices the element, so a changed quote re-prices it here. */
  updateAmount(amountCents: number): void;
  /** elements.submit() + createPaymentMethod({elements}). One attempt per call.
   *  `zip` goes into the pm's billing_details.address.postal_code — the
   *  account proxy REQUIRES the zip yet its hosted-ach schema takes no zip
   *  key ("Unrecognized key", verified live 2026-10-28), so the pm itself is
   *  the only place it can travel. The element collects name and email but
   *  never an address for us_bank_account, so passing it in params is the
   *  documented way and cannot collide with the element's own fields. */
  submit(zip?: string): Promise<
    { ok: true; paymentMethodId: string; last4: string; bankName: string } | { ok: false; message: string }
  >;
  unmount(): void;
}

/**
 * Stripe's OWN Pay-by-Bank UI — the Payment Element restricted to
 * `us_bank_account`, in deferred-intent mode (`mode: 'payment'`,
 * `paymentMethodCreation: 'manual'`), which needs ONLY the publishable key:
 * no server-made intent or client secret. Verified live against the sandbox
 * gateway's own keys, 2026-10-28: the element renders Stripe's bank search
 * (Financial Connections — log into the bank, pick the account) plus its
 * "enter details manually" fallback and the ACH mandate text, and
 * createPaymentMethod({elements}) mints a us_bank_account pm with a
 * financial_connections_account attached — the linked kind
 * `verification_method=instant` requires, which raw-detail pms are not.
 *
 * Same fail-soft contract as mountStripeCard: resolves null when Stripe.js
 * cannot load or the element errors at mount, and the caller falls back.
 */
export async function mountStripeBankElement(opts: {
  config: StripeGatewayConfig;
  /** Deferred mode requires a positive integer amount. */
  amountCents: number;
  /** CSS selector of the host the element mounts into — must be in the DOM. */
  target: string;
  /** Prefill for the element's own Full name / Email fields (it collects
   *  both itself for us_bank_account). */
  defaultName?: string;
  defaultEmail?: string;
  /** The element has rendered; the caller can drop its skeleton. */
  onReady(): void;
  /** Stripe's own completeness — true once an account is connected/entered. */
  onComplete?(complete: boolean): void;
}): Promise<StripeBankElementHandle | null> {
  const Ctor = await loadStripeJs();
  if (!Ctor) return null;

  let stripe: StripeLike;
  let elements: StripeElementsLike;
  let element: StripeElementLike;
  try {
    stripe = Ctor(opts.config.publicKey, { stripeAccount: opts.config.merchantAccount });
    elements = stripe.elements({
      mode: 'payment',
      amount: Math.max(50, Math.round(opts.amountCents)),
      currency: opts.config.currency || 'usd',
      // Lets createPaymentMethod run without an intent — the pm id is all the
      // lease API wants.
      paymentMethodCreation: 'manual',
      // Exactly as verified by the 2026-10-28 spike (the element honoured it
      // and rendered bank-only).
      payment_method_types: ['us_bank_account'],
      appearance: {
        variables: {
          colorText: '#101318',
          colorDanger: '#d32f2f',
          fontSizeBase: '16px',
        },
      },
    });
    element = elements.create('payment', {
      fields: { billingDetails: { name: 'auto', email: 'auto' } },
      defaultValues: {
        billingDetails: {
          ...(opts.defaultName?.trim() ? { name: opts.defaultName.trim() } : {}),
          ...(opts.defaultEmail?.trim() ? { email: opts.defaultEmail.trim() } : {}),
        },
      },
    });
  } catch (err) {
    console.warn('[stripeHostedFields] bank element create threw:', err);
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;
    element.on('ready', () => {
      if (!settled) {
        settled = true;
        opts.onReady();
        resolve(handle);
      }
    });
    // A mount-time failure (bad key, unsupported config) must fall back, not
    // hang the panel on a skeleton forever.
    element.on('loaderror', (e) => {
      console.warn('[stripeHostedFields] bank element loaderror:', e?.error?.message);
      if (!settled) { settled = true; resolve(null); }
    });
    element.on('change', (e) => opts.onComplete?.(!!e?.complete));
    const handle: StripeBankElementHandle = {
      updateAmount(amountCents: number) {
        try { elements.update({ amount: Math.max(50, Math.round(amountCents)) }); } catch { /* keep the old price */ }
      },
      async submit(zip?: string) {
        try {
          const s = await elements.submit();
          if (s?.error) return { ok: false, message: s.error.message || GENERIC_BANK_DECLINE };
          const r = await stripe.createPaymentMethod({
            elements,
            // The billing ZIP from OUR field — see the handle's submit() doc.
            // Only the address: name/email are the element's own fields, and
            // params must not repeat what the element collects.
            ...(zip?.trim() ? { params: { billing_details: { address: { postal_code: zip.trim() } } } } : {}),
          });
          if (r.error || !r.paymentMethod?.id) {
            return { ok: false, message: r.error?.message || GENERIC_BANK_DECLINE };
          }
          return {
            ok: true,
            paymentMethodId: r.paymentMethod.id,
            last4: r.paymentMethod.us_bank_account?.last4 ?? '',
            bankName: r.paymentMethod.us_bank_account?.bank_name ?? '',
          };
        } catch (err) {
          console.warn('[stripeHostedFields] bank element submit threw:', err);
          return { ok: false, message: GENERIC_BANK_DECLINE };
        }
      },
      unmount() { try { element.unmount(); } catch { /* already gone */ } },
    };
    try { element.mount(opts.target); } catch (err) {
      console.warn('[stripeHostedFields] bank element mount threw:', err);
      if (!settled) { settled = true; resolve(null); }
    }
  });
}

const GENERIC_BANK_DECLINE = 'The bank account could not be verified. Please check the details and try again.';

export async function mountStripeCard(opts: {
  config: StripeGatewayConfig;
  /** Ignored by the Card Element — see StripeCardHandle.updateAmount. */
  amountCents: number;
  /** CSS selector of the host the element mounts into — must be in the DOM. */
  target: string;
  /** The element has rendered; the caller can drop its skeleton. */
  onReady(): void;
  /** Stripe's own per-keystroke completeness — the submit gate. */
  onComplete?(complete: boolean): void;
}): Promise<StripeCardHandle | null> {
  const Ctor = await loadStripeJs();
  if (!Ctor) return null;

  let stripe: StripeLike;
  let element: StripeElementLike;
  try {
    stripe = Ctor(opts.config.publicKey, { stripeAccount: opts.config.merchantAccount });
    element = stripe.elements().create('card', {
      // ZIP is OUR billing field, asked once below the row — not twice.
      hidePostalCode: true,
      /* The iframe inherits nothing, so the row's own typography is restated
         (.rf-cardrow-input): 16px/20px night text in a system stack close to
         the page's. Placeholder matches the resting field border grey. */
      style: {
        base: {
          color: '#101318',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontSize: '16px',
          lineHeight: '20px',
          '::placeholder': { color: '#a5b4bf' },
        },
        invalid: { color: '#d32f2f' },
      },
    });
    element.on('ready', () => opts.onReady());
    if (opts.onComplete) {
      element.on('change', (e) => opts.onComplete?.(e?.complete === true));
    }
    element.mount(opts.target);
  } catch (err) {
    console.warn('[stripeHostedFields] mount failed:', err);
    return null;
  }

  return {
    updateAmount() { /* amount-less element — nothing to follow */ },
    async submit(billing: StripeBillingDetails) {
      try {
        const address: Record<string, string> = {
          postal_code: billing.zip,
          country: billing.country || 'US',
        };
        if (billing.line1?.trim()) address.line1 = billing.line1.trim();
        if (billing.city?.trim()) address.city = billing.city.trim();
        if (billing.state?.trim()) address.state = billing.state.trim();
        /* Incomplete fields come back HERE as error.message in the shopper's
           words ("Your card number is incomplete.") — the Card Element has no
           separate validate step. */
        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: 'card',
          card: element,
          billing_details: { name: billing.name, address },
        });
        if (error || !paymentMethod?.id) {
          return { ok: false as const, message: error?.message || GENERIC_DECLINE };
        }
        const card = paymentMethod.card ?? {};
        return {
          ok: true as const,
          card: {
            paymentMethodId: paymentMethod.id,
            last4: card.last4 ?? '',
            brand: card.brand ?? '',
            expMonth: card.exp_month != null ? String(card.exp_month).padStart(2, '0') : '',
            expYear: card.exp_year != null ? String(card.exp_year) : '',
          },
        };
      } catch (err) {
        console.warn('[stripeHostedFields] submit threw:', err);
        return { ok: false as const, message: GENERIC_DECLINE };
      }
    },
    unmount() {
      try { element.unmount(); } catch { /* already gone */ }
    },
  };
}
