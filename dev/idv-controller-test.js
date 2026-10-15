const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const saved = new Map();
  let rejectSessionWrites = false;
  const navigations = [];
  const tabs = [];
  let blockPopups = false;
  let captureDevice = 'mobile';
  let pollingOptions;
  const openTab = () => {
    if (blockPopups) return null;
    const tab = { closed: false, opener: {}, location: { href: '' }, close() { this.closed = true; } };
    tabs.push(tab);
    return tab;
  };
  global.window.open = openTab;
  const context = {
    exports: {},
    window: {
      open: openTab,
      location: { assign: (url) => navigations.push(url) },
      matchMedia: () => ({ addEventListener() {}, removeEventListener() {} }),
    },
    AbortController, Date,
    require(name) {
      if (name === 'react') return React;
      if (name === './idvApi') return { ...require('../.tmp-idv-test/idvApi.js'), captureDevice: () => captureDevice };
      if (name === './idvPolling') return { startIdvPolling: value => { pollingOptions = value; return () => {}; } };
      if (name === './idvStorage') return {
        idvSessionGet: (key) => saved.get(key) ?? null,
        idvSessionSet: (key, value) => {
          if (rejectSessionWrites && !key.endsWith(':start-uncertain')) return false;
          saved.set(key, value); return true;
        },
        idvSessionRemove: (key) => saved.delete(key),
      };
      return require(`../.tmp-idv-test/${name.slice(2)}.js`);
    },
  };
  const source = fs.readFileSync(require.resolve('../src/widget-rental-flow-2step/useIdvController.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  let controller;
  let resolveStart;
  let calls = 0;
  let signal;
  const identity = { first: 'Test', last: 'Renter', email: 'test@example.com', phone: '5555555555', leaseId: 'lease' };
  const options = {
    enabled: true, identity, scope: { companyId: 'co', propertyId: 'prop' },
    allowedVerificationHosts: ['verify.example.com'],
    api: { start: (_, __, ___, abortSignal) => {
      calls += 1;
      signal = abortSignal;
      return new Promise((resolve) => { resolveStart = resolve; });
    } },
  };
  function Probe({ value }) { controller = context.exports.useIdvController(value); return null; }
  let root = createRoot(document.getElementById('root'));
  const render = async (value) => React.act(async () => root.render(React.createElement(Probe, { value })));
  const response = { idvId: 'session', expiresAt: Date.now() / 1000 + 60, verificationUrl: 'https://verify.example.com/start' };
  await render(options);
  assert.equal(controller.state.kind, 'ready');
  let pending;
  await React.act(async () => {
    pending = controller.start();
    void controller.start();
  });
  assert.equal(calls, 1, 'overlapping starts are locked synchronously');
  assert.equal(tabs.length, 1, 'blank tab opens synchronously before start resolves');
  assert.equal(tabs[0].location.href, '');
  assert.equal(tabs[0].opener, null, 'new tab cannot control Mariposa');
  await React.act(async () => controller.reset());
  assert.equal(tabs[0].closed, true, 'reset closes the pending blank tab');
  assert.equal(signal.aborted, true);
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(navigations.length, 0, 'reset rejects late navigation');
  assert.equal(saved.has('mariposa:idv:v1:co:prop:lease'), false, 'reset rejects late session writes');
  await render({ ...options, identity: { ...identity, leaseId: 'lease2' } });
  await React.act(async () => { pending = controller.start(); });
  await render({ ...options, enabled: false });
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(navigations.length, 0, 'disabled scope rejects late navigation');
  assert.equal(tabs.at(-1).closed, true, 'disabled scope closes the pending blank tab');
  const mobile = { ...options, identity: { ...identity, leaseId: 'mobile-tab' }, beforeSameTabNavigation: () => false };
  await render(mobile);
  await React.act(async () => { pending = controller.start(); });
  const mobileTab = tabs.at(-1);
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(mobileTab.location.href, response.verificationUrl, 'mobile navigates the new tab even if snapshot storage fails');
  assert.equal(mobileTab.closed, false);
  assert.equal(controller.state.kind, 'pending');
  assert.equal(controller.popupBlocked, false);
  const preparedOptions = { ...options, api: { ...options.api }, identity: { ...identity, leaseId: undefined, contactId: 'pre-payment-contact' } };
  await render(preparedOptions);
  const preparedTab = openTab();
  preparedTab.opener = null;
  const beforePreparedStart = tabs.length;
  await React.act(async () => { pending = controller.start(preparedTab); });
  assert.equal(tabs.length, beforePreparedStart, 'pre-payment start reuses its earlier user-gesture tab');
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(preparedTab.location.href, response.verificationUrl);
  assert.equal(saved.has('mariposa:idv:v1:co:prop:pre-payment-contact'), true, 'pre-payment sessions use the lead contact ID, not a lease');
  await render({ ...preparedOptions, identity: { ...identity, leaseId: undefined, contactId: 'pre-payment-blocked' } });
  const beforeBlockedPreparedStart = tabs.length;
  await React.act(async () => { pending = controller.start(null); });
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(tabs.length, beforeBlockedPreparedStart, 'a blocked prepared tab does not open a second popup after awaiting the lead');
  assert.equal(controller.popupBlocked, true);
  const startsBeforeContinue = calls;
  await React.act(async () => { assert.equal(controller.continueInNewTab(), true); });
  assert.equal(tabs.at(-1).location.href, response.verificationUrl);
  assert.equal(calls, startsBeforeContinue, 'Continue reuses the existing session');
  assert.equal(navigations.length, 0, 'mobile never replaces Mariposa');
  blockPopups = true;
  await render({ ...options, identity: { ...identity, leaseId: 'popup-blocked' } });
  await React.act(async () => { pending = controller.start(); });
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(controller.state.kind, 'pending', 'popup blocking does not fail the created session');
  assert.equal(controller.popupBlocked, true);
  const blockedStarts = calls;
  await React.act(async () => { assert.equal(controller.continueInNewTab(), false); });
  blockPopups = false;
  await React.act(async () => { assert.equal(controller.continueInNewTab(), true); });
  assert.equal(controller.popupBlocked, false);
  assert.equal(calls, blockedStarts, 'blocked popup retry must not create a billable session');
  await render({ ...options, identity: { ...identity, leaseId: 'closed-tab' } });
  await React.act(async () => { pending = controller.start(); });
  const closedTab = tabs.at(-1);
  closedTab.close();
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(controller.state.kind, 'pending');
  assert.equal(controller.popupBlocked, true, 'closed placeholder offers Continue instead of same-tab navigation');
  await render({ ...options, identity: { ...identity, leaseId: 'invalid-url' }, api: { start: async () => ({ ...response, verificationUrl: 'https://untrusted.example.com/' }) } });
  await React.act(async () => controller.start());
  assert.equal(controller.state.kind, 'error', 'invalid hosted URL is rejected');
  assert.equal(tabs.at(-1).closed, true, 'invalid URL closes the blank tab');
  assert.equal(navigations.length, 0);
  captureDevice = 'desktop';
  await React.act(async () => root.unmount());
  const desktopRoot = createRoot(document.getElementById('root'));
  const desktopOptions = { ...options, identity: { ...identity, leaseId: 'desktop' }, api: { start: async () => response } };
  await React.act(async () => desktopRoot.render(React.createElement(Probe, { value: desktopOptions })));
  const tabCount = tabs.length;
  await React.act(async () => controller.start());
  assert.equal(tabs.length, tabCount, 'desktop retains SMS handoff without opening a tab');
  assert.equal(controller.handheld, false);
  await React.act(async () => desktopRoot.unmount());
  captureDevice = 'mobile';
  // The remaining race/storage cases run on a fresh root after desktop coverage.
  root = createRoot(document.getElementById('root'));
  const { IdvRequestError } = require('../.tmp-idv-test/idvApi.js');
  const rejected = { ...options, identity: { ...identity, leaseId: 'rejected' }, api: { start: async () => { throw new IdvRequestError('bad phone', false); } } };
  await render(rejected);
  await React.act(async () => controller.start());
  assert.equal(controller.state.retryable, true, 'explicit rejection permits retry');
  assert.equal(tabs.at(-1).closed, true, 'failed starts close the blank tab');
  assert.equal(saved.has('mariposa:idv:v1:co:prop:rejected:start-uncertain'), false);
  await React.act(async () => controller.retry());
  assert.equal(controller.state.kind, 'ready');
  for (const unknown of [false, true]) {
    let attempts = 0;
    const resending = { ...options, identity: { ...identity, leaseId: `resend-${unknown}` }, api: { start: async () => {
      if (++attempts === 1) return response;
      throw new IdvRequestError('resend failed', unknown);
    } } };
    await render(resending);
    await React.act(async () => controller.start());
    const existingUrl = controller.verificationUrl;
    await React.act(async () => { await assert.rejects(controller.resend(), /resend failed/); });
    assert.equal(controller.state.kind, 'pending', 'failed resend preserves existing session');
    assert.equal(controller.state.idvId, response.idvId);
    assert.equal(controller.verificationUrl, existingUrl);
    assert.equal(controller.state.resendUncertain, unknown);
    await render({ ...resending, enabled: false });
    await render(resending);
    assert.equal(controller.state.kind, 'pending', 'reload recovery retains the old session');
    assert.equal(controller.state.resendUncertain, unknown);
  }
  for (const resend of [false, true]) {
    const leaseId = `quota-${resend}`;
    let attempts = 0;
    const quota = { ...options, identity: { ...identity, leaseId }, api: { start: async () => ({ ...response, idvId: `quota-session-${++attempts}` }) } };
    await render(quota);
    rejectSessionWrites = !resend;
    await React.act(async () => controller.start());
    if (resend) {
      rejectSessionWrites = true;
      await React.act(async () => controller.resend());
    }
    const key = `mariposa:idv:v1:co:prop:${leaseId}`;
    assert.equal(controller.state.kind, 'pending', 'storage failure does not abort the active session');
    assert.equal(saved.get(`${key}:start-uncertain`), '1', 'small marker survives failed large session write');
    await render({ ...quota, enabled: false });
    await render(quota);
    if (resend) {
      assert.equal(controller.state.kind, 'pending');
      assert.equal(controller.state.resendUncertain, true);
    } else {
      assert.equal(controller.state.kind, 'error');
      assert.equal(controller.state.retryable, false);
    }
    rejectSessionWrites = false;
  }
  const failed = { ...options, identity: { ...identity, leaseId: 'lease3' }, api: { start: async () => { throw new Error('lost response'); } } };
  await render(failed);
  await React.act(async () => controller.start());
  assert.equal(controller.state.kind, 'error');
  assert.equal(controller.state.retryable, false);
  await React.act(async () => controller.retry());
  assert.equal(controller.state.kind, 'error', 'uncertain start cannot retry');
  await React.act(async () => root.unmount());
  const restoredRoot = createRoot(document.getElementById('root'));
  await React.act(async () => restoredRoot.render(React.createElement(Probe, { value: failed })));
  assert.equal(controller.state.kind, 'error', 'uncertain start remains blocked after remount');
  await React.act(async () => restoredRoot.unmount());
  const rawId = 'idv05d17e25979d41b1be17aaac798d58de';
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const { IdvRequestError: ExpiredError } = require('../.tmp-idv-test/idvApi.js');
  const owner = [identity.first, identity.last, identity.email].map(v => v.trim().toLowerCase()).concat(identity.phone.replace(/\D/g, '')).join('|');
  let polls = 0;
  let starts = 0;
  let pollMode = 'complete';
  const scanned = { idvId: rawId, authenticated: true,
    address: { street: '1 Main St', city: 'Irvine', state: 'CA', zip: '92618' },
    driversLicense: { number: '****5273', state: 'CA', expiration: '2030-02-07' } };
  const guestApi = {
    poll: async () => {
      polls++;
      if (pollMode === 'expired') throw new ExpiredError('This verification session has expired. Please start again.', false);
      if (pollMode === 'down') throw new ExpiredError('gateway timeout', true);
      if (pollMode === 'failed') return { status: 'failed', idvId: rawId, reason: 'mismatch' };
      if (pollMode === 'pending') return { status: 'pending', idvId: rawId };
      if (pollMode === 'bare') return { status: 'complete', idvId: rawId, authenticated: true };
      return { status: 'complete', ...scanned };
    },
    start: async () => { starts++; return { ...response, idvId: rawId }; },
  };
  const guest = contactId => ({ ...options, identity: { ...identity, contactId, leaseId: undefined }, api: guestApi });
  const mount = async (value) => { root = createRoot(document.getElementById('root')); await render(value); };
  const unmount = async () => React.act(async () => root.unmount());

  // A guest with no session of their own is never matched to an earlier one.
  await mount(guest('fresh-guest'));
  assert.equal(controller.state.kind, 'ready', 'a guest verifies now');
  assert.equal(polls, 0, 'no lookup, by email or contact, for a guest');
  await unmount();

  // This checkout's own completed session is re-confirmed on reload.
  const doneKey = 'mariposa:idv:v1:co:prop:done-guest';
  await mount(guest('done-guest'));
  await React.act(async () => controller.start());
  await React.act(async () => pollingOptions.onComplete(scanned));
  assert.equal(controller.state.kind, 'complete');
  const cache = JSON.parse(saved.get(doneKey));
  assert.equal(cache.completed, true, 'finishing the phone flow retains its ID for the lease');
  assert.ok(cache.expiresAt > Date.now() / 1000 && cache.expiresAt <= Date.now() / 1000 + 1801);
  await unmount();
  polls = 0;
  await mount(guest('done-guest'));
  assert.equal(controller.state.kind, 'complete');
  assert.equal(polls, 1, 'the saved completion is checked with the backend');
  assert.equal(controller.state.result.address.street, '1 Main St');
  await unmount();
  pollMode = 'down';
  await mount(guest('done-guest'));
  assert.equal(controller.state.kind, 'error', 'an unknown answer is an error, not a new start');
  assert.equal(controller.state.retryable, true);
  pollMode = 'complete';
  await React.act(async () => { controller.retry(); await settle(); });
  assert.equal(controller.state.kind, 'complete', 'retry checks again');
  assert.equal(JSON.parse(saved.get(doneKey)).expiresAt, cache.expiresAt, 're-confirming keeps the original 30-minute window');
  assert.equal(starts, 1, 'reloads never start another billable session');
  await unmount();
  pollMode = 'bare';
  await mount(guest('done-guest'));
  assert.equal(controller.state.result.address.street, '1 Main St', 'a confirmed result keeps the saved address');
  assert.equal(controller.state.result.driversLicense.number, '****5273', 'and the saved licence');
  await unmount();
  // Browser storage never supplies "verified": a 404 confirms nothing.
  pollMode = 'expired';
  await mount(guest('done-guest'));
  assert.equal(controller.state.kind, 'expired', 'an ended session the server cannot confirm is not verified');
  assert.equal(saved.has(doneKey), false, 'the unconfirmed completion is dropped');
  await unmount();
  saved.set('mariposa:idv:v1:co:prop:forged', JSON.stringify({ completed: true, idvId: 'idv00000000000000000000000000000000', expiresAt: Date.now() / 1000 + 9999, owner }));
  await mount(guest('forged'));
  assert.equal(controller.state.kind, 'expired', 'an edited storage entry is not a verification');
  await unmount();
  for (const mode of ['failed', 'pending']) {
    pollMode = mode;
    saved.set('mariposa:idv:v1:co:prop:not-complete', JSON.stringify({ completed: true, idvId: rawId, expiresAt: Date.now() / 1000 + 600, owner }));
    await mount(guest('not-complete'));
    assert.equal(controller.state.kind, 'expired', `a ${mode} answer does not complete`);
    await unmount();
  }
  assert.equal(starts, 1);

  // Expiry checks this session once more before calling it expired.
  const expiryCase = async (contactId, mode) => {
    pollMode = 'pending';
    await mount(guest(contactId));
    await React.act(async () => controller.start());
    assert.equal(controller.state.kind, 'pending');
    pollMode = mode;
    await React.act(async () => { pollingOptions.onExpired(); await settle(); });
  };
  starts = 0;
  await expiryCase('expiry-complete', 'complete');
  assert.equal(controller.state.kind, 'complete', 'a capture finished while checkout slept is found at expiry');
  assert.equal(saved.has('mariposa:idv:v1:co:prop:expiry-complete:expiry-check'), false);
  await unmount();
  await expiryCase('expiry-gone', 'expired');
  assert.equal(controller.state.kind, 'expired', 'the backend says expired: the session really expired');
  await unmount();
  await expiryCase('expiry-failed', 'failed');
  assert.equal(controller.state.kind, 'failed');
  await unmount();
  await expiryCase('expiry-down', 'down');
  assert.equal(controller.state.kind, 'error');
  assert.equal(controller.state.retryable, true);
  assert.equal(saved.has('mariposa:idv:v1:co:prop:expiry-down:expiry-check'), true, 'an unconfirmed expiry is remembered');
  await unmount();
  polls = 0;
  await mount(guest('expiry-down'));
  assert.equal(polls, 1, 'a reload checks the expired session again');
  assert.equal(controller.state.kind, 'error', 'still unknown: never a fresh start');
  pollMode = 'complete';
  await React.act(async () => { controller.retry(); await settle(); });
  assert.equal(controller.state.kind, 'complete', 'retry after an unknown expiry checks the same session');
  assert.equal(saved.has('mariposa:idv:v1:co:prop:expiry-down:expiry-check'), false);
  await unmount();
  await expiryCase('expiry-reload-gone', 'down');
  await unmount();
  pollMode = 'expired';
  await mount(guest('expiry-reload-gone'));
  assert.equal(controller.state.kind, 'expired', 'a reload that confirms expiry shows expired');
  await unmount();
  assert.equal(starts, 5, 'one start per case, none from expiry or recovery');

  // Resend is closed once the session window has passed.
  pollMode = 'pending';
  await mount({ ...guest('late-resend'), api: { ...guestApi, start: async () => { starts++; return { ...response, idvId: rawId, expiresAt: Date.now() / 1000 - 1 }; } } });
  await React.act(async () => controller.start());
  const startsBeforeResend = starts;
  await React.act(async () => { await controller.resend(); });
  assert.equal(starts, startsBeforeResend, 'no resend while the expiry check runs');
  await unmount();

  // A saved session belongs to one renter: same contact ID (leads share it by
  // email) but a different name must not reuse it.
  polls = 0;
  saved.set('mariposa:idv:v1:co:prop:keep-details', JSON.stringify({ completed: true, idvId: rawId, expiresAt: Date.now() / 1000 + 600, owner }));
  await mount({ ...guest('keep-details'), identity: { ...identity, contactId: 'keep-details', leaseId: undefined, first: 'Someone', last: 'Else' } });
  assert.equal(polls, 0, "another renter's saved verification is not re-confirmed");
  assert.equal(controller.state.kind, 'ready', 'a different renter on the same contact ID verifies for themselves');
  await unmount();
  saved.set('mariposa:idv:v1:co:prop:legacy', JSON.stringify({ completed: true, idvId: rawId, expiresAt: Date.now() / 1000 + 600 }));
  await mount(guest('legacy'));
  assert.equal(polls, 0, 'a saved session without an owner is not reused');
  await unmount();
  saved.set('mariposa:idv:v1:co:prop:other-expiry:expiry-check', JSON.stringify({ idvId: rawId, owner: 'someone|else|x|1' }));
  await mount(guest('other-expiry'));
  assert.equal(polls, 0, "another renter's pending expiry check is ignored");
  await unmount();

  dom.window.close();
  console.log('IDV controller race tests passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
