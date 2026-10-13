const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let answered = true;
let menuCalls = 0;
const exportsObject = {};
const imports = {
  react: { useEffect: () => {}, useState: value => [value, () => {}] },
  'react/jsx-runtime': require('react/jsx-runtime'),
  './LocationsBanner.css': {},
  '@shared/dudaCollections': {},
  '@shared/internalProperties': { INTERNAL_PROPERTIES_COLLECTION: 'PropertiesInternal' },
  '@shared/propertyBinding': { boundText: value => typeof value === 'string' ? value : '' },
  '@shared/findStorageBus': { openFindStorage: () => { menuCalls++; return answered; } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/widget-locations-banner/LocationsBanner.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => {
  if (name in imports) return imports[name];
  throw new Error(`Unexpected import ${name}`);
} });
const banner = exportsObject.LocationsBanner({ locationCount: 7 });
assert.equal(banner.type, 'a');
assert.equal(banner.props.href, '/locations');
assert.equal(banner.props.children.props.children, 'See Our 7 Locations');
assert.equal(banner.props['aria-label'], undefined, 'visible text names the loaded banner');
assert.equal(exportsObject.LocationsBanner({}).props['aria-label'], 'See Our Locations', 'loading banner keeps an accessible name');
function click(overrides = {}) {
  let prevented = false;
  banner.props.onClick({ button: 0, preventDefault: () => { prevented = true; }, ...overrides });
  return prevented;
}
assert.equal(click(), true, 'acknowledged menu opening prevents navigation');
assert.equal(menuCalls, 1);
answered = false;
assert.equal(click(), false, 'missing navigation leaves the native /locations link active');
const beforeModifiers = menuCalls;
for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
  assert.equal(click({ [modifier]: true }), false, `${modifier} preserves native navigation`);
}
assert.equal(click({ button: 1 }), false, 'middle-click preserves native navigation');
assert.equal(menuCalls, beforeModifiers);
console.log('Locations banner tests passed: whole-banner link, menu opening, fallback, and modifier clicks, loading label.');
