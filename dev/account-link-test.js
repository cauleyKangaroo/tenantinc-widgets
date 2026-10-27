// Where an account link goes, decided before navigating rather than after.
//
// The rule has to match #19's own gate. If these two disagree the reader gets
// either a pointless hop (the bug this fixes) or, worse, a redirect loop.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(sessionRaw) {
  const src = ['accountSession', 'accountLink']
    .map((m) => fs.readFileSync(require.resolve(`../src/shared/${m}.ts`), 'utf8'))
    .join('\n')
    // Strip module syntax: both files run together in one sandbox.
    .replace(/^import[^;]+;$/gm, '')
    .replace(/^export /gm, '');
  const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  const ctx = {
    exports: {},
    Date,
    JSON,
    window: { sessionStorage: { getItem: () => sessionRaw, removeItem() {} } },
  };
  vm.createContext(ctx);
  vm.runInContext(`${js}; exports.accountDestination = accountDestination;`, ctx);
  return ctx.exports.accountDestination;
}

const live = JSON.stringify({ token: 't', expiresAt: Date.now() + 60000, contactId: 'c1' });
const expired = JSON.stringify({ token: 't', expiresAt: Date.now() - 1, contactId: 'c1' });

// Gated: the session decides.
assert.equal(load(live)('/my-account', '/login', true), '/my-account', 'signed in goes to the account page');
assert.equal(load(null)('/my-account', '/login', true), '/login', 'signed out goes straight to login');
assert.equal(load(expired)('/my-account', '/login', true), '/login', 'an expired token is signed out');
assert.equal(load('not json')('/my-account', '/login', true), '/login', 'unreadable storage is signed out');

// NOT gated: #19 is not gated either (no login API, or the Duda editor), so it
// shows the account page to everyone and the link must not divert.
assert.equal(load(null)('/my-account', '/login', false), '/my-account', 'ungated keeps the target when signed out');
assert.equal(load(live)('/my-account', '/login', false), '/my-account', 'ungated keeps the target when signed in');

// The target is passed through untouched — Pay Bill carries ?view=payment.
assert.equal(
  load(live)('/my-account?view=payment', '/login', true),
  '/my-account?view=payment',
  'the payment view survives',
);
assert.equal(load(null)('/my-account?view=payment', '/login', true), '/login', '...and still diverts when signed out');

// An operator-set login page is respected.
assert.equal(load(null)('/my-account', '/sign-in', true), '/sign-in', 'a custom login URL is used');

console.log('account-link: 9 assertions passed');
