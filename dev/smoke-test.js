// One-off headless render smoke test for the AMD widget bundles.
// Loads a built bundle into a jsdom DOM exactly as require.js would, calls
// init(), and inspects the resulting DOM. Run: node dev/smoke-test.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="c"></div></body></html>', {
  pretendToBeVisual: true,
});
global.window = dom.window;
global.self = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Minimal AMD shim — webpack libraryTarget:'amd' emits define([], factory).
let widgetModule = null;
global.define = function (deps, factory) {
  widgetModule = typeof deps === 'function' ? deps() : factory();
};
global.define.amd = true;

const bundlePath = path.resolve(__dirname, '../dist/widget-space-list.js');
let code = fs.readFileSync(bundlePath, 'utf8');
// jsdom's CSSOM fork throws on the Google Fonts @import URL. It's valid CSS
// (real browsers handle it); strip it for this DOM-structure-only test.
code = code.replace(/@import url\([^)]*\)[^;]*;/g, '');
// Execute the bundle in this context so it sees global.define.
new Function(code).call(global);

if (!widgetModule || typeof widgetModule.init !== 'function') {
  console.error('FAIL: bundle did not export init()');
  process.exit(1);
}

const container = document.getElementById('c');
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

function check(label, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

// Mount fresh per case (clean() resets the React root and filter state) so
// the cases are independent. This also exercises the clean() lifecycle.
async function renderFresh(props) {
  if (widgetModule.clean) widgetModule.clean();
  widgetModule.init({ container, props });
  await tick(100); // let React's scheduler flush the render
  return container.innerHTML;
}

(async () => {
  // ── Grid view, default filters ──────────────────────────────────────
  const html = await renderFresh({ layoutMode: 'grid', filterPosition: 'right' });
  check('renders .suf-wrapper', html.includes('suf-wrapper'));
  check('applies filter-right class', html.includes('filter-right'));
  check('renders the filter panel', html.includes('Filter Spaces'));
  const cardCount = (html.match(/suf-unit-card/g) || []).length;
  check('renders unit cards (grid)', cardCount > 0, `${cardCount} cards`);
  // style-loader injects via the stylesheet API, so <style>.textContent reads
  // empty under jsdom even though the tag exists. Assert the tag was created
  // (loader ran) and that the CSS actually shipped inside the bundle.
  const styleTag = document.head.querySelector('style');
  check('style-loader injected a <style> tag', !!styleTag);
  check('CSS shipped in bundle', code.includes('.suf-wrapper'));
  check('badge shows default active count (4)', html.includes('>4<'));

  // ── List view, default filters ──────────────────────────────────────
  const listHtml = await renderFresh({ layoutMode: 'list', filterPosition: 'top' });
  check('list view renders dim pills', listHtml.includes('suf-dim-pill'));
  check('list view applies filter-top', listHtml.includes('filter-top'));

  // ── Functional filtering ────────────────────────────────────────────
  // Switching Type to Parking filters out all storage units under the default
  // feature/amenity filters, proving click -> state -> re-filter -> re-render.
  await renderFresh({ layoutMode: 'grid', filterPosition: 'right' });
  const parking = [...container.querySelectorAll('.suf-pill')].find(
    (p) => p.textContent.trim() === 'Parking'
  );
  parking.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick(100);
  const afterHtml = container.innerHTML;
  const afterCount = (afterHtml.match(/suf-unit-card/g) || []).length;
  check(
    'switching Type re-filters results',
    afterCount === 0 && afterHtml.includes('No spaces match'),
    `${cardCount} cards -> ${afterCount}, empty message ${afterHtml.includes('No spaces match') ? 'shown' : 'missing'}`
  );

  const idx = html.indexOf('suf-unit-title');
  console.log('\nFirst card title region:');
  console.log(idx >= 0 ? html.slice(idx, idx + 160) : '(none)');
})();
