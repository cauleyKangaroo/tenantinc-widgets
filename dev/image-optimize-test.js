// optimizedImageUrl: ask Duda for a sized copy, but ONLY for images it manages.
//
// The hazard this pins: the shared stock bucket (/duda-unit-images/) sits on the
// same CloudFront distribution as Duda's managed media but has no generated
// copies — duda-unit-images/opt/Boxes-640w.png is a 403 while the plain file is
// a 200. Rewriting those would break the property gallery's own fallback photos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../src/shared/dudaCollections.ts'), 'utf8');
const parsed = ts.createSourceFile('dudaCollections.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const want = ['isDudaManagedImage', 'optimizedImageUrl'];
const fns = parsed.statements.filter((n) => ts.isFunctionDeclaration(n) && want.includes(n.name?.text));
assert.equal(fns.length, want.length, `expected ${want.join(' and ')} in dudaCollections.ts`);

// `export` is stripped: the declarations run as plain functions in the sandbox.
const js = ts.transpileModule(
  fns.map((n) => n.getText(parsed).replace(/^export\s+/, '')).join('\n'),
  { compilerOptions: { target: ts.ScriptTarget.ES2019 } },
).outputText;

/** Fresh sandbox per case: `window` is read at call time, not import time. */
function load(dmAPI) {
  const ctx = { window: { dmAPI }, exports: {} };
  vm.createContext(ctx);
  vm.runInContext(`${js}; exports.optimizedImageUrl = optimizedImageUrl;`, ctx);
  return ctx.exports.optimizedImageUrl;
}

const resizer = {
  getOptimizedImageURL: (url, width) => `${url}#resized-${width}`,
};

const MANAGED_SITE = 'https://irp.cdn-website.com/a70f290e/dms3rep/multi/so-bellflower-other-6.png';
const MANAGED_LIB = 'https://dr2r4w0s7b8qm.cloudfront.net/image_manager_app/photo-20221003.png';
const UNMANAGED = 'https://dr2r4w0s7b8qm.cloudfront.net/duda-unit-images/Boxes.png';

// Managed images are resized, at the width asked for.
let f = load(resizer);
assert.equal(f(MANAGED_SITE, 640), `${MANAGED_SITE}#resized-640`, 'a site upload is resized');
assert.equal(f(MANAGED_LIB, 320), `${MANAGED_LIB}#resized-320`, 'a media-library image is resized');

// The stock bucket is NOT — it has no generated copies.
assert.equal(f(UNMANAGED, 640), UNMANAGED, 'the shared stock bucket is left alone');

// Nothing to do, or nothing to do it with.
assert.equal(f('', 640), '', 'empty stays empty');
assert.equal(load(undefined)(MANAGED_SITE, 640), MANAGED_SITE, 'no dmAPI (editor/harness) returns the original');
assert.equal(load({})(MANAGED_SITE, 640), MANAGED_SITE, 'dmAPI without the resizer returns the original');

// Duda's own docs name the call getOptimizedImageURL but their widget example
// uses getResizedImageURL, so both are accepted.
assert.equal(
  load({ getResizedImageURL: (u, w) => `${u}#alt-${w}` })(MANAGED_SITE, 640),
  `${MANAGED_SITE}#alt-640`,
  'the getResizedImageURL spelling also works',
);

// A broken resizer must never blank an image.
assert.equal(load({ getOptimizedImageURL: () => undefined })(MANAGED_SITE, 640), MANAGED_SITE, 'undefined falls back');
assert.equal(load({ getOptimizedImageURL: () => '' })(MANAGED_SITE, 640), MANAGED_SITE, 'empty string falls back');
assert.equal(load({ getOptimizedImageURL: () => { throw new Error('boom'); } })(MANAGED_SITE, 640), MANAGED_SITE, 'a throw falls back');

console.log('image-optimize: 11 assertions passed');
