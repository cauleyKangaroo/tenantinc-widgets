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
  const navigations = [];
  const context = {
    exports: {},
    window: {
      location: { assign: (url) => navigations.push(url) },
      matchMedia: () => ({ addEventListener() {}, removeEventListener() {} }),
    },
    AbortController, Date,
    require(name) {
      if (name === 'react') return React;
      if (name === './idvApi') return { ...require('../.tmp-idv-test/idvApi.js'), captureDevice: () => 'mobile' };
      if (name === './idvPolling') return { startIdvPolling: () => () => {} };
      if (name === './idvStorage') return {
        idvSessionGet: (key) => saved.get(key) ?? null,
        idvSessionSet: (key, value) => { saved.set(key, value); return true; },
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
  const root = createRoot(document.getElementById('root'));
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
  await React.act(async () => controller.reset());
  assert.equal(signal.aborted, true);
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(navigations.length, 0, 'reset rejects late navigation');
  assert.equal(saved.has('mariposa:idv:v1:co:prop:lease'), false, 'reset rejects late session writes');
  await render({ ...options, identity: { ...identity, leaseId: 'lease2' } });
  await React.act(async () => { pending = controller.start(); });
  await render({ ...options, enabled: false });
  await React.act(async () => { resolveStart(response); await pending; });
  assert.equal(navigations.length, 0, 'disabled scope rejects late navigation');
  const { IdvRequestError } = require('../.tmp-idv-test/idvApi.js');
  const rejected = { ...options, identity: { ...identity, leaseId: 'rejected' }, api: { start: async () => { throw new IdvRequestError('bad phone', false); } } };
  await render(rejected);
  await React.act(async () => controller.start());
  assert.equal(controller.state.retryable, true, 'explicit rejection permits retry');
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
  dom.window.close();
  console.log('IDV controller race tests passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
