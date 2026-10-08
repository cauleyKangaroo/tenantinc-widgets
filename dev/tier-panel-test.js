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
  const names = ['Option2Mobile', 'MobileAdminFee', 'O2MHead', 'O2MExpanded', 'AnimatedMobilePanel'];
  const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(parsed)).join('\n');
  assert.equal(parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).length, names.length);
  let selected = 'better';
  const cards = ['good', 'better', 'best'].map(key => ({ key, name: key, tagline: 'Storage', price: 235, features: [{ label: 'Ground floor' }] }));
  const Icon = () => null;
  const context = {
    React, useState: React.useState, useEffect: React.useEffect,
    useTierData: () => ({ o2: cards, selected, setSelected: key => { selected = key; }, featuredTier: 'better' }),
    priceFmt: value => `$${value}`, InfoCircle: Icon, PromoStar: Icon, CheckCircle: Icon, TagIcon: Icon,
    PricingDetails: () => React.createElement('button', { className: 'details' }, 'Pricing Details'),
    TierSelectCta: () => React.createElement('button', null, 'Select'),
  };
  vm.runInNewContext(ts.transpileModule(functions, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const root = createRoot(document.getElementById('root'));
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
