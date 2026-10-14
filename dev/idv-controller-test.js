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
  const preparedOptions = { ...options, api: { ...options.api, lookup: async () => undefined }, identity: { ...identity, leaseId: undefined, contactId: 'pre-payment-contact' } };
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
  let recoveryCalls = 0;
  let recoveryPolls = 0;
  let recoveryStarts = 0;
  let recoveryFails = false;
  let sessionExpired = false;
  const { IdvRequestError: ExpiredError } = require('../.tmp-idv-test/idvApi.js');
  const recovery = { ...options, lookupByEmail: true,
    identity: { ...identity, contactId: 'recover-contact', leaseId: undefined },
    api: {
      lookupByEmail: async () => { recoveryCalls++; if (recoveryFails) throw new Error('unavailable'); return { idvId: rawId, authenticated: true }; },
      poll: async () => {
        recoveryPolls++;
        if (sessionExpired) throw new ExpiredError('This verification session has expired. Please start again.', false);
        return { status: 'complete', idvId: rawId, authenticated: true };
      },
      start: async () => { recoveryStarts++; return response; },
    },
  };
  root = createRoot(document.getElementById('root'));
  await render(recovery);
  assert.equal(controller.state.kind, 'complete');
  const recoveryKey = 'mariposa:idv:v1:co:prop:recover-contact';
  assert.equal(JSON.parse(saved.get(recoveryKey)).completed, true, 'completed ID remains available for checkout after reload');
  await React.act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  await render(recovery);
  assert.equal(controller.state.kind, 'complete');
  assert.equal(recoveryPolls, 1, 'cached completion is checked with the backend, never trusted locally');
  assert.equal(recoveryCalls, 1);
  await React.act(async () => root.unmount());
  sessionExpired = true;
  root = createRoot(document.getElementById('root'));
  await render(recovery);
  assert.equal(controller.state.kind, 'complete', 'an expired capture session falls back to the record lookup');
  assert.equal(recoveryCalls, 2);
  assert.equal(recoveryStarts, 0, 'an expired session never becomes another billable start');
  sessionExpired = false;
  await React.act(async () => root.unmount());
  saved.delete(recoveryKey);
  recoveryFails = true;
  root = createRoot(document.getElementById('root'));
  await render(recovery);
  assert.equal(controller.state.kind, 'error');
  await React.act(async () => controller.retry());
  assert.equal(controller.state.kind, 'error', 'lookup retry still fails safely');
  assert.equal(recoveryCalls, 4, 'retry repeats the GET');
  assert.equal(recoveryStarts, 0, 'recovery failures never turn into billable starts');
  await React.act(async () => root.unmount());
  const liveCompletion = { ...recovery, identity: { ...identity, contactId: 'live-completion', leaseId: undefined },
    api: { ...recovery.api, lookupByEmail: async () => undefined, start: async () => ({ ...response, idvId: rawId }) } };
  root = createRoot(document.getElementById('root'));
  await render(liveCompletion);
  await React.act(async () => controller.start());
  assert.equal(controller.state.kind, 'pending');
  await React.act(async () => pollingOptions.onComplete({ idvId: rawId, authenticated: true }));
  assert.equal(controller.state.kind, 'complete');
  const completionCache = JSON.parse(saved.get('mariposa:idv:v1:co:prop:live-completion'));
  assert.equal(completionCache.completed, true, 'finishing the phone flow retains its ID for the lease');
  assert.equal(completionCache.idvId, rawId);
  assert.ok(completionCache.expiresAt > Date.now() / 1000 && completionCache.expiresAt <= Date.now() / 1000 + 1801);
  assert.equal('driversLicense' in completionCache, false, 'completion cache stores no scanned ID details');
  await React.act(async () => root.unmount());

  // Expiry checks the record before calling the session expired.
  let expiryRecord;
  let expiryFails = false;
  let expiryLookups = 0;
  let expiryStarts = 0;
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  const expiring = contactId => ({ ...recovery, identity: { ...identity, contactId, leaseId: undefined },
    api: { ...recovery.api,
      lookupByEmail: async (_scope, _email, _signal, name) => {
        expiryLookups++;
        assert.deepEqual({ ...name }, { first: identity.first, last: identity.last }, 'recovery is bound to the renter name');
        if (expiryFails) throw new Error('unavailable');
        return expiryRecord;
      },
      start: async () => { expiryStarts++; return { ...response, idvId: rawId }; } } });
  root = createRoot(document.getElementById('root'));
  await render(expiring('expiry-complete'));
  await React.act(async () => controller.start());
  assert.equal(controller.state.kind, 'pending');
  expiryRecord = { idvId: rawId, authenticated: true };
  await React.act(async () => { pollingOptions.onExpired(); await settle(); });
  assert.equal(controller.state.kind, 'complete', 'a capture finished while checkout slept is found at expiry');
  assert.equal(expiryStarts, 1, 'no second billable start');
  await React.act(async () => root.unmount());
  expiryRecord = undefined;
  root = createRoot(document.getElementById('root'));
  await render(expiring('expiry-none'));
  await React.act(async () => controller.start());
  await React.act(async () => { pollingOptions.onExpired(); await settle(); });
  assert.equal(controller.state.kind, 'expired', 'no completed record: the session really expired');
  await React.act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  await render(expiring('expiry-down'));
  await React.act(async () => controller.start());
  const startsBeforeOutage = expiryStarts;
  expiryFails = true;
  await React.act(async () => { pollingOptions.onExpired(); await settle(); });
  assert.equal(controller.state.kind, 'error');
  assert.equal(controller.state.retryable, true);
  const lookupsBeforeRetry = expiryLookups;
  await React.act(async () => { controller.retry(); await settle(); });
  assert.equal(expiryLookups, lookupsBeforeRetry + 1, 'retry after an unknown expiry repeats the lookup');
  assert.equal(expiryStarts, startsBeforeOutage, 'an unknown outcome never becomes another billable start');
  await React.act(async () => root.unmount());

  // The scanned address and licence outlive the capture session for checkout.
  const scanned = { idvId: rawId, authenticated: true,
    address: { street: '1 Main St', city: 'Irvine', state: 'CA', zip: '92618' },
    driversLicense: { number: '****5273', state: 'CA', expiration: '2030-02-07' } };
  let pollExpired = false;
  let lookupDown = false;
  const keepDetails = { ...recovery, identity: { ...identity, contactId: 'keep-details', leaseId: undefined },
    api: { ...recovery.api,
      lookupByEmail: async () => { if (lookupDown) throw new Error('unavailable'); return { idvId: rawId, authenticated: true }; },
      poll: async () => {
        if (pollExpired) throw new ExpiredError('This verification session has expired. Please start again.', false);
        return { status: 'complete', ...scanned };
      } } };
  const owner = [identity.first, identity.last, identity.email].map(v => v.trim().toLowerCase()).concat(identity.phone.replace(/\D/g, '')).join('|');
  saved.set('mariposa:idv:v1:co:prop:keep-details', JSON.stringify({ completed: true, idvId: rawId, expiresAt: Date.now() / 1000 + 600, owner }));
  root = createRoot(document.getElementById('root'));
  await render(keepDetails);
  assert.equal(controller.state.result.address.street, '1 Main St', 'a live completion carries the address');
  await React.act(async () => root.unmount());
  pollExpired = true;
  root = createRoot(document.getElementById('root'));
  await render(keepDetails);
  assert.equal(controller.state.kind, 'complete');
  assert.equal(controller.state.result.address.street, '1 Main St', 'the address survives an expired session');
  assert.equal(controller.state.result.driversLicense.number, '****5273', 'the licence survives an expired session');
  await React.act(async () => root.unmount());
  lookupDown = true;
  root = createRoot(document.getElementById('root'));
  await render(keepDetails);
  assert.equal(controller.state.kind, 'error', 'a failed fallback lookup is an error, not a new start');
  lookupDown = false;
  await React.act(async () => { controller.retry(); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert.equal(controller.state.kind, 'complete');
  assert.equal(controller.state.result.address.street, '1 Main St', 'a failed lookup does not discard the saved scan');
  await React.act(async () => root.unmount());

  // A saved session belongs to one renter: same contact ID (leads share it by
  // email) but a different name must not reuse it.
  let otherPolls = 0;
  const otherName = { ...keepDetails, identity: { ...keepDetails.identity, first: 'Someone', last: 'Else' },
    api: { ...keepDetails.api,
      poll: async () => { otherPolls++; return { status: 'complete', ...scanned }; },
      lookupByEmail: async () => undefined } };
  root = createRoot(document.getElementById('root'));
  await render(otherName);
  assert.equal(otherPolls, 0, "another renter's saved verification is not re-confirmed");
  assert.equal(controller.state.kind, 'ready', 'a different renter on the same contact ID verifies for themselves');
  await React.act(async () => root.unmount());
  saved.set('mariposa:idv:v1:co:prop:legacy', JSON.stringify({ completed: true, idvId: rawId, expiresAt: Date.now() / 1000 + 600 }));
  root = createRoot(document.getElementById('root'));
  await render({ ...otherName, identity: { ...identity, contactId: 'legacy', leaseId: undefined } });
  assert.equal(otherPolls, 0, 'a saved session without an owner is not reused');
  await React.act(async () => root.unmount());
  dom.window.close();
  console.log('IDV controller race tests passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
