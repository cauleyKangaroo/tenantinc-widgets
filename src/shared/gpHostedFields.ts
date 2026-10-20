// ===========================================================================
// Global Payments Hosted Fields — the card number and expiry live in GP's
// own iframes, so those digits never enter our JavaScript.
//
// WHAT THIS CAN AND CANNOT GIVE US (verified against the sandbox 2026-08-25):
//
//   - a real single-use token .............. yes
//   - the gateway's masked number .......... yes ("************1111")
//   - the real card number ................. NEVER (that is the whole point)
//   - the real expiry ...................... no — the token response carries
//                                            only `card.number`
//   - the real CVV ......................... no
//   - the card brand ....................... no
//
// Hummingbird's finalize/lease now take the card as `hosted-card`: the token
// plus the EXPIRY (exp_mo / exp_yr are required — verified 2026-10-16) and
// the CVV. Neither can come out of a frame, so BOTH are typed into fields of
// our own: `card-cvv` was never a frame here, and `card-expiration` is now
// optional (`expiryTarget` omitted ⇒ no frame). The gateway tokenizes from
// the number alone — verified against the sandbox tokenizer 2026-10-16, with
// and without an expiry it answers the same `{ token_value, card.number }`.
// No static test PAN is sent any more. See server/RENTAL_FLOW_API.md.
//
// Loading GP's library is the one remote dependency in this bundle. It fails
// soft: if the script will not load, the caller keeps its plain inputs and
// the rental still completes. A payment form that renders nothing because a
// CDN blinked is worse than one that is merely less private.
// ===========================================================================

/* Inlined by webpack as a data: URI (asset/inline). It has to be a data: URI
   rather than a URL: the frames are on GP's origin and can fetch nothing of
   ours. Printable-ASCII subset of Poppins 400 — see FIELD_STYLES. */
import poppinsWoff2 from './assets/poppins-400-ascii.woff2';

/** Officially Heartland-hosted; `hps.github.io` serves a byte-identical copy. */
const LIB = 'https://api2.heartlandportico.com/SecureSubmit.v1/token/gp-1.0.0/globalpayments.js';

interface IframeFieldLike {
  /** Posts `ui:iframe-field:set-focus`; the frame answers by calling
   *  `el.focus()` on its own input. The ONLY way to move the caret into a
   *  hosted field — it is cross-origin, so nothing else reaches it. */
  setFocus(): void;
  /** Posts `ui:iframe-field:set-placeholder` — changes the live frame's
   *  placeholder (gp-1.0.0, IframeField.prototype.setPlaceholder). */
  setPlaceholder(placeholder: string): void;
}

interface UIFormLike {
  on(event: string, listener: (resp: unknown) => void): UIFormLike;
  ready(fn: () => void): void;
  dispose(): void;
  /** Keyed by GP's own field names: 'card-number', 'card-expiration', … */
  frames?: Record<string, IframeFieldLike | undefined>;
}

interface GlobalPaymentsApi {
  configure(options: Record<string, unknown>): void;
  ui: {
    form(options: {
      fields: Record<string, unknown>;
      styles?: Record<string, Record<string, string> | string>;
    }): UIFormLike;
  };
}

declare global {
  interface Window { GlobalPayments?: GlobalPaymentsApi }
}

/** Promise-cached: several widgets on one page must not each inject the tag. */
let loader: Promise<GlobalPaymentsApi | null> | null = null;

function loadLibrary(): Promise<GlobalPaymentsApi | null> {
  if (loader) return loader;
  loader = new Promise<GlobalPaymentsApi | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    if (window.GlobalPayments) { resolve(window.GlobalPayments); return; }

    // Reuse a tag another instance already added, rather than racing it.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LIB}"]`);
    const tag = existing ?? document.createElement('script');
    const done = () => resolve(window.GlobalPayments ?? null);
    tag.addEventListener('load', done);
    tag.addEventListener('error', () => {
      console.warn('[gpHostedFields] Global Payments library failed to load — falling back to plain card inputs.');
      resolve(null);
    });
    if (!existing) {
      tag.src = LIB;
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return loader;
}

export interface HostedCardResult {
  /** Single-use "supt_…" token. */
  token: string;
  /** The gateway's own mask, e.g. "************1111". */
  masked: string;
}

export interface MountHostedCardOptions {
  publicKey: string;
  /** CSS selectors — GP resolves these itself, so they must be in the DOM. */
  numberTarget: string;
  /** Omit to collect the expiry in a field of your own (see the header). */
  expiryTarget?: string;
  submitTarget: string;
  onToken(result: HostedCardResult): void;
  onError(message: string): void;
  /** All frames have registered; the caller can stop showing a placeholder. */
  onReady(): void;
  /**
   * Let the number frame be TALLER than one line (the caller's floating-label
   * layout stretches it over the whole field box so a tap anywhere in the box
   * lands in it). The input fills the frame (100vh, which inside an iframe is
   * the iframe's own height) and pads its text down to the value line. In a
   * normal 20px frame both resolve to exactly what they were: 20px tall, no
   * padding — so where the frame is not stretched nothing changes.
   */
  tallNumberFrame?: boolean;
  /**
   * A hosted field has been typed in, and whether what is in it now validates.
   *
   * GP posts `card-number-test` / `card-expiration-test` on EVERY input, not
   * just on success — the invalid branch posts `{ valid: false }` too — so this
   * is the only view the parent gets of a frame's contents. It is enough to
   * tell a filled field from an empty one, which is what the floating label
   * needs; it is not enough to see the value, and nothing here ever should.
   */
  onFieldValid?(field: 'number' | 'expiry', valid: boolean): void;
}

/**
 * Styles applied INSIDE the frames. They have to be literal values: the frame
 * is a separate document on GP's origin and cannot see our custom properties,
 * so `var(--hb-field-text)` would resolve to nothing. Kept in step with
 * `.rf-cardrow-input` in screens.css — if that changes, change this too.
 */
const FIELD_STYLES: Record<string, Record<string, string> | string> = {
  /*
   * THE WEBFONT, CARRIED INTO THE FRAME AS A DATA: URI.
   *
   * This block used to say the font could not be loaded here at all. That was
   * wrong, and wrong for a reason worth keeping: it tested @import and then
   * generalised from it. Re-verified against the gp-1.0.0 globalpayments.js
   * production actually loads —
   *
   *   - json2css() emits a STRING value as a declaration (`key:value;`) and an
   *     OBJECT value as a rule (`key{…}`). @import has no block, so it can only
   *     ever be emitted as the invalid declaration `@import:url(…);` — true,
   *     and the reason that route failed. But @font-face IS a block, so as a
   *     nested object it serialises to exactly the rule we want.
   *   - The stylesheet is injected INSIDE the frame: IframeField.addStylesheet
   *     posts the CSS to the frame, whose handler calls addStylesheet(), which
   *     appends a <style> to its own <head>. Our rules already reach it — that
   *     is how everything below works.
   *   - A data: URI needs no fetch and no CORS, so the frame's origin stops
   *     mattering. field.html (hps.github.io) sends no CSP header at all, so
   *     there is nothing to forbid it.
   *
   * The face is subsetted to printable ASCII — 4.6KB of Poppins 400 (the Montserrat file it replaced was 9.5KB), against far more for the
   * full latin subset — since all these two frames can ever show is a card
   * number, an expiry, and their two placeholders.
   */
  '@font-face': {
    'font-family': "'Poppins'",
    'font-style': 'normal',
    // Only 400 is inlined: nothing in these frames asks for another weight.
    'font-weight': '400',
    // Quoted, so the base64 payload cannot terminate the url() token early.
    src: `url("${poppinsWoff2}") format('woff2')`,
    // The digits must not render in a fallback face for a frame or two and then
    // reflow. There is no network fetch to wait on, so there is nothing to gain
    // by swapping.
    'font-display': 'block',
  },

  '#secure-payment-field': {
    // The frame is exactly the box the value occupies, and .rf-gpfield has
    // already pushed that box down to clear the floated label. Repeating the
    // offset in here shifted the digits a second time and pushed them out of
    // the frame — which is what the first cut of this looked like.
    width: '100%',
    height: '20px',
    margin: '0',
    padding: '0',
    border: '0',
    // GP's own defaults put a bottom rule under the field. Ours is one border
    // around the whole row, so every edge of the inner input has to go.
    'border-bottom': '0',
    'box-sizing': 'border-box',
    outline: 'none',
    '-webkit-appearance': 'none',
    'box-shadow': 'none',
    background: 'transparent',
    color: '#101318',
    // Named, not `inherit`: the frame is a separate document and inherits
    // nothing from us. Poppins now resolves against the @font-face above;
    // the stack after it is the kit's own, so an environment that somehow
    // cannot use the inlined face degrades the same way the rest of the flow
    // does rather than to GP's default.
    'font-family': "'Poppins', 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    /*
     * Pinned, and the browser told to leave it alone.
     *
     * The digits were shrinking as the card number filled. These frames are
     * ~20px tall and only as wide as their cell, and a narrow iframe is exactly
     * what triggers mobile text auto-sizing — the engine rescales text it
     * decides is too small or too wide for its block. `text-size-adjust: 100%`
     * is the switch for that, and the two vendor spellings are both still
     * needed. `!important` because GP's own sheet loads after this one.
     */
    'font-size': '16px !important',
    '-webkit-text-size-adjust': '100%',
    '-moz-text-size-adjust': '100%',
    'text-size-adjust': '100%',
    'line-height': '20px',
    // A shrink-to-fit input would otherwise scale its own text down as the
    // value grows past the box; let it scroll instead, as a plain input does.
    'text-overflow': 'clip',
    'min-width': '0',
  },
  // Focus is drawn by the row's own border, exactly as it is for the plain
  // inputs — a second ring inside the frame would sit inside the first.
  '#secure-payment-field:focus': {
    outline: 'none',
    border: '0',
    'border-bottom': '0',
    'box-shadow': 'none',
  },
  /*
   * The frame's placeholder IS the label for a hosted cell, and the parent
   * draws none. Only the frame knows whether it is empty — GP reports neither
   * length nor emptiness — so anything the parent drew had to infer it, and
   * every available inference was wrong in one direction: over live digits, or
   * stranded above an empty field.
   * Matches .rf-cardcell-label at rest, and goes on focus rather than on the
   * first keystroke, which is the behaviour asked for.
   */
  /* Colour only — it inherits the field's own type above, so it cannot land in
     a different size or place from the digits that replace it. opacity is for
     Firefox, which dims placeholders. */
  '#secure-payment-field::placeholder': { color: '#637381', opacity: '1' },
  /* Hidden on click, back on blur if nothing was typed. The blur half is the
     browser's own doing: an empty input shows its placeholder again. */
  '#secure-payment-field:focus::placeholder': { color: 'transparent' },
  /*
   * field.html zeroes its own margins but never sets a HEIGHT — html, body and
   * the wrapper are all `flex: 1 1 auto` with no height, so a `height: 100%`
   * on the button resolves against an auto-height parent and collapses to the
   * height of its text. Over a 64px button that left dead bands top and bottom
   * and the corners unclickable. Giving the chain an explicit height is what
   * makes the whole button area live.
   */
  html: { height: '100%' },
  '#secure-payment-field-body': { height: '100%' },
  '#secure-payment-field-wrapper': { height: '100%' },
  // The submit frame sits invisibly over our own styled button — see
  // .rf-gp-submit in screens.css. It must still fill the frame so that every
  // part of the button is clickable.
  '#secure-payment-field[type=button]': {
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
    color: 'transparent',
    cursor: 'pointer',
  },
};

/*
 * FIELD_STYLES for a number frame that may be stretched over its whole field
 * box (MountHostedCardOptions.tallNumberFrame). Only the input's height and top
 * padding differ, and both are written so a normal 20px frame is unchanged:
 *   height: 100vh       — inside an iframe, the iframe's own height: 20px in
 *                         a 20px frame (as before), the full box when tall;
 *   padding-top: clamp(0px, 100vh - 20px, 15px)
 *                       — 0 in a 20px frame; 15px in any full field box
 *                         (54px on a phone, 56px in the desktop row). With
 *                         border-box and the 20px line centred in what is
 *                         left, 15px puts the digits 7.5px below centre —
 *                         exactly where FormField's value line sits.
 */
const TALL_FIELD_STYLES: typeof FIELD_STYLES = {
  ...FIELD_STYLES,
  '#secure-payment-field': {
    ...(FIELD_STYLES['#secure-payment-field'] as Record<string, string>),
    height: '100vh',
    'padding-top': 'clamp(0px, calc(100vh - 20px), 15px)',
  },
};

export interface HostedCardHandle {
  dispose(): void;
  /**
   * Move the caret into one of the hosted cells, so the row can be typed
   * straight through. Verified against gp-1.0.0: IframeField.prototype.setFocus
   * posts `set-focus`, and the frame's handler is
   * `document.getElementById(paymentFieldId).focus()`.
   * A no-op if the frame is not there — a missing frame must never throw in
   * the middle of someone typing.
   */
  focusField(field: 'number' | 'expiry'): void;
  /**
   * Change the card-number frame's placeholder on the live frame (GP's
   * IframeField.setPlaceholder posts `set-placeholder`) — no remount, so a
   * typed number survives. '' when the parent draws its own floating label.
   */
  setNumberPlaceholder(text: string): void;
}

/**
 * Mount the hosted card fields. Resolves to null when hosted fields are not
 * available, which is the caller's signal to keep its plain inputs.
 */
export async function mountHostedCard(
  opts: MountHostedCardOptions,
): Promise<HostedCardHandle | null> {
  const key = opts.publicKey.trim();
  if (!key) return null;
  const gp = await loadLibrary();
  if (!gp) return null;

  try {
    gp.configure({ publicApiKey: key });
    const form = gp.ui.form({
      fields: {
        /* REAL text, because the frame is the only thing that can do this
           correctly. A placeholder shows while its input is empty and returns
           the moment it is emptied — the browser inside the frame knows that;
           the parent cannot, because GP publishes no emptiness, length or
           focus. Every parent-drawn version of this label got stuck on one
           edge or another. */
        'card-number': { target: opts.numberTarget, placeholder: 'Card Number' },
        /* MM / YY. The plain cell's label, its aria-label and its error copy
           all say MM / YY and EXPIRY_DIGITS is 4, so the hosted placeholder was
           the only thing asking for four year digits. GP's expiration validator
           takes either, so this is the label agreeing with the rest. */
        ...(opts.expiryTarget ? { 'card-expiration': { target: opts.expiryTarget, placeholder: 'MM / YY' } } : {}),
        // GP will only tokenize from a gesture inside its own frame — the
        // form object exposes no programmatic equivalent — so this button
        // has to exist even though ours is the one the shopper sees.
        submit: { target: opts.submitTarget, value: 'Pay' },
      },
      styles: opts.tallNumberFrame ? TALL_FIELD_STYLES : FIELD_STYLES,
    });

    form.ready(() => opts.onReady());

    if (opts.onFieldValid) {
      const report = (field: 'number' | 'expiry') => (resp: unknown) => {
        const valid = !!(resp as { valid?: boolean } | undefined)?.valid;
        opts.onFieldValid?.(field, valid);
      };
      form.on('card-number-test', report('number'));
      if (opts.expiryTarget) form.on('card-expiration-test', report('expiry'));
    }

    form.on('token-success', (resp) => {
      /*
       * The library does NOT hand over the gateway reply verbatim — it
       * normalises first (actionNormalizeResponse$2, the publicApiKey
       * gateway):
       *
       *     { paymentReference: data.token_value,
       *       details: { cardNumber: data.card.number } }
       *
       * so the wire's `token_value` / `card.number` never reach a listener.
       * The raw names are still read as a fallback, because a different
       * gateway variant in the same bundle passes the reply through untouched
       * and a future version could switch which one applies.
       */
      const outer = resp as {
        paymentReference?: string;
        details?: { cardNumber?: string };
        token_value?: string;
        card?: { number?: string };
      };
      const token = outer?.paymentReference || outer?.token_value;
      const masked = outer?.details?.cardNumber || outer?.card?.number || '';
      if (!token) {
        // Distinct from the token-error wording on purpose: this branch means
        // the card WAS accepted and we failed to read the reply, which is our
        // bug, not the shopper's card. Telling them to check their details
        // would send them round a loop that cannot succeed.
        console.error('[gpHostedFields] token-success carried no token — shape:', resp);
        opts.onError('We could not complete the card check. Please try again, or contact the office if it keeps happening.');
        return;
      }
      opts.onToken({ token, masked });
    });

    form.on('token-error', (resp) => {
      /*
       * Errors are normalised too. The gateway's {error:{message,param}} is
       * turned into {error: true, reasons: [{code, message}]} — so `reasons`
       * is the shape that actually arrives, and `error` is a BOOLEAN here,
       * not an object. The raw forms are still read because the frame's own
       * client-side validation (which fires before any network call) posts a
       * flat {code, message} instead.
       */
      const r = resp as {
        error?: { message?: string; param?: string };
        message?: string;
        reasons?: Array<{ message?: string }>;
      };
      const detail = r?.error?.message || r?.message
        || r?.reasons?.find((x) => x?.message)?.message;
      // Logged whole: the message names a field, and when it does not, this is
      // the only way to find out what GP actually objected to.
      console.warn('[gpHostedFields] tokenization rejected:', resp);
      opts.onError(detail || 'The card could not be verified. Please check the details and try again.');
    });

    return {
      dispose: () => { try { form.dispose(); } catch { /* already gone */ } },
      focusField: (field) => {
        if (field === 'expiry' && !opts.expiryTarget) return;
        const name = field === 'number' ? 'card-number' : 'card-expiration';
        try { form.frames?.[name]?.setFocus(); } catch { /* frame gone */ }
      },
      setNumberPlaceholder: (text) => {
        try { form.frames?.['card-number']?.setPlaceholder(text); } catch { /* frame gone */ }
      },
    };
  } catch (err) {
    console.warn('[gpHostedFields] could not mount hosted fields:', err);
    return null;
  }
}
