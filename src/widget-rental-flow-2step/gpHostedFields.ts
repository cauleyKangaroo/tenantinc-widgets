// Global Payments Hosted Fields — script loader + form mount.
//
// Docs: partner.globalpayments.com → Card Not Present → Hosted Fields.
// GP renders the card number / expiration / CVV inputs inside its own
// PCI-scoped iframes targeted at empty divs we own; submitting yields a
// single-use `temporary_token` (30-minute expiry). The token is the ONLY
// card artifact this widget ever sees — the sale itself is processed
// server-side (Nectar/gateway) with GP's *server-side* key, which must
// never appear in widget code. Only the *client-side* (publishable) key
// belongs here.

export interface GpTokenResult {
  temporaryToken: string;
  /** Card metadata GP includes alongside the token, when present. */
  cardType?: string;
  maskedCardNumber?: string;
}

export interface GpFieldValidity {
  number?: boolean;
  expiration?: boolean;
  cvv?: boolean;
}

interface GpForm {
  on(event: string, cb: (resp: unknown) => void): void;
  dispose?: () => void;
}

declare global {
  interface Window {
    GlobalPayments?: {
      configure(opts: Record<string, unknown>): void;
      ui: { form(opts: Record<string, unknown>): GpForm };
      on?(event: string, cb: (err: unknown) => void): void;
    };
  }
}

const GP_SCRIPT_URL = 'https://js.paygateway.com/secure_payment/v1/globalpayments.js';

let scriptPromise: Promise<void> | undefined;

/** Load the GP library once; resolves when window.GlobalPayments exists. */
function loadGpScript(): Promise<void> {
  if (window.GlobalPayments) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GP_SCRIPT_URL;
      s.async = true;
      s.onload = () => (window.GlobalPayments ? resolve() : reject(new Error('GlobalPayments global missing after script load')));
      s.onerror = () => {
        scriptPromise = undefined; // allow retry on a later mount
        reject(new Error('Failed to load Global Payments script'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export interface MountGpFieldsOptions {
  apiKey: string;
  environment: 'test' | 'prod';
  /** CSS selectors for the empty target divs (already in the DOM). */
  targets: { number: string; expiration: string; cvv: string; submit: string };
  /** Label for GP's submit button — e.g. "Pay Now $94.55". */
  submitText?: string;
  onToken: (result: GpTokenResult) => void;
  onError: (message: string) => void;
  onValidity?: (v: GpFieldValidity) => void;
}

/**
 * Configure GP and render the hosted fields into the targets.
 * Returns a cleanup function. Fails soft: any error surfaces through
 * `onError` and the cleanup is still safe to call.
 */
/** Transaction bridge status: until a server-side charge integration
 *  exists (B4), completions are SIMULATED — prod is refused outright. */
export const GP_BRIDGE_IS_PROTOTYPE = true;

/**
 * "pkapi_cert_…" / "pkapi_prod_…" is a Heartland/Portico **SecureSubmit** public
 * key — a DIFFERENT product from Hosted Fields, not a variant of its key.
 *
 * It matters because globalpayments.js bundles both gateways and the setting
 * name picks which one runs. Configured as `publicApiKey` a pkapi_ key selects
 * the Heartland gateway, whose sandbox assets come from
 * `https://hps.github.io/token/gp-<version>/` — a host that now 404s for every
 * version (checked 2026-08-20), so the field iframes load a 404 page and freeze.
 * Configured the Hosted Fields way it simply fails to authenticate.
 *
 * Neither is fixable here; the answer is the right key. Detect it and say so.
 */
const isSecureSubmitKey = (key: string) => /^pkapi_/.test(key.trim());

export async function mountGpHostedFields(opts: MountGpFieldsOptions): Promise<() => void> {
  let form: GpForm | undefined;
  if (GP_BRIDGE_IS_PROTOTYPE && opts.environment === 'prod') {
    opts.onError('Payments are not enabled on this site yet.');
    console.error('[gpHostedFields] gpEnvironment="prod" REFUSED — the transaction bridge is a prototype (no server-side charge exists)');
    return () => {};
  }
  // Fail fast and legibly rather than mounting fields that can never work.
  if (isSecureSubmitKey(opts.apiKey)) {
    opts.onError('Card entry is not configured correctly for this site.');
    console.error(
      '[gpHostedFields] The configured key starts with "pkapi_", which is a Heartland SecureSubmit '
      + 'public key, not a Hosted Fields CLIENT-SIDE API key. Hosted Fields needs the client-side key '
      + 'from the Global Payments portal (the one paired with a server-side key for the sale). '
      + 'See partner.globalpayments.com → Card Not Present → Hosted Fields → Configuration.',
    );
    return () => {};
  }
  try {
    await loadGpScript();
    const GP = window.GlobalPayments!;
    // Exactly the documented configuration (Hosted Fields → Configuration,
    // step 3). X-GP-Environment takes 'test' or 'prod'.
    GP.configure({
      'X-GP-Api-Key': opts.apiKey.trim(),
      'X-GP-Environment': opts.environment,
      enableAutocomplete: true,
    });
    GP.on?.('error', (err) => {
      console.error('[gpHostedFields] runtime error:', err);
    });
    form = GP.ui.form({
      fields: {
        'card-number': { target: opts.targets.number, placeholder: '•••• •••• •••• ••••' },
        'card-expiration': { target: opts.targets.expiration, placeholder: 'MM / YYYY' },
        'card-cvv': { target: opts.targets.cvv, placeholder: '•••' },
        submit: { target: opts.targets.submit, text: opts.submitText ?? 'Use this card' },
      },
      styles: GP_FIELD_STYLES,
    });
    const validity: GpFieldValidity = {};
    form.on('token-success', (raw: unknown) => {
      const resp = raw as { temporary_token?: unknown; card_type?: string; masked_card_number?: string; card?: { type?: string; masked_card_number?: string } };
      // A "success" with no usable token must NOT advance the flow
      // (review finding #6): require a plausible single-use token shape.
      const token = typeof resp?.temporary_token === 'string' ? resp.temporary_token.trim() : '';
      if (token.length < 8) {
        opts.onError('Card processing returned an invalid response — please try again.');
        console.error('[gpHostedFields] token-success carried no usable temporary_token');
        return;
      }
      opts.onToken({
        temporaryToken: token,
        cardType: resp?.card_type ?? resp?.card?.type,
        maskedCardNumber: resp?.masked_card_number ?? resp?.card?.masked_card_number,
      });
    });
    form.on('token-error', (resp: unknown) => {
      const msg = (resp as { error?: { message?: string } })?.error?.message;
      opts.onError(msg ?? 'Card details are incomplete or invalid.');
    });
    const validResp = (r: unknown) => !!(r as { valid?: boolean })?.valid;
    form.on('card-number-test', (resp) => { validity.number = validResp(resp); opts.onValidity?.({ ...validity }); });
    form.on('card-expiration-test', (resp) => { validity.expiration = validResp(resp); opts.onValidity?.({ ...validity }); });
    form.on('card-cvv-test', (resp) => { validity.cvv = validResp(resp); opts.onValidity?.({ ...validity }); });
  } catch (err) {
    console.warn('[gpHostedFields] mount failed:', err);
    opts.onError(err instanceof Error ? err.message : 'Payment fields failed to load.');
  }
  return () => {
    try { form?.dispose?.(); } catch { /* GP may not expose dispose in all versions */ }
  };
}

// Styles are injected by GP into ITS iframes — plain CSS-in-JS objects,
// scoped per selector. Kept close to rf2-field-input so the hosted inputs
// read as part of the same form.
const GP_FIELD_STYLES = {
  input: {
    'font-size': '16px',
    'font-family': 'Roboto, Arial, sans-serif',
    color: '#101318',
  },
  button: {
    'background-color': '#101318',
    color: '#ffffff',
    border: 'none',
    'border-radius': '8px',
    padding: '14px 24px',
    'font-size': '16px',
    'font-weight': '700',
    cursor: 'pointer',
    width: '100%',
  },
};
