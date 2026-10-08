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
  const source = fs.readFileSync(require.resolve('../src/widget-tier-selection/TierSelection.tsx'), 'utf8');
  const parsed = ts.createSourceFile('TierSelection.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['Option2Mobile', 'MobileAdminFee', 'O2MHead', 'O2MExpanded', 'AnimatedMobilePanel', 'buildTierData', 'TierModalHeader'];
  const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(parsed)).join('\n');
  assert.equal(parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).length, names.length);
  let selected = 'better';
  const cards = ['good', 'better', 'best'].map(key => ({ key, name: key, tagline: 'Storage', price: 235, features: [{ label: 'Ground floor' }] }));
  const Icon = () => null;
  const context = {
    TIER_SLOTS: ['good', 'better', 'best'], TAGLINES: { good: 'Lowest Rate', better: 'Best Value', best: 'Most Features' },
    HOURS_24_RE: /24.*hour/i, URGENCY_THRESHOLD: 5, sizeCategoryImage: () => '',
    React, useState: React.useState, useEffect: React.useEffect,
    useTierData: () => ({ o2: cards, selected, setSelected: key => { selected = key; }, featuredTier: 'better' }),
    priceFmt: value => `$${value}`, InfoCircle: Icon, PromoStar: Icon, CheckCircle: Icon, TagIcon: Icon, CloseCircleIcon: Icon,
    PricingDetails: () => React.createElement('button', { className: 'details' }, 'Pricing Details'),
    TierSelectCta: () => React.createElement('button', null, 'Select'),
  };
  vm.runInNewContext(ts.transpileModule(functions, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const input = { size: "5' x 5'", soldOutTiers: [], featureLabels: ['Ground Floor', 'Climate Control'], bundles: [
    { key: 'good', unitId: 'a', price: 100, features: ['Ground Floor', 'Climate Control'] },
    { key: 'better', unitId: 'b', price: 120, features: ['Ground Floor'] },
  ] };
  const reordered = context.buildTierData(input, undefined, 2, true, 'Climate Control');
  assert.equal(reordered.rows[1].label, 'Climate Control', 'originating subtitle is the first amenity');
  assert.equal(reordered.rows[1].bold, true);
  assert.equal(reordered.rows[1].good, true);
  assert.equal(reordered.rows[1].better, false, 'subtitle does not fabricate tier amenities');
  assert.equal(reordered.rows.filter(row => row.label === 'Climate Control').length, 1);
  assert.equal(context.buildTierData(input).rows[1].label, 'Ground Floor', 'without handoff, preserve API ordering');
  for (const subtitle of ['Interior Access', 'Premium Drive-Up', 'Climate Controlled']) {
    const result = context.buildTierData(input, undefined, 2, true, subtitle);
    assert.deepEqual(Array.from(result.rows, row => row.label), ['Monthly Rent', ...input.featureLabels], 'unmatched subtitle preserves API order and adds no empty row');
  }
  const sixFeatures = { ...input, featureLabels: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'] };
  assert.deepEqual(Array.from(context.buildTierData(sixFeatures, undefined, 2, true, 'Premium Drive-Up').rows, row => row.label), ['Monthly Rent', ...sixFeatures.featureLabels], 'unmatched subtitle does not displace the sixth amenity');
  assert.equal(context.buildTierData(input, undefined, 2, true, '  climate   control ').rows[1].label, 'Climate Control');
  const root = createRoot(document.getElementById('root'));
  const headerProps = { heading: 'Choose an Option', onClose() {} };
  await React.act(async () => root.render(React.createElement(context.TierModalHeader, headerProps)));
  const urgencySlot = document.querySelector('.ts-modal-urgency');
  assert.equal(urgencySlot.classList.contains('ts-modal-urgency--empty'), true);
  assert.equal(urgencySlot.getAttribute('aria-hidden'), 'true');
  await React.act(async () => root.render(React.createElement(context.TierModalHeader, { ...headerProps, urgency: 'Only 3 left - Rent soon!' })));
  assert.equal(document.querySelector('.ts-modal-urgency'), urgencySlot, 'urgency uses a persistent reserved slot');
  assert.equal(urgencySlot.classList.contains('ts-modal-urgency--empty'), false);
  assert.equal(urgencySlot.getAttribute('aria-hidden'), 'false');
  assert.equal(urgencySlot.textContent.trim(), 'Only 3 left - Rent soon!');
  await React.act(async () => root.render(React.createElement(context.Option2Mobile, { heading: 'Choose', urgency: '' })));
  const buttons = () => [...document.querySelectorAll('.ts-o2m-toggle')];
  const panels = () => [...document.querySelectorAll('.ts-mobile-panel')];
  const originalPanels = panels();
  const assertExpanded = key => {
    for (const [index, button] of buttons().entries()) {
      const open = cards[index].key === key;
      assert.equal(button.getAttribute('aria-expanded'), String(open));
      assert.equal(button.getAttribute('aria-controls'), panels()[index].id);
      assert.equal(panels()[index].getAttribute('aria-hidden'), String(!open));
      assert.equal(panels()[index].hasAttribute('inert'), !open);
      assert.equal(panels()[index], originalPanels[index], 'panel DOM survives switching and closing');
    }
  };
  assertExpanded('better');
  await React.act(async () => buttons()[0].click());
  assertExpanded('good');
  assert.equal(selected, 'good');
  await React.act(async () => buttons()[0].click());
  assertExpanded(undefined);
  await React.act(async () => buttons()[2].click());
  assertExpanded('best');
  await React.act(async () => document.querySelector('.details').click());
  assertExpanded('best');
  await React.act(async () => document.querySelectorAll('.ts-o2m-price')[0].click());
  assertExpanded('good');
  assert.equal(selected, 'good');
  const badges = [...document.querySelectorAll('.ts-o2m-badge')];
  assert.equal(badges.length, 1, 'featured badge stays mounted so it can fade');
  assert.equal(badges[0].getAttribute('aria-hidden'), 'true');
  await React.act(async () => buttons()[1].click());
  assert.equal(document.querySelector('.ts-o2m-badge').getAttribute('aria-hidden'), 'false');
  assert.equal(document.querySelectorAll('button button').length, 0, 'pricing action is not nested inside a toggle');
  await React.act(async () => root.unmount());
  dom.window.close();
  console.log('Mobile tier panel interaction tests passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
