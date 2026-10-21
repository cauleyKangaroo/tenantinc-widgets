// #14: the modal skips itself when there is only ONE tier to choose.
// Covers soleSelectableTier, the rule that decides it. Sold-out slots render as
// cards but cannot be picked, so they must not count towards "a choice".
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../src/widget-tier-selection/TierSelection.tsx'), 'utf8');
const parsed = ts.createSourceFile('TierSelection.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['soleSelectableTier', 'canSkipChooser'];
const fns = parsed.statements.filter(
  (n) => ts.isFunctionDeclaration(n) && names.includes(n.name?.text),
);
assert.equal(fns.length, names.length, 'soleSelectableTier and canSkipChooser should each exist once in TierSelection.tsx');

const js = ts.transpileModule(fns.map((n) => n.getText(parsed)).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.Preserve },
}).outputText;
const ctx = { exports: {} };
vm.createContext(ctx);
vm.runInContext(`${js}; exports.soleSelectableTier = soleSelectableTier; exports.canSkipChooser = canSkipChooser;`, ctx);
const { soleSelectableTier, canSkipChooser } = ctx.exports;

const tier = (key, soldOut = false) => ({ key, unitId: `u-${key}`, soldOut });

// One live offer and nothing else — the case in the brief.
assert.equal(soleSelectableTier([tier('best')])?.key, 'best', 'a lone tier is the sole option');

// One live offer beside sold-out slots: still nothing to choose between.
assert.equal(
  soleSelectableTier([tier('good', true), tier('better'), tier('best', true)])?.key,
  'better',
  'sold-out slots are not options',
);

// A real choice must NOT be skipped.
assert.equal(soleSelectableTier([tier('good'), tier('best')]), undefined, 'two live tiers is a choice');
assert.equal(
  soleSelectableTier([tier('good'), tier('better'), tier('best')]),
  undefined,
  'three live tiers is a choice',
);

// Degenerate inputs must not resolve to a handoff.
assert.equal(soleSelectableTier([]), undefined, 'no tiers is not a sole option');
assert.equal(
  soleSelectableTier([tier('good', true), tier('best', true)]),
  undefined,
  'all sold out is not a sole option',
);

// The skip may only follow a Select click on an open modal, with the setting on.
const clicked = { mode: 'modal', open: true, clickedGroupId: 'g1', skipSingle: true, sample: false };
assert.equal(canSkipChooser(clicked), true, 'Select on a single-tier group with the setting on skips');
assert.equal(canSkipChooser({ ...clicked, open: false }), false, 'a closed modal never hands off');
assert.equal(canSkipChooser({ ...clicked, clickedGroupId: undefined }), false, 'an auto-picked group never hands off');
assert.equal(canSkipChooser({ ...clicked, skipSingle: false }), false, 'setting off shows the chooser');
assert.equal(canSkipChooser({ ...clicked, skipSingle: undefined }), false, 'setting missing shows the chooser');
assert.equal(canSkipChooser({ ...clicked, sample: true }), false, 'harness sample tiers never hand off');
assert.equal(canSkipChooser({ ...clicked, mode: 'inline' }), false, 'the Value Tiers page never redirects');

// A closed modal must not load offers at all.
const effect = source.slice(source.indexOf('React.useEffect(() => {\n    let cancelled = false;'));
const gate = effect.indexOf("if (mode === 'modal' && !modalOpen) return");
assert.ok(gate > 0 && gate < effect.indexOf('fetchUnitGroups('), 'the load effect returns before any fetch while the modal is closed');
assert.match(effect, /\}, \[mode, modalOpen,/, 'the load effect reruns when the modal opens or closes');

console.log('tier-skip: 15 assertions passed');
