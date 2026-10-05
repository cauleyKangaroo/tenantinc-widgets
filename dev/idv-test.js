const assert = require('node:assert/strict');

const { idvReducer, initialIdvState } = require('../.tmp-idv-test/idvState.js');
const { startIdvPolling } = require('../.tmp-idv-test/idvPolling.js');
const { resolveIdvPresentation } = require('../.tmp-idv-test/idvPresentation.js');
const { RENTAL_IDV_REQUIREMENT, parseIdvRequirement } = require('../.tmp-idv-test/idvPolicy.js');
const { createIdvApi, captureDevice } = require('../.tmp-idv-test/idvApi.js');
const {
  allowedVerificationUrl,
  navigateVerificationWindow,
  openVerificationPlaceholder,
} = require('../.tmp-idv-test/openVerification.js');

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fakeClock() {
  let nextId = 1;
  const tasks = new Map();
  return {
    setTimer(callback, delay) {
      const id = nextId++;
      tasks.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) { tasks.delete(id); },
    size() { return tasks.size; },
    delays() { return [...tasks.values()].map((task) => task.delay); },
    async runNext() {
      const entry = tasks.entries().next().value;
      assert.ok(entry, 'expected a scheduled timer');
      const [id, task] = entry;
      tasks.delete(id);
      task.callback();
      await flush();
    },
  };
}

function testReducer() {
  const checking = idvReducer(initialIdvState, { type: 'check' });
  assert.deepEqual(checking, { kind: 'checking', generation: 1 });

  const illegalPending = idvReducer(checking, {
    type: 'pending', generation: 1, idvId: 'idv_bad', expiresAt: 1,
  });
  assert.equal(illegalPending, checking, 'pending cannot skip ready/start');

  const ready = idvReducer(checking, { type: 'not-verified', generation: 1 });
  const starting = idvReducer(ready, { type: 'start', generation: 1 });
  const pending = idvReducer(starting, {
    type: 'pending', generation: 1, idvId: 'idv_one', expiresAt: 123,
  });
  assert.equal(pending.kind, 'pending');
  const refreshed = idvReducer(pending, {
    type: 'refresh-pending', generation: 1, idvId: 'idv_two', expiresAt: 456,
    notificationStatus: 'sent',
  });
  assert.equal(refreshed.kind, 'pending');
  assert.equal(refreshed.idvId, 'idv_two', 'resend may refresh the active session id');
  assert.equal(refreshed.notificationStatus, 'sent');

  const reset = idvReducer(refreshed, { type: 'reset' });
  const stale = idvReducer(reset, {
    type: 'complete', generation: 1,
    result: { idvId: 'idv_one', authenticated: true },
  });
  assert.equal(stale, reset, 'a response from an abandoned generation is ignored');

  const checkingAgain = idvReducer(reset, { type: 'check' });
  const latePriorAttempt = idvReducer(checkingAgain, {
    type: 'complete', generation: 1,
    result: { idvId: 'idv_one', authenticated: true },
  });
  assert.equal(latePriorAttempt, checkingAgain);
}

function testPresentation() {
  assert.equal(RENTAL_IDV_REQUIREMENT, 'optional', 'a property with no setting is offered verification, not forced');

  // PropertiesInternal.idv_requirements: the Duda dropdown's labels, or rich text.
  assert.equal(parseIdvRequirement('None'), 'disabled');
  assert.equal(parseIdvRequirement('Optional'), 'optional');
  assert.equal(parseIdvRequirement(' REQUIRED '), 'required');
  assert.equal(parseIdvRequirement('<p class="rteBlock">Optional</p>'), 'optional');
  for (const raw of [undefined, null, '', 'yes', 'requird', 1, true]) {
    assert.equal(parseIdvRequirement(raw), undefined, `unrecognised ${JSON.stringify(raw)} falls back`);
  }
  assert.deepEqual(
    resolveIdvPresentation('optional', 'choose', { serviceConnected: true, preview: false }),
    { enabled: true, detailsShown: false, idVerified: false },
  );
  assert.deepEqual(
    resolveIdvPresentation('disabled', 'choose', { serviceConnected: true, preview: false }),
    { enabled: false, detailsShown: true, idVerified: true },
    'a property set to None never shows the section',
  );
  assert.deepEqual(
    resolveIdvPresentation('disabled', 'choose', { serviceConnected: false, preview: false }),
    { enabled: false, detailsShown: true, idVerified: true },
  );
  assert.deepEqual(
    resolveIdvPresentation('required', 'choose', { serviceConnected: false, preview: false }),
    { enabled: false, detailsShown: true, idVerified: true },
    'an unconnected service never changes published behaviour',
  );
  assert.deepEqual(
    resolveIdvPresentation('required', 'choose', { serviceConnected: false, preview: true }),
    { enabled: true, detailsShown: false, idVerified: false },
  );
  assert.deepEqual(
    resolveIdvPresentation('required', 'complete', { serviceConnected: true, preview: false }),
    { enabled: true, detailsShown: true, idVerified: true },
  );
  // Every choice that captured nothing still collects the details by hand.
  for (const outcome of ['instore', 'later', 'failed']) {
    const decision = resolveIdvPresentation('required', outcome, { serviceConnected: true, preview: false });
    assert.equal(decision.detailsShown, true, outcome);
    assert.equal(decision.idVerified, false, outcome);
  }
}

function testUrls() {
  assert.equal(allowedVerificationUrl('https://verify.example.com/start', ['verify.example.com']).hostname, 'verify.example.com');
  assert.equal(allowedVerificationUrl('https://child.verify.example.com/start', ['*.verify.example.com']).hostname, 'child.verify.example.com');
  assert.equal(allowedVerificationUrl('http://verify.example.com/start', ['verify.example.com']), undefined);
  assert.equal(allowedVerificationUrl('https://user:pass@verify.example.com/start', ['verify.example.com']), undefined);
  assert.equal(allowedVerificationUrl('https://verify.example.com.evil.test/start', ['verify.example.com']), undefined);
  assert.equal(allowedVerificationUrl('https://verify.example.com:8443/start', ['verify.example.com']), undefined);
  assert.ok(allowedVerificationUrl('https://verify.example.com:8443/start', ['verify.example.com:8443']));

  const target = { opener: {}, location: { href: '' }, close() {} };
  assert.equal(openVerificationPlaceholder(() => target), target);
  assert.equal(target.opener, null);
  assert.equal(navigateVerificationWindow(target, 'javascript:alert(1)', ['verify.example.com']), false);
  assert.equal(navigateVerificationWindow(target, 'https://verify.example.com/start', ['verify.example.com']), true);
}

async function testPolling() {
  {
    const clock = fakeClock();
    const first = deferred();
    let active = 0;
    let maxActive = 0;
    let visibilityHandler = () => {};
    const stop = startIdvPolling({
      expiresAt: 9999999999,
      poll: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        const value = await first.promise;
        active -= 1;
        return value;
      },
      onComplete() {}, onFailed() {}, onExpired() {}, onError() {},
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
      onVisibilityChange(handler) { visibilityHandler = handler; return () => {}; },
      isVisible: () => true,
    });
    visibilityHandler();
    visibilityHandler();
    assert.equal(clock.size(), 0, 'visibility changes cannot overlap an in-flight request');
    first.resolve({ kind: 'continue' });
    await flush();
    assert.equal(maxActive, 1);
    assert.equal(clock.size(), 1);
    stop();
  }

  {
    const clock = fakeClock();
    let visibilityHandler = () => {};
    let polls = 0;
    const stop = startIdvPolling({
      expiresAt: 9999999999,
      poll: async () => { polls += 1; return { kind: 'continue' }; },
      onComplete() {}, onFailed() {}, onExpired() {}, onError() {},
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
      onVisibilityChange(handler) { visibilityHandler = handler; return () => {}; },
      isVisible: () => true,
    });
    await flush();
    assert.equal(clock.size(), 1);
    visibilityHandler();
    visibilityHandler();
    assert.equal(clock.size(), 1, 'repeated visibility events collapse to one immediate poll');
    await clock.runNext();
    assert.equal(polls, 2);
    assert.equal(clock.size(), 1, 'the completed poll schedules exactly one successor');
    stop();
  }

  {
    const clock = fakeClock();
    const response = deferred();
    let completed = 0;
    const stop = startIdvPolling({
      expiresAt: 9999999999,
      poll: () => response.promise,
      onComplete() { completed += 1; }, onFailed() {}, onExpired() {}, onError() {},
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    });
    stop();
    response.resolve({ kind: 'complete', value: 'late' });
    await flush();
    assert.equal(completed, 0, 'a response after cancellation is ignored');
  }

  {
    const clock = fakeClock();
    let now = 0;
    let expired = 0;
    const stop = startIdvPolling({
      expiresAt: 10,
      now: () => now,
      poll: async () => { throw new Error('temporary'); },
      onComplete() {}, onFailed() {}, onExpired() { expired += 1; }, onError() {},
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    });
    await flush();
    assert.deepEqual(clock.delays(), [3000]);
    now = 11_000;
    await clock.runNext();
    assert.equal(expired, 1, 'expiration is checked before retrying after backoff');
    assert.equal(clock.size(), 0);
    stop();
  }
}

async function testApiTransports() {
  const requests = [];
  const directFetch = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        applicationData: {
          app_shared: [{ status: 200, data: {
            idvId: 'idv094ad9c17e774f76b39fa5968fbd7435',
            verificationUrl: 'https://verify.example/session',
            notificationStatus: 'failed',
            expiresAt: 1_900_000_000,
          } }],
        },
      }),
    };
  };
  const direct = createIdvApi({
    mode: 'direct', baseUrl: 'https://edge.example/api/v3', appId: 'app_shared', apiKey: 'shared-key',
  }, directFetch);
  const started = await direct.start({ companyId: 'company_one', propertyId: 'property_two' }, {
    first: 'Ada', last: 'Lovelace', email: 'ada@example.com', phone: '2125551234',
  });
  assert.equal(started.notificationStatus, 'failed');
  assert.equal(requests[0].url, 'https://edge.example/api/v3/applications/app_shared/v2/companies/company_one/properties/property_two/identity-verification');
  assert.equal(requests[0].init.headers['x-storageapi-key'], 'shared-key');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(JSON.parse(requests[0].init.body).device, 'desktop');

  // The caller's decision wins over the ambient one, so the payload cannot
  // disagree with the hand-off chosen from the same value.
  await direct.start({ companyId: 'company_one', propertyId: 'property_two' }, {
    first: 'Ada', last: 'Lovelace', email: 'ada@example.com', phone: '2125551234',
  }, 'mobile');
  assert.equal(JSON.parse(requests[1].init.body).device, 'mobile');

  let proxyRequest;
  const proxy = createIdvApi({
    mode: 'proxy', baseUrl: 'https://proxy.example', capability: 'signed-capability', siteId: 'site-one',
  }, async (url, init) => {
    proxyRequest = { url, init };
    return { ok: true, json: async () => ({ data: { status: 'pending' } }) };
  });
  const pending = await proxy.poll(
    { companyId: 'company_one', propertyId: 'property_two' },
    'idv094ad9c17e774f76b39fa5968fbd7435',
  );
  assert.equal(pending.status, 'pending');
  assert.equal(proxyRequest.init.headers.Authorization, 'Bearer signed-capability');
  assert.equal(proxyRequest.init.headers['X-Duda-Site-Id'], 'site-one');
  assert.equal(proxyRequest.init.headers['x-storageapi-key'], undefined);
}

function testCaptureDevice() {
  assert.equal(captureDevice(), 'desktop');

  const queries = (matches) => ({ matchMedia: (query) => ({ matches: matches[query] === true }) });
  const withWindow = (stub, run) => {
    globalThis.window = stub;
    try { return run(); } finally { delete globalThis.window; }
  };

  assert.equal(withWindow(queries({ '(max-width: 768px)': true, '(pointer: coarse)': true }), captureDevice), 'mobile');
  assert.equal(withWindow(queries({ '(max-width: 768px)': true }), captureDevice), 'desktop');
  assert.equal(withWindow(queries({ '(pointer: coarse)': true }), captureDevice), 'desktop');
  assert.equal(withWindow({}, captureDevice), 'desktop');
}

(async () => {
  testReducer();
  testPresentation();
  testUrls();
  await testPolling();
  await testApiTransports();
  testCaptureDevice();
  console.log('IDV foundation tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
