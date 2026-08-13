// Unit tests for the shared phone helpers (src/shared/ui/phone.ts).
// No test framework in this repo — this mirrors dev/smoke-test.js: plain node
// + assert. The helper is compiled to CJS first (see the "test:phone" script),
// so we exercise the REAL source, not a copy.
//   npm run test:phone
const assert = require('assert');
const { formatPhoneInput, normalizePhone, isPossiblePhone } = require('../.tmp-test/phone.js');

let passed = 0;
const eq = (label, actual, expected) => {
  assert.strictEqual(actual, expected, `${label}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`);
  passed += 1;
};

// 1) US — plain 10 digits format + normalise to E.164.
eq('US display', formatPhoneInput('4155552671', 'US'), '(415) 555-2671');
eq('US partial display', formatPhoneInput('415555', 'US'), '(415) 555');
eq('US E.164', normalizePhone('4155552671', 'US'), '+14155552671');

// 2) +1 — explicit NANP country code is grouped by its own country.
eq('+1 display', formatPhoneInput('+14155552671'), '+1 415 555 2671');
eq('+1 E.164', normalizePhone('+14155552671', 'US'), '+14155552671');

// 3) Canadian — NANP, so US/CA default both yield the same +1 E.164.
eq('CA E.164 (CA default)', normalizePhone('4165557890', 'CA'), '+14165557890');
eq('CA E.164 (US default)', normalizePhone('4165557890', 'US'), '+14165557890');

// 4) International — a UK "+44" number keeps its own plan, not reshaped to US.
eq('UK display', formatPhoneInput('+442071838750'), '+44 20 7183 8750');
eq('UK E.164', normalizePhone('+442071838750', 'US'), '+442071838750');

// 5) Paste — a pre-formatted string is accepted (idempotent display + E.164).
eq('paste display', formatPhoneInput('(415) 555-2671', 'US'), '(415) 555-2671');
eq('paste E.164', normalizePhone('(415) 555-2671', 'US'), '+14155552671');

// 6) Invalid — too short / empty → undefined + not possible (blocks submit).
eq('short E.164', normalizePhone('123', 'US'), undefined);
eq('empty E.164', normalizePhone('', 'US'), undefined);
eq('short isPossible', isPossiblePhone('123', 'US'), false);
eq('valid isPossible', isPossiblePhone('4155552671', 'US'), true);

console.log(`PASS: ${passed} phone helper assertions`);
