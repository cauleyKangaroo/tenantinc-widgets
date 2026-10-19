const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function main() {
  const source = fs.readFileSync(require.resolve('../src/widget-space-list/api.ts'), 'utf8');
  const parsed = ts.createSourceFile('api.ts', source, ts.ScriptTarget.Latest, true);
  const fn = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'probeTierOffers');
  let offers = [];
  let fails = false;
  const context = {
    exports: {}, VALUE_TIER_TYPES: new Set(['good', 'better', 'best']),
    creds: () => ({ baseUrl: 'https://example.test', appId: 'app', apiKey: 'test' }),
    fetch: async () => {
      if (fails) throw new Error('offline');
      return { ok: true, json: async () => ({ applicationData: { app: [{ status: 200, data: { offers } }] } }) };
    },
  };
  vm.runInNewContext(ts.transpileModule(fn.getText(parsed), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const probe = () => context.exports.probeTierOffers('property', 'group', 'company');
  const offer = (type, unit, price) => ({ value_tier: { type }, unit_id: unit, price });
  offers = [offer(null, 'untiered', 99), offer('better', 'sole', 120)];
  let result = await probe();
  assert.equal(result.panelCount, 1);
  assert.equal(result.singleTier, 'better');
  assert.equal(result.unitId, 'sole', 'bypass uses the tier offer, not an earlier untiered offer');
  assert.equal(result.price, 120);
  offers = [offer('good', 'a', 100), offer('better', 'b', 120)];
  result = await probe();
  assert.equal(result.panelCount, 2);
  assert.equal(result.singleTier, undefined);
  offers = [offer('good', 'a', 100), offer('better', null, null)];
  result = await probe();
  assert.equal(result.panelCount, 2, 'a sold-out panel is still a panel');
  assert.equal(result.availableCount, 1);
  assert.equal(result.singleTier, 'good', 'one available tier beside sold-out ones skips the modal');
  assert.equal(result.unitId, 'a');
  offers = [offer('good', null, null), offer('better', null, null), offer('best', 'u106', 106)];
  result = await probe();
  assert.deepEqual([result.panelCount, result.availableCount, result.singleTier, result.unitId, result.price], [3, 1, 'best', 'u106', 106], 'Bellflower 8x5: two sold out, Best available');
  offers = [offer('good', null, null)];
  assert.equal((await probe()).singleTier, undefined, 'never bypass with a sold-out sole panel');
  offers = [offer('good', 'a', 100), offer('good', 'b', 110), offer('better', 'a', 100), offer('best', 'c', -1)];
  assert.equal((await probe()).panelCount, 1, 'classification matches duplicate and malformed-offer filtering');
  offers = [offer(null, 'plain', 90)];
  assert.equal((await probe()).tiers, false, 'preserve untiered rental routing');
  fails = true;
  assert.equal((await probe()).tiers, null, 'request failure must not imply a single option');
  const pricingSource = fs.readFileSync(require.resolve('../src/widget-space-list/components/Pricing.tsx'), 'utf8');
  const pricingTree = ts.createSourceFile('Pricing.tsx', pricingSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let select;
  const visit = n => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'selectTier') select = n;
    ts.forEachChild(n, visit);
  };
  visit(pricingTree);
  let answer;
  const routes = [];
  const routing = {
    checkingTiers: false, setCheckingTiers() {},
    config: { propertyId: 'property', companyId: 'company', skipTierPopupForSingle: true }, cfg: {}, unit: { unitGroupId: 'group' },
    probeTierOffers: async () => answer,
    goToRental: p => routes.push(p), openValueTiers: () => routes.push('modal'),
  };
  vm.runInNewContext(ts.transpileModule(select.getText(pricingTree), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, routing);
  answer = { tiers: true, panelCount: 1, availableCount: 1, singleTier: 'better', unitId: 'sole', price: 120 };
  await routing.selectTier();
  assert.equal(routes.pop(), answer, 'single panel navigates with the probed offer');
  answer = { tiers: true, panelCount: 3, availableCount: 1, singleTier: 'best', unitId: 'u106', price: 106 };
  await routing.selectTier();
  assert.equal(routes.pop(), answer, 'one available tier beside sold-out panels navigates directly');
  for (const p of [
    { tiers: true, panelCount: 2, availableCount: 2 }, { tiers: null }, { tiers: true, panelCount: 1, availableCount: 0 },
  ]) {
    answer = p;
    await routing.selectTier();
    assert.equal(routes.pop(), 'modal', 'multiple, unknown, or sold-out options keep the modal');
  }
  routing.config.skipTierPopupForSingle = false;
  for (const p of [
    { tiers: true, panelCount: 1, availableCount: 1, singleTier: 'better', unitId: 'sole', price: 120 },
    { tiers: true, panelCount: 3, availableCount: 1, singleTier: 'best', unitId: 'u106', price: 106 },
  ]) {
    answer = p;
    await routing.selectTier();
    assert.equal(routes.pop(), 'modal', 'without the setting a single available tier still opens the modal');
  }
  answer = { tiers: false };
  await routing.selectTier();
  assert.equal(routes.pop(), answer, 'no vacancy still skips the modal');
  console.log('Tier offer probe tests passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
