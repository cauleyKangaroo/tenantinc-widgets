const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function main() {
  let invoice;
  const requests = [];
  const context = {
    exports: {}, Date, Intl,
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      return { ok: true, json: async () => ({ applicationData: { app: [{ data: { invoice: [invoice] } }] } }) };
    },
    require(name) {
      if (name === './config.json') return { baseUrl: 'https://api.example.test', appId: 'app', apiKey: 'test' };
      if (name === '@shared/apiConfig') return { createApiCredsStore: (_, creds) => ({ configure() {}, creds: () => creds }) };
      if (name === '@shared/requestMemo' || name === '@shared/propertiesSource') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  const source = fs.readFileSync(require.resolve('../src/widget-tier-selection/api.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, context);
  const line = (subtotal, total, name = 'Rent') => ({
    subtotal, total, Service: { name }, start_date: '2026-10-07', end_date: '2026-10-31',
  });
  const cases = [
    { name: 'Chino: tax-inclusive total without discount', invoice: { balance: 253.21, total_tax: 18.21, total_discounts: 0, InvoiceLines: [line(235, 253.21)] }, costs: [235] },
    { name: 'legacy pre-tax total without discount', invoice: { balance: 253.21, total_tax: 18.21, InvoiceLines: [line(235, 235)] }, costs: [235] },
    { name: 'tax-inclusive total with discount', invoice: { balance: 226.28, total_tax: 16.28, total_discounts: 25, InvoiceLines: [line(235, 226.28)] }, costs: [235, -25] },
    { name: 'legacy pre-tax total with discount', invoice: { balance: 226.28, total_tax: 16.28, total_discounts: 25, InvoiceLines: [line(235, 210)] }, costs: [235, -25] },
    { name: 'zero tax', invoice: { balance: 235, total_tax: 0, InvoiceLines: [line(235, 235)] }, costs: [235] },
    { name: 'multiple taxable lines', invoice: { balance: 280.15, total_tax: 20.15, InvoiceLines: [line(235, 253.21), line(25, 26.94, 'Admin Fee')] }, costs: [235, 25] },
    { name: 'legacy net fallback', invoice: { balance: 226.28, total_tax: 16.28, total_discounts: 10, InvoiceLines: [line(235, 210)] }, costs: [210] },
    { name: 'mismatch stays unavailable', invoice: { balance: 300, total_tax: 18.21, InvoiceLines: [line(235, 253.21)] }, costs: [] },
    { name: 'missing lines stays unavailable', invoice: { balance: 253.21, total_tax: 18.21 }, costs: [] },
  ];
  for (const test of cases) {
    invoice = test.invoice;
    const quote = await context.exports.fetchMoveInQuote({ companyId: 'co', propertyId: 'prop' }, {
      unitId: 'unit', rent: 235, promotionIds: ['promo'], promoName: 'Move-in offer', timezone: 'America/Los_Angeles',
    });
    assert.deepEqual(Array.from(quote.lines, l => l.cost), test.costs, test.name);
    assert.equal(quote.totalDue, invoice.balance, test.name);
    assert.equal(quote.totalTax, invoice.total_tax, test.name);
    if (quote.lines.length) {
      assert.equal(Math.round((quote.lines.reduce((sum, l) => sum + l.cost, 0) + quote.totalTax) * 100), Math.round(quote.totalDue * 100), test.name);
      assert.equal(quote.lines[0].startDate, '2026-10-07');
      assert.equal(quote.lines[0].endDate, '2026-10-31');
      if (test.costs.length > 1 && test.costs.at(-1) < 0) assert.equal(quote.lines.at(-1).name, 'Move-in offer');
    }
    const request = requests.at(-1);
    const body = JSON.parse(request.body);
    assert.equal(request.method, 'POST');
    assert.equal(body.dryrun, true);
    assert.equal(body.send_invoice, false);
    assert.equal(body.edit_lease, false);
    assert.deepEqual(body.promotions, [{ promotion_id: 'promo' }]);
  }
  console.log(`Tier quote regression tests passed (${cases.length} cases).`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
