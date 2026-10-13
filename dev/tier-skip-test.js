// #14: the modal skips itself when there is only ONE tier to choose.
// Covers soleSelectableTier, the rule that decides it. Sold-out slots render as
// cards but cannot be picked, so they must not count towards "a choice".
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../src/widget-tier-selection/TierSelection.tsx'), 'utf8');
const parsed = ts.createSourceFile('TierSelection.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = parsed.statements.filter(
  (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'soleSelectableTier',
);
assert.equal(fn.length, 1, 'soleSelectableTier should exist exactly once in TierSelection.tsx');

const js = ts.transpileModule(fn[0].getText(parsed), {
  compilerOptions: { target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.Preserve },
}).outputText;
const ctx = { exports: {} };
vm.createContext(ctx);
vm.runInContext(`${js}; exports.soleSelectableTier = soleSelectableTier;`, ctx);
const { soleSelectableTier } = ctx.exports;

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

console.log('tier-skip: 6 assertions passed');
