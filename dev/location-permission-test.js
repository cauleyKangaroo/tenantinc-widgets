const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const status = new dom.window.EventTarget();
  status.state = 'denied';
  let mode = 'supported';
  let positionCalls = 0;
  const navigator = {
    permissions: { query: async ({ name }) => {
      assert.equal(name, 'geolocation');
      if (mode === 'reject') throw new Error('Unsupported permission');
      return status;
    } },
    geolocation: { getCurrentPosition() { positionCalls++; } },
  };
  const context = { exports: {}, require: () => React, navigator, window: dom.window };
  const source = fs.readFileSync(require.resolve('../src/widget-homepage-search/useLocationPermission.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  let denied;
  let setDenied;
  function Probe() { [denied, setDenied] = context.exports.useLocationPermission(); return null; }
  let root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(Probe)));
  assert.equal(denied, true, 'previously denied permission hides the option');
  for (const state of ['granted', 'prompt', 'denied']) {
    await React.act(async () => { status.state = state; status.dispatchEvent(new dom.window.Event('change')); });
    assert.equal(denied, state === 'denied', `permission changes update visibility: ${state}`);
  }
  await React.act(async () => { status.state = 'granted'; dom.window.dispatchEvent(new dom.window.Event('focus')); });
  assert.equal(denied, false, 'returning from settings refreshes permission');
  await React.act(async () => root.unmount());
  for (const unsupported of ['reject', 'missing']) {
    mode = unsupported;
    if (unsupported === 'missing') navigator.permissions = undefined;
    root = createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(Probe)));
    assert.equal(denied, false, 'unsupported query keeps the option available');
    await React.act(async () => setDenied(true));
    assert.equal(denied, true, 'position-denied callback fallback hides the option');
    await React.act(async () => root.unmount());
  }
  assert.equal(positionCalls, 0, 'permission checks never request location or prompt');
  dom.window.close();
  console.log('Location permission tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
