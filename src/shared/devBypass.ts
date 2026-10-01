// ===========================================================================
// HARNESS-ONLY validation bypass.
//
// Filling a full card or bank form by hand every time you want to see what is
// past it is slow, so the dev harness can switch the required-field gate off.
//
// THIS MUST NEVER REACH A CUSTOMER SITE, and it is stopped three times over —
// the first of which means the code is not merely inert in production, it is
// not THERE:
//
//   1. `__HB_DEV_HARNESS__` is a BUILD-TIME constant, substituted by webpack's
//      DefinePlugin: `true` under `--mode development`, `false` under
//      `--mode production` (what `npm run build`, and therefore everything
//      shipped, uses). `if (!false) return false` folds away and the minifier
//      drops the rest of this function as dead code, so a production bundle
//      contains none of it. There is a test for exactly that — see below.
//
//   2. Even in a development build it only answers true on a LOCAL host. A dev
//      bundle accidentally served from GitHub Pages or a Duda site therefore
//      still validates normally.
//
//   3. It is off until something turns it on, and the only thing that does is
//      the dev harness's own checkbox.
//
// To confirm 1 after a build:
//     grep -c HB_SKIP_VALIDATION dist/*.js      → every file must print 0
// ===========================================================================

/** Substituted by webpack.DefinePlugin. See webpack.config.js. */
declare const __HB_DEV_HARNESS__: boolean;

/** The flag the harness sets. Read from both so a reload keeps the choice. */
const FLAG = '__HB_SKIP_VALIDATION';

/** localhost, 127.0.0.1, ::1 and the .local names a dev box answers to. */
function onLocalHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
      || h === '[::1]' || h === '' || h.endsWith('.local');
  } catch {
    return false;
  }
}

/**
 * Should the required-field gate be skipped?
 *
 * Always false in anything built for production — see the header.
 */
export function skipValidation(): boolean {
  // Compiles to `if (!false) return false;` in production, which is the whole
  // function, so nothing below survives into the shipped bundle.
  if (!__HB_DEV_HARNESS__) return false;
  if (!onLocalHost()) return false;
  try {
    const w = window as unknown as Record<string, unknown>;
    if (w[FLAG] === true) return true;
    return window.localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}
