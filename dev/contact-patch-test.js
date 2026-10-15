// Pins the Step 2 → PATCH /api/tenant/contacts/:contactId body
// (src/widget-rental-flow-2step/contactPatch.ts) against the contract
// received 2026-10-15. Plain node + assert, like the other dev/*-test.js; the
// source is compiled to CJS first by the "test:contact-patch" script.
//   npm run test:contact-patch
const assert = require('assert');
const { contactPatchBody, vehicleBody, mdyToIso, phoneNumber } = require('../.tmp-contact-test/widget-rental-flow-2step/contactPatch.js');

let passed = 0;
const eq = (label, actual, expected) => {
  assert.deepStrictEqual(actual, expected, `${label}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`);
  passed += 1;
};

// 1) Helpers.
eq('mdy → iso', mdyToIso('01/31/1990'), '1990-01-31');
eq('mdy partial → undefined', mdyToIso('01/3'), undefined);
eq('mdy impossible → undefined', mdyToIso('13/40/1990'), undefined);
eq('phone digits', phoneNumber('(555) 999-8888'), '5559998888');
eq('phone drops leading 1', phoneNumber('+1 555 999 8888'), '5559998888');

// 2) Everything filled, on a lease.
eq('full body', contactPatchBody({
  driverLicense: ' D1234567 ',
  driverLicenseExp: '01/31/2030',
  driverLicenseState: 'TX',
  mailingAddress: { address: 'PO Box 12', city: 'Austin', state: 'TX', zip: '78702' },
  extras: {
    dob: '01/31/1990',
    altFirst: 'Robert', altLast: 'Doe', altEmail: 'rob@example.com', altPhone: '(555) 999-8888',
    altCountry: 'United States', altAddress: '9 Elm St', altCity: 'Austin', altState: 'TX', altZip: '78703',
  },
}, 'LEASE1'), {
  details: { dob: '1990-01-31', driverLicense: 'D1234567', driverLicenseState: 'TX', driverLicenseExpiration: '2030-01-31' },
  addresses: [{ type: 'Mailing', primary: false, line1: 'PO Box 12', city: 'Austin', state: 'TX', zip: '78702' }],
  secondaryContacts: [{
    leaseId: 'LEASE1', isAlternate: true, isEmergency: false,
    first: 'Robert', last: 'Doe', email: 'rob@example.com',
    phone: { number: '5559998888', type: 'Cell', sms: false },
    address: { line1: '9 Elm St', city: 'Austin', state: 'TX', zip: '78703', country: 'US' },
  }],
});

// 3) Only what was filled travels — no empty keys, no empty sections.
eq('licence only', contactPatchBody({ driverLicense: 'X1', driverLicenseExp: '', driverLicenseState: '' }), {
  details: { driverLicense: 'X1' },
});
eq('dob only (Military ticked)', contactPatchBody({ extras: { dob: '02/02/1980', altFirst: '', altLast: '' } }), {
  details: { dob: '1980-02-02' },
});
eq('alternate without address or phone', contactPatchBody({ extras: { altFirst: 'Eve', altLast: '', altEmail: 'eve@x.com', altPhone: '' } }, 'L2'), {
  secondaryContacts: [{ leaseId: 'L2', isAlternate: true, isEmergency: false, first: 'Eve', email: 'eve@x.com' }],
});
eq('Canada → CA', contactPatchBody({ extras: { altFirst: 'A', altCountry: 'Canada', altAddress: '1 Rue', altCity: 'Montreal', altState: 'QC', altZip: 'H1A 1A1' } }).secondaryContacts[0].address.country, 'CA');
eq('passport path (no licence fields) + nothing else → null', contactPatchBody({ driverLicense: undefined, extras: { dob: '' } }), null);
eq('empty → null', contactPatchBody({}), null);

// 4) Vehicle → PUT /api/tenant/leases/{leaseId}/vehicle body.
eq('vehicle full', vehicleBody({ vType: 'Car', make: 'Honda', model: 'Civic', year: '2020', colour: 'Black', plate: 'XYZ789', stateVal: 'Texas', country: 'United States' }), {
  type: 'car', make: 'Honda', model: 'Civic', year: '2020', color: 'Black', licensePlateNumber: 'XYZ789', licensePlateState: 'TX', licensePlateCountry: 'US',
});
eq('vehicle type only', vehicleBody({ vType: 'RV', make: '', plate: '  ' }), { type: 'rv' });
eq('vehicle: no type → null', vehicleBody({ vType: '', make: 'Honda' }), null);
eq('vehicle: no extras → null', vehicleBody(undefined), null);
eq('vehicle: Canada plate', vehicleBody({ vType: 'Trailer', stateVal: 'Nevada', country: 'Canada' }).licensePlateCountry, 'CA');

console.log(`contact-patch tests: ${passed} passed`);
