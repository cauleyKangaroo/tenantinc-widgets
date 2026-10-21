// ===========================================================================
// Stripe hosted card fields — the card number, expiry and CVC live inside
// Stripe's embedded Payment Element, so none of them ever enter our
// JavaScript. The counterpart of gpHostedFields.ts for properties whose
// gateway is `tenant_payments_stripe`.
//
// Built to TenantInc's Stripe hand-off (received 2026-10-21):
//   - the gateway reply's `gateway_config` carries the PUBLISHABLE key, the
//     facility's CONNECTED ACCOUNT id and the currency; all three are safe in
//     the browser and all three are used here.
//   - the element is created in `mode: "payment"` with
//     `paymentMethodCreation: "manual"`: the browser makes a PaymentMethod
//     (pm_…) and nothing is charged — Hummingbird charges server-side from
//     the id.
//   - name and billing stay OUR fields (`billingDetails: never`), passed to
//     createPaymentMethod as `billing_details`.
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
  on(event: 'ready' | 'change', handler: (e?: { complete?: boolean }) => void): void;
}
interface StripeElementsLike {
  create(type: 'payment', options: Record<string, unknown>): StripeElementLike;
  update(options: { amount?: number }): void;
  submit(): Promise<{ error?: { message?: string } }>;
}
interface StripePaymentMethodResult {
  paymentMethod?: {
    id: string;
    card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number };
  };
  error?: { message?: string };
}
interface StripeLike {
  elements(options: Record<string, unknown>): StripeElementsLike;
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
  /** `currency`, e.g. "usd". */
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
  /** Follow a re-priced total. Cents; clamped to Stripe's minimum. */
  updateAmount(amountCents: number): void;
  /** Validate the element and mint a PaymentMethod. One attempt per call. */
  submit(billing: StripeBillingDetails): Promise<
    { ok: true; card: StripeCardResult } | { ok: false; message: string }
  >;
  unmount(): void;
}

/** Stripe refuses zero/negative amounts; 50¢ is the USD floor, and the element
 *  amount is informational here (nothing is charged client-side). */
const amountFloor = (cents: number): number => Math.max(50, Math.round(cents) || 50);

const GENERIC_DECLINE = 'The card could not be verified. Please check the details and try again.';

export async function mountStripeCard(opts: {
  config: StripeGatewayConfig;
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
  let elements: StripeElementsLike;
  let element: StripeElementLike;
  try {
    stripe = Ctor(opts.config.publicKey, { stripeAccount: opts.config.merchantAccount });
    elements = stripe.elements({
      mode: 'payment',
      // The browser creates the PaymentMethod; Hummingbird charges it.
      paymentMethodCreation: 'manual',
      amount: amountFloor(opts.amountCents),
      currency: (opts.config.currency || 'usd').toLowerCase(),
      paymentMethodTypes: ['card'],
    });
    element = elements.create('payment', {
      // Name and billing are OUR fields; suppressed here and supplied to
      // createPaymentMethod as billing_details, per the hand-off.
      fields: { billingDetails: { name: 'never', address: 'never' } },
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
    updateAmount(amountCents: number) {
      try { elements.update({ amount: amountFloor(amountCents) }); } catch { /* keeps the old figure */ }
    },
    async submit(billing: StripeBillingDetails) {
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) return { ok: false as const, message: submitError.message || GENERIC_DECLINE };
        /* `address: 'never'` (above) makes Stripe demand EVERY address member
           here — omitting one is an IntegrationError, not a soft miss. The
           zip-only panel never collects a street, so the rest go as ''. */
        const address: Record<string, string> = {
          line1: billing.line1?.trim() ?? '',
          line2: '',
          city: billing.city?.trim() ?? '',
          state: billing.state?.trim() ?? '',
          postal_code: billing.zip,
          country: billing.country || 'US',
        };
        const { paymentMethod, error } = await stripe.createPaymentMethod({
          elements,
          params: { billing_details: { name: billing.name, address } },
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
