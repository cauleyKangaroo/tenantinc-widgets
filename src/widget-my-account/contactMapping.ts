// ===========================================================================
// #19 Edit panel <-> the account API.
//
// Two directions, kept together so they cannot drift:
//   editFormFrom(record)        the loaded record -> the form's initial values
//   updateFromEditForm(form, record)  the edited form -> the PATCH body
//
// THE FORM IS WIDER THAN THE API. Three of its controls have no documented
// field anywhere in the contact payload:
//
//   usePassport      — swaps which ID is being provided; nothing carries it
//   marketingEmails  — no contact-level preference exists
//   textMessages     — `phones[].sms` is close, but it belongs to one phone
//                      rather than the contact, and guessing wrong would
//                      silently change a consent flag
//
// They are deliberately NOT sent. A PATCH only changes what it carries, so
// leaving them out is the safe half of the trade: the reader can still tick
// them and nothing is corrupted, but the ticks do not persist. That needs an
// API field before it can work, and inventing one would be worse than the gap.
// ===========================================================================

import type {
  AccountRecord, ContactUpdate, ContactAddressInput, SecondaryContactInput,
} from '@shared/accountApi';
import { EDIT_DEFAULTS } from './data';
import type { ContactForm, EditForm } from './data';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/*
 * The addresses the form edits.
 *
 * `primary` first, else the first row. The record can hold several and the
 * panel draws ONE, so it has to pick deliberately rather than by luck of
 * ordering — editing a non-primary address while showing it as "the" address
 * would move the wrong one.
 */
function primaryAddress(record: AccountRecord): Record<string, unknown> | undefined {
  const rows = Array.isArray(record.addresses) ? record.addresses : [];
  return rows.find((a) => a.primary) ?? rows[0];
}

/** `{ address: { line1, city, … } }` nested, or flat — the record uses nested. */
function addressParts(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) return {};
  const nested = row.address;
  return nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : row;
}

/**
 * ISO-2 for the PATCH, which the guide's example uses ("country": "US").
 *
 * The GET spells countries out ("United States" on a unit), so the two
 * directions disagree and this cannot be a round trip. The documented example
 * is the only evidence for the UPDATE endpoint specifically, so it wins here.
 */
function countryCode(name: string): string {
  const n = name.trim().toLowerCase();
  if (n === 'canada' || n === 'ca') return 'CA';
  if (n === 'united states' || n === 'usa' || n === 'us') return 'US';
  return name.trim();
}

/** ISO-2 back to the names the form's dropdown offers. */
function countryName(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === 'CA') return 'Canada';
  if (c === 'US' || c === 'USA') return 'United States';
  return code.trim();
}

/** A blank secondary contact — NOT the frame's sample person. */
function emptyContact(): ContactForm {
  return {
    first: '', last: '', email: '', phone: '',
    country: EDIT_DEFAULTS.alternate.country,
    address: '', city: '', state: '', zip: '',
    applyToAll: false,
  };
}

function contactFormFrom(row: Record<string, unknown> | undefined): ContactForm | null {
  if (!row) return null;
  const addr = addressParts(row.address as Record<string, unknown> | undefined);
  const phone = (row.phone ?? {}) as Record<string, unknown>;
  return {
    first: str(row.first),
    last: str(row.last),
    email: str(row.email),
    phone: str(phone.number) || str(row.phone),
    country: countryName(str(addr.country)) || EDIT_DEFAULTS.alternate.country,
    address: str(addr.line1),
    city: str(addr.city),
    state: str(addr.state),
    zip: str(addr.zip),
    applyToAll: false,
  };
}

/**
 * The record as the form's starting values.
 *
 * EMPTY MEANS EMPTY. An earlier version fell back to the frame's sample for a
 * field the record did not carry — which looks harmless and is not: this user's
 * `driverLicense` is null, so the form would have shown the sample licence
 * number and Save would have written that fiction into their real record.
 *
 * The sample survives only for the controls that are NOT sent (see the header)
 * and for the no-record case, where `editInitial` is undefined and the panel
 * keeps EDIT_DEFAULTS on its own.
 */
export function editFormFrom(record: AccountRecord): EditForm {
  const addr = addressParts(primaryAddress(record));
  const secondaries = Array.isArray(record.secondaryContacts)
    ? (record.secondaryContacts as Record<string, unknown>[])
    : [];

  // isEmergency splits the two the panel draws; order is not a signal.
  const emergency = secondaries.find((c) => c.isEmergency);
  const alternate = secondaries.find((c) => !c.isEmergency);

  return {
    ...EDIT_DEFAULTS,
    // The country dropdown has no empty option, so it alone keeps a default.
    country: countryName(str(addr.country)) || EDIT_DEFAULTS.country,
    address: str(addr.line1),
    city: str(addr.city),
    state: str(addr.state),
    zip: str(addr.zip),

    licenceNumber: str(record.driverLicense),
    licenceState: str(record.driverLicenseState),
    licenceExpiry: str(record.driverLicenseExpiration),

    alternate: contactFormFrom(alternate) ?? emptyContact(),
    emergency: contactFormFrom(emergency) ?? emptyContact(),
  };
}

function secondaryFrom(
  form: ContactForm,
  existing: Record<string, unknown> | undefined,
  isEmergency: boolean,
): SecondaryContactInput | null {
  // Nothing typed is not an instruction to create an empty contact.
  if (!form.first.trim() && !form.last.trim() && !form.email.trim() && !form.phone.trim()) {
    return null;
  }
  const out: SecondaryContactInput = {
    first: form.first.trim(),
    last: form.last.trim(),
    email: form.email.trim(),
    isEmergency,
  };
  // WITHOUT the id this adds a second row instead of editing the one shown.
  if (existing?.id) out.id = String(existing.id);
  if (form.phone.trim()) out.phone = { number: form.phone.replace(/[^\d+]/g, '') };
  if (form.address.trim() || form.city.trim() || form.zip.trim()) {
    out.address = {
      line1: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      country: countryCode(form.country),
    };
  }
  return out;
}

/**
 * The edited form as a PATCH body.
 *
 * `record` is needed as well as `form`: addresses and secondary contacts are
 * matched by ID, and an entry sent without one is ADDED rather than updated.
 * So the ids have to be carried through from whatever was loaded, or saving an
 * edit quietly appends a duplicate and leaves the original untouched.
 */
export function updateFromEditForm(form: EditForm, record: AccountRecord): ContactUpdate {
  const existingAddress = primaryAddress(record);
  const address: ContactAddressInput = {
    line1: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    zip: form.zip.trim(),
    country: countryCode(form.country),
  };
  if (existingAddress?.id) address.id = String(existingAddress.id);

  const secondaries = Array.isArray(record.secondaryContacts)
    ? (record.secondaryContacts as Record<string, unknown>[])
    : [];
  const alternate = secondaryFrom(form.alternate, secondaries.find((c) => !c.isEmergency), false);
  const emergency = secondaryFrom(form.emergency, secondaries.find((c) => c.isEmergency), true);
  const secondaryContacts = [alternate, emergency].filter(Boolean) as SecondaryContactInput[];

  /*
   * Blank fields are OMITTED, not sent as ''.
   *
   * A PATCH only changes what it carries, so omitting leaves the stored value
   * alone. The alternative — sending '' — would let a field the reader never
   * touched wipe real data the form happened not to load. The cost is that
   * clearing a field deliberately does not clear it server-side; that is the
   * lesser harm, and it needs an explicit "remove" from the API to do properly.
   */
  const details: NonNullable<ContactUpdate['details']> = {};
  if (form.licenceNumber.trim()) details.driverLicense = form.licenceNumber.trim();
  if (form.licenceState.trim()) details.driverLicenseState = form.licenceState.trim();
  if (form.licenceExpiry.trim()) details.driverLicenseExpiration = form.licenceExpiry.trim();

  const body: ContactUpdate = {};
  if (Object.keys(details).length) body.details = details;
  // An address with no street is not an address — sending it would create a
  // blank row rather than say nothing.
  if (address.line1) body.addresses = [address];
  // Omitted entirely when there is nothing to say — a PATCH changes what it
  // carries, and an empty array could read as "remove them all".
  if (secondaryContacts.length) body.secondaryContacts = secondaryContacts;
  return body;
}
