const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { JSDOM } = require('jsdom');

function load(file, imports, context = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, Date, JSON, AbortController, window: global.window, ...context, require: name => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import ${name}`);
  } });
  return exports;
}

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const saved = new Map();
  const linking = load('../src/widget-rental-flow-2step/idvLinking.ts', {});
  const helpers = load('../src/widget-rental-flow-2step/idvLead.ts', {
    './idvLinking': linking,
    './idvStorage': { idvSessionGet: key => saved.get(key), idvSessionSet: (key, value) => { saved.set(key, value); return true; } },
  });
  const scope = { companyId: 'company', propertyId: 'property' };
  const contact = { first: 'Test', last: 'Renter', email: 'test@example.com', phone: '2025550100' };
  const envelope = { applicationData: { app: [{ status: 200, data: { lead_id: 'lead', contact_id: 'contact' } }] } };
  const lead = helpers.parseCreatedIdvLead(envelope, 'app', contact);
  assert.equal(lead.contactId, 'contact');
  assert.equal(lead.leadId, 'lead');
  assert.throws(() => helpers.parseCreatedIdvLead({ applicationData: { app: [{ status: 400, data: {} }] } }, 'app', contact));
  assert.throws(() => helpers.parseCreatedIdvLead(envelope, 'wrong-app', contact));
  helpers.savePreparedIdvLead(scope, lead);
  assert.equal(helpers.readPreparedIdvLead(scope).contactId, 'contact');
  assert.equal(helpers.readPreparedIdvLead({ ...scope, propertyId: 'another' }), undefined);
  helpers.savePreparedIdvLead(scope, { ...lead, expiresAt: Date.now() - 1 });
  assert.equal(helpers.readPreparedIdvLead(scope), undefined, 'expired contact records cannot resume');
  saved.clear();
  const required = { requirement: 'required', policyPending: false, scope };
  const rawId = 'idv05d17e25979d41b1be17aaac798d58de';
  const verifiedReadiness = { contact, scope, verified: true, idvId: rawId };
  assert.equal(helpers.allowsOneStepPayment(required, undefined, contact), false);
  assert.equal(helpers.allowsOneStepPayment(required, verifiedReadiness, contact), true);
  assert.equal(helpers.allowsOneStepPayment(required, { ...verifiedReadiness, idvId: undefined }, contact), false, 'required checkout cannot lose the linking ID');
  assert.equal(helpers.allowsOneStepPayment(required, { ...verifiedReadiness, idvId: 'encoded-id' }, contact), false);
  assert.equal(helpers.checkoutIdvId(required, verifiedReadiness, contact), rawId);
  assert.equal(helpers.checkoutIdvId(required, verifiedReadiness, { ...contact, email: 'another@example.com' }), undefined);
  assert.equal(helpers.checkoutIdvId({ ...required, requirement: 'optional' }, { ...verifiedReadiness, verified: false }, contact), undefined, 'Verify Later never supplies a linking ID');
  assert.equal(helpers.allowsOneStepPayment(required, verifiedReadiness, { ...contact, email: 'different@example.com' }), false);
  assert.equal(helpers.allowsOneStepPayment({ ...required, policyPending: true }, verifiedReadiness, contact), false);
  assert.equal(helpers.allowsOneStepPayment(required, { ...verifiedReadiness, verified: false }, contact), false, 'an optional deferral cannot satisfy a required policy');
  assert.equal(helpers.allowsOneStepPayment({ ...required, scope: { ...scope, propertyId: 'another' } }, verifiedReadiness, contact), false, 'readiness cannot carry to another scope');
  assert.equal(helpers.allowsOneStepPayment(undefined, undefined, contact), true, 'two-step and disconnected flows are unchanged');

  let phase = 'ready';
  let leadCalls = 0;
  let resolveLead;
  let starts = 0;
  let opened = 0;
  let closed = 0;
  let handedOff;
  let readyContact;
  let controllerOptions;
  let handheld = true;
  let modalProps;
  let resendUncertain = false;
  let resendCalls = 0;
  const resend = async () => { resendCalls++; return 'sent'; };
  const tab = { location: { href: '' }, close: () => { closed++; } };
  const start = async target => { starts++; handedOff = target; };
  // The shared kit's controls, as plain elements, so the real IdvDetails renders.
  const ui = {
    isPossiblePhone: phone => phone.replace(/\D/g, '').length === 10,
    Button: ({ children, tone, fill, block, busy, icon, shape, darkText, ...props }) => React.createElement('button', { type: 'button', ...props }, children),
    FormField: ({ label, value, onChange, disabled }) => React.createElement('input', { 'aria-label': label, value, disabled, onChange: e => onChange(e.target.value) }),
    SelectField: ({ label, value, onChange, options = [] }) => React.createElement('select', { 'aria-label': label, value, onChange: e => onChange(e.target.value) },
      options.map(o => React.createElement('option', { key: typeof o === 'string' ? o : o.value, value: typeof o === 'string' ? o : o.value }, typeof o === 'string' ? o : o.label))),
  };
  const addressCountry = load('../src/shared/addressCountry.ts', { './placesApi': { CUSTOMER_ADDRESS_COUNTRIES: 'us,ca' } });
  const usStates = load('../src/shared/usStates.ts', {});
  const idvDetails = load('../src/widget-rental-flow-2step/IdvDetails.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'), '@shared/ui': ui,
    '@shared/AddressAutocomplete': { AddressAutocomplete: ({ children }) => children },
    '@shared/addressCountry': addressCountry, '@shared/usStates': usStates,
    '@shared/placesApi': { CUSTOMER_ADDRESS_COUNTRIES: 'us,ca' },
  });
  const idvStatus = load('../src/widget-rental-flow-2step/IdvStatus.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'), './planIcons': { TickSingleIcon: () => null, AlertTriangleIcon: () => null },
  });
  assert.equal(idvDetails.isRealDate('02/07/2030'), true);
  assert.equal(idvDetails.isRealDate('99/99/2030'), false, 'not a calendar date');
  assert.equal(idvDetails.isRealDate('02/31/2030'), false, 'February has no 31st');
  assert.equal(idvDetails.licenceProblems({ number: 'D123', exp: '02/31/2030', country: 'United States', state: 'CA' }).exp, 'Enter a valid expiration date');
  let detailsReport;
  const Component = load('../src/widget-rental-flow-2step/OneStepIdv.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    '@shared/leadsApi': { createLead: (cfg, input, options) => {
      leadCalls++; assert.equal(cfg.companyId, scope.companyId); assert.equal(input.email, contact.email);
      assert.ok(options.signal);
      return new Promise(resolve => { resolveLead = resolve; });
    } },
    '@shared/ui': ui,
    './IdvStatus': idvStatus,
    './IdvDetails': idvDetails,
    './useIdvController': { useIdvController: options => {
      controllerOptions = options;
      return { state: { kind: options.enabled ? phase : 'idle', result: { authenticated: true, idvId: 'idv05d17e25979d41b1be17aaac798d58de', driversLicense: { number: 'D1234567', state: 'CA', expiration: '2030-01-15' }, address: { street: '1 Main St', city: 'Irvine', state: 'CA', zip: '92618' } }, notificationStatus: 'sent', resendUncertain }, handheld, start, resend,
        continueInNewTab() {}, retry() {}, verificationUrl: 'https://verify.example.com', popupBlocked: false };
    } },
    './IdIllustration': { IdIllustration: () => null },
    './IdVerifyModal': { IdVerifyModal: props => {
      modalProps = props;
      return props.open ? React.createElement('div', { role: 'dialog', 'data-testid': 'idv-modal' }) : null;
    } },
    './idvLead': helpers,
    './idvLinking': linking,
    './openVerification': {
      openVerificationPlaceholder: () => { opened++; return tab; },
      closeVerificationPlaceholder: target => { if (target) target.close(); },
      navigateVerificationWindow: () => true,
    },
  }).OneStepIdv;
  const config = { ...required, api: {}, scope, leadConfig: { ...scope, appId: 'app' }, allowedVerificationHosts: ['verify.example.com'] };
  const onReady = value => { readyContact = value; };
  const root = createRoot(document.getElementById('root'));
  const render = (c = contact) => React.act(async () => root.render(React.createElement(Component, { config, contact: c, onReady, onDetails: d => { detailsReport = d; } })));
  await render();
  assert.equal(readyContact, undefined);
  await React.act(async () => {
    Simulate.click(document.querySelector('button'));
    Simulate.click(document.querySelector('button'));
  });
  assert.equal(leadCalls, 1, 'double click creates only one lead');
  assert.equal(opened, 1, 'mobile placeholder opens before the lead response');
  assert.equal(starts, 0, 'IDV cannot start before a contact exists');
  await React.act(async () => resolveLead(envelope));
  assert.equal(controllerOptions.identity.contactId, 'contact');
  assert.equal(starts, 1, 'prepared contact starts verification once');
  assert.equal(handedOff, tab, 'the original user-gesture window is reused');
  assert.equal(document.querySelector('[data-testid="idv-modal"]'), null, 'mobile never shows the desktop handoff modal');
  phase = 'pending'; await render();
  assert.equal(readyContact, undefined, 'pending verification cannot allow payment');
  phase = 'complete'; await render();
  assert.equal(readyContact.contact.email, contact.email);
  const after = () => document.querySelector('.rf2-pre-idv-after');
  assert.match(document.body.textContent, /ID Verification Complete/);
  assert.match(after().textContent, /Please make sure the address captured from your license is your mailing address\./);
  assert.match(after().textContent, /1 Main St,\s*Irvine, CA 92618/, 'one-step shows the scanned mailing address');
  assert.match(after().textContent, /D1234567/, 'one-step shows the scanned licence number');
  assert.match(after().textContent, /Jan 15, 2030, CA, United States/, 'licence line matches the design');
  assert.equal(detailsReport.complete, true, 'a complete scanned address satisfies the details');
  assert.equal(detailsReport.contact.mailingAddress.address, '1 Main St');
  assert.equal(detailsReport.contact.driverLicense, 'D1234567');
  const edits = () => [...after().querySelectorAll('button')].filter(b => b.textContent === 'Edit');
  await React.act(async () => Simulate.click(edits()[0]));
  const city = after().querySelector('input[aria-label="City"]');
  assert.equal(city.value, 'Irvine', 'Edit opens the address fields with the scanned values');
  await React.act(async () => Simulate.change(city, { target: { value: '' } }));
  assert.equal(detailsReport.complete, false, 'a missing required part blocks the details');
  await React.act(async () => Simulate.change(after().querySelector('input[aria-label="City"]'), { target: { value: 'Tustin' } }));
  assert.equal(detailsReport.contact.mailingAddress.city, 'Tustin', 'edits reach the contact details');
  await React.act(async () => Simulate.click(edits()[0]));
  await React.act(async () => Simulate.change(after().querySelector('input[aria-label="License Number"]'), { target: { value: '****4567' } }));
  assert.equal(detailsReport.contact.driverLicense, undefined, 'a masked number is never filed as the licence');
  assert.equal(helpers.allowsOneStepPayment(required, readyContact, contact), true);
  await render({ ...contact, email: 'changed@example.com' });
  assert.equal(controllerOptions.enabled, false, 'a different identity cannot use the previous verification');
  assert.equal(readyContact, undefined);
  {
    const other = { ...contact, first: 'Other', email: 'other@example.com' };
    await React.act(async () => root.render(React.createElement(Component, { config: { ...config, requirement: 'optional' }, contact: other, onReady, onDetails: d => { detailsReport = d; } })));
    await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Verify ID Later')));
    assert.equal(detailsReport.contact.mailingAddress, undefined, "another contact does not inherit the verified renter's scanned address");
    assert.equal(detailsReport.contact.driverLicense, undefined, "another contact does not inherit the verified renter's licence");
    assert.equal(document.querySelector('input[aria-label="Address 1"]'), null);
  }
  await React.act(async () => root.unmount());
  let restoredRoot = createRoot(document.getElementById('root'));
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config, contact, onReady })));
  assert.equal(controllerOptions.identity.contactId, 'contact', 'remount reuses the contact ID for backend lookup');
  assert.equal(leadCalls, 1, 'remount does not create another lead');
  const optionalConfig = { ...config, requirement: 'optional' };
  phase = 'ready';
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config: optionalConfig, contact, onReady })));
  await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Verify ID Later')));
  assert.equal(readyContact.contact.email, contact.email, 'optional verification can be deferred');
  assert.match(document.body.textContent, /Verify ID Later/);
  assert.match(document.body.textContent, /Your ID will be verified in store\./, 'optional deferral uses the in-store card');
  assert.ok(document.querySelector('input[aria-label="Search address"]'), 'deferral asks for the mailing address');
  assert.ok(document.querySelector('input[aria-label="License Number"]'));
  {
    // A fresh mount: nothing typed or scanned yet.
    await React.act(async () => restoredRoot.unmount());
    const freshRoot = createRoot(document.getElementById('root'));
    await React.act(async () => freshRoot.render(React.createElement(Component, { config: optionalConfig, contact, onReady, onDetails: d => { detailsReport = d; } })));
    await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Verify ID Later')));
    assert.ok(document.querySelector('input[aria-label="Address 1"]') === null, 'only the search box until an address is picked');
    assert.equal(detailsReport.complete, false, 'the mailing address is required before paying');
    assert.equal(document.querySelector('input[aria-label="License Number"]').closest('section').textContent.includes('*'), false, 'optional: the licence is not required');
    await React.act(async () => freshRoot.unmount());
  }
  restoredRoot = createRoot(document.getElementById('root'));
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config: optionalConfig, contact, onReady })));
  await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Verify ID Later')));
  await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Verify ID Now')));
  assert.equal(document.querySelector('input[aria-label="Search address"]'), null, 'Changed your mind returns to the verify card');
  phase = 'failed';
  const requiredRender = extra => React.act(async () => restoredRoot.render(React.createElement(Component, { config: { ...config, ...extra }, contact, onReady, onDetails: d => { detailsReport = d; } })));
  await requiredRender({});
  assert.match(document.body.textContent, /ID Verification Failed/);
  assert.match(document.body.textContent, /present your government issued ID to the manager at the time of moving-in/, 'on-site failure points to the counter');
  assert.ok([...document.querySelectorAll('button')].some(b => b.textContent === 'Reverify ID'));
  assert.ok(document.querySelector('input[aria-label="License Number"]').closest('section').textContent.includes('*'), 'required: the licence is required');
  assert.equal(readyContact, undefined, 'a failed required check cannot pay');
  await requiredRender({ remoteOperated: true, facilityPhone: '(949) 546-7465' });
  assert.match(document.body.textContent, /Please reverify your ID or contact us to get access \(949\) 546-7465\./, 'remote failure points to the phone');
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config: optionalConfig, contact, onReady, onDetails: d => { detailsReport = d; } })));
  assert.ok(readyContact, 'an optional renter whose check failed can still pay and verify at move-in');
  phase = 'ready';
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config: optionalConfig, contact, onReady, onDetails: d => { detailsReport = d; } })));
  assert.equal(readyContact, undefined, 'Reverify takes back the failed-check permission to pay');
  await React.act(async () => restoredRoot.render(React.createElement(Component, { config: { ...config, policyPending: true }, contact, onReady })));
  assert.equal(readyContact, undefined, 'pending property policy cannot allow payment');
  await React.act(async () => restoredRoot.unmount());
  saved.clear();
  const failingRoot = createRoot(document.getElementById('root'));
  await React.act(async () => failingRoot.render(React.createElement(Component, { config, contact, onReady })));
  const startsBeforeFailure = starts;
  const closedBeforeFailure = closed;
  await React.act(async () => Simulate.click(document.querySelector('button')));
  await React.act(async () => resolveLead({ applicationData: { app: [{ status: 400, data: {} }] } }));
  assert.equal(starts, startsBeforeFailure, 'failed contact creation never starts billable IDV');
  assert.equal(closed, closedBeforeFailure + 1, 'failed preparation closes its blank mobile tab');
  assert.match(document.querySelector('[role="alert"]').textContent, /could not be prepared/);
  await React.act(async () => failingRoot.unmount());
  handheld = false;
  phase = 'ready';
  const desktopRoot = createRoot(document.getElementById('root'));
  const renderDesktop = () => React.act(async () => desktopRoot.render(React.createElement(Component, { config, contact, onReady })));
  await renderDesktop();
  const windowsBeforeDesktop = opened;
  const startsBeforeDesktop = starts;
  await React.act(async () => Simulate.click(document.querySelector('button')));
  assert.ok(document.querySelector('[data-testid="idv-modal"]'), 'desktop opens the existing handoff modal during contact preparation');
  assert.equal(modalProps.lifecycle, 'starting');
  assert.equal(modalProps.connected, true);
  assert.equal(opened, windowsBeforeDesktop, 'desktop preparation does not open a new tab');
  await React.act(async () => resolveLead(envelope));
  assert.equal(starts, startsBeforeDesktop + 1);
  phase = 'pending'; await renderDesktop();
  assert.equal(modalProps.phone, contact.phone);
  assert.equal(modalProps.verificationUrl, 'https://verify.example.com');
  assert.equal(modalProps.notificationStatus, 'sent');
  assert.equal(modalProps.onResend, resend, 'the shared modal uses the controller resend');
  await React.act(async () => modalProps.onResend());
  assert.equal(resendCalls, 1);
  resendUncertain = true; await renderDesktop();
  assert.equal(modalProps.resendUncertain, true, 'the existing resend uncertainty brake is preserved');
  await React.act(async () => modalProps.onClose());
  assert.equal(document.querySelector('[data-testid="idv-modal"]'), null);
  assert.equal(readyContact, undefined, 'closing the handoff modal does not verify the renter');
  await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Continue Verification')));
  assert.ok(document.querySelector('[data-testid="idv-modal"]'), 'desktop Continue reopens the same handoff modal');
  assert.equal(starts, startsBeforeDesktop + 1, 'reopening does not create another billable session');
  assert.equal(opened, windowsBeforeDesktop, 'desktop Continue does not open a browser tab');
  await React.act(async () => modalProps.onResult('complete'));
  assert.equal(readyContact, undefined, 'presentation cannot override backend verification');
  await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Continue Verification')));
  phase = 'complete'; await renderDesktop();
  assert.equal(document.querySelector('[data-testid="idv-modal"]'), null, 'verified completion closes the modal');
  assert.equal(readyContact.verified, true);
  assert.equal(readyContact.idvId, 'idv05d17e25979d41b1be17aaac798d58de', 'the completed verification id travels to the lease');
  for (const terminal of ['failed', 'expired', 'error']) {
    phase = 'pending'; await renderDesktop();
    await React.act(async () => Simulate.click([...document.querySelectorAll('button')].find(button => button.textContent === 'Continue Verification')));
    assert.ok(document.querySelector('[data-testid="idv-modal"]'));
    phase = terminal; await renderDesktop();
    assert.equal(document.querySelector('[data-testid="idv-modal"]'), null, `${terminal} closes the handoff modal`);
    assert.equal(readyContact, undefined, `${terminal} does not allow payment`);
  }
  await React.act(async () => desktopRoot.unmount());
  const source = fs.readFileSync(require.resolve('../src/widget-rental-flow-2step/Step2.tsx'), 'utf8');
  assert.ok(source.indexOf('<OneStepIdv') < source.indexOf('{/* Additional Information */}'));
  assert.match(source, /formComplete = verificationAllowsPayment &&/);
  assert.match(source, /idvId: verifiedIdvId,/, 'payment hands the verified id to the lease');
  dom.window.close();
  console.log('One-step pre-payment IDV tests passed: lead preparation, recovery, payment gating, mobile new tab, and shared desktop handoff modal.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
