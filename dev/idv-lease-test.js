const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const linking = {};
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
vm.runInNewContext(compile(fs.readFileSync(require.resolve('../src/widget-rental-flow-2step/idvLinking.ts'), 'utf8')), { exports: linking });
const requests = [];
const context = {
  exports: exportsObject, Date, Intl, console,
  fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ applicationData: { app: [{ status: 200, data: { lease: { lease_id: 'lease', tenants: [{ contact_id: 'contact' }] } } }] } }) };
  },
  require(name) {
    if (name === './idvLinking') return linking;
    if (name === './config.json') return { baseUrl: 'https://api.example.test', appId: 'app', apiKey: 'test' };
    if (name === '@shared/apiConfig') return { createApiCredsStore: (_, creds) => ({ configure() {}, creds: () => creds }) };
    if (name === '@shared/ui/phone') return { normalizePhone: value => value };
    if (name === './gpTokenize') return { cardBrand: () => 'visa' };
    if (name === '@shared/requestMemo') return {};
    throw new Error(`Unexpected import ${name}`);
  },
};
// Expose the private function only inside this test VM, never in the widget.
vm.runInNewContext(compile(fs.readFileSync(require.resolve('../src/widget-rental-flow-2step/api.ts'), 'utf8') + '\nexport { finalizeLease as testFinalizeLease };'), context);
async function main() {
  const idvId = 'idv05d17e25979d41b1be17aaac798d58de';
  const ctx = { companyId: 'company', propertyId: 'property' };
  const args = { unit: { id: 'unit' }, holdToken: 'hold', contact: { first: 'Test', last: 'Renter', email: 'test@example.com', phone: '2025550100' },
    card: { cardNumber: '4111111111111111', expMonth: '12', expYear: '2030', cvv: '123', nameOnCard: 'Test Renter', address: '123 Test St', city: 'Test City', state: 'CA', zip: '90001' }, startDate: '2026-10-14' };
  await exportsObject.testFinalizeLease(ctx, { ...args, idvId, idvRequired: true }, []);
  assert.equal(requests.at(-1).body.idv_id, idvId);
  assert.equal(requests.at(-1).body.contacts[0].email, args.contact.email);
  assert.ok(requests.at(-1).url.endsWith('/units/unit/lease'));
  await exportsObject.testFinalizeLease(ctx, { ...args, idvId, reservationId: 'reservation' }, []);
  assert.equal(requests.at(-1).body.idv_id, idvId);
  assert.equal(requests.at(-1).body.reservation_id, 'reservation');
  await exportsObject.testFinalizeLease(ctx, args, []);
  assert.equal('idv_id' in requests.at(-1).body, false, 'deferred/disabled verification sends no ID');
  const beforeInvalid = requests.length;
  for (const invalid of ['', 'encoded-id', 'IDV05d17e25979d41b1be17aaac798d58de']) {
    await assert.rejects(exportsObject.testFinalizeLease(ctx, { ...args, idvId: invalid }, []));
    assert.equal((await exportsObject.rentSpace(ctx, { ...args, idvId: invalid })).ok, false);
  }
  assert.equal((await exportsObject.rentSpace(ctx, { ...args, idvRequired: true })).ok, false);
  assert.equal(requests.length, beforeInvalid, 'invalid/missing required ID blocks ALL writes, including document finalization');
  console.log('IDV lease payload tests passed: raw ID, tenant email, reservation conversion, deferral, and fail-closed writes.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
