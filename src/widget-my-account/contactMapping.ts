// ===========================================================================
// #19 Edit panel <-> the account API.
//
// Two directions, kept together so they cannot drift:
//   editFormFrom(record)        the loaded record -> the form's initial values
//   updateFromEditForm(form, record)  the edited form -> the PATCH body
//
// THE FORM IS WIDER THAN THE API. Two of its controls have no documented
// field anywhere in the contact payload:
//
//   marketingEmails  — no contact-level preference exists
//   textMessages     — `phones[].sms` is close, but it belongs to one phone
//                      rather than the contact, and guessing wrong would
//                      silently change a consent flag
//
// They are deliberately NOT sent. A PATCH only changes what it carries, so
// leaving them out is the safe half of the trade: the reader can still tick
// them and nothing is corrupted, but the ticks do not persist. That needs an
// API field before it can work, and inventing one would be worse than the gap.
//
// PASSPORT. The contact record has NO passport fields — verified 2026-10-14:
// the upstream PUT rejects `passport`, `passport_number`, `passport_country`
// and `id_type` outright ("is not allowed"), and the proxy's PATCH schema
// lists only the five driverLicense* keys. So "Use passport for ID" files
// the passport in the SAME slots: number → driverLicense, issuing country →
// driverLicenseCountry, expiry → driverLicenseExpiration, and the licence
// state is BLANKED. Which document it was is not stored anywhere, so on the
// way back in it is inferred: a country with no state reads as a passport
// (a licence always carries its state). That is the whole signal, and it is
// why the state must be cleared rather than left to linger.
// ===========================================================================

import type {
  AccountRecord, ContactUpdate, ContactAddressInput, SecondaryContactInput,
} from '@shared/accountApi';
import { countryCode as isoCountryCode } from '@shared/countries';
import { isKnownState, stateCodeFromName, stateNameFromCode } from '@shared/usStates';
import { EDIT_DEFAULTS } from './data';
import type { Contact, ContactForm, EditForm } from './data';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/*
 * The API returns a driver licence MASKED — "****4567" for a stored
 * "D1234567". Verified live 2026-10-06.
 *
 * That makes the field a one-way read, and it is a data-corruption trap: the
 * form shows the mask, the reader edits their ADDRESS, hits Save, and the mask
 * goes back as the literal licence number. The real one is then lost, and
 * nothing on screen says so.
 *
 * So a value that still looks masked is never sent. A reader who wants to
 * change it types a real number, which has no asterisks and saves normally.
 */
const isMasked = (v: string): boolean => v.includes('*');

/*
 * The expiry travels as YYYY-MM-DD — the proxy rejects anything else
 * ("must be a date as YYYY-MM-DD", verified 2026-10-14) — while the form's
 * date mask types MM/DD/YYYY. Both directions live here so they cannot drift.
 * A partial or impossible date converts to '' and is then omitted, never sent
 * as a string the API would refuse.
 */
export function mdyToIso(v: string): string {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : '';
  const [, mm, dd, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  const real = d.getUTCFullYear() === Number(yyyy) && d.getUTCMonth() === Number(mm) - 1 && d.getUTCDate() === Number(dd);
  return real ? `${yyyy}-${mm}-${dd}` : '';
}
export function isoToMdy(v: string): string {
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v.trim();
}

/* The licence state is stored as a CODE ("CA") and the form's picker offers
   NAMES ("California"); a code dropped straight into the picker matches no
   option and the menu shows nothing chosen. Known states convert each way;
   anything else (a province, free text) passes through untouched. */
const licenceStateIn = (v: string): string => (isKnownState(v) ? stateNameFromCode(v) : v);
const licenceStateOut = (v: string): string => (isKnownState(v) ? stateCodeFromName(stateNameFromCode(v)) : v);

/** A country with no state is a passport — see the header note. */
const isPassport = (record: AccountRecord): boolean =>
  Boolean(str(record.driverLicenseCountry).trim()) && !str(record.driverLicenseState).trim();

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

/*
 * A secondary contact's own fields.
 *
 * READ AND WRITE SHAPES DIFFER, which is the trap here. The PATCH takes a flat
 * contact with a single `phone` and `address`; the GET returns a WRAPPER whose
 * flags sit at the top and whose person is nested one level down, with phones
 * and addresses as ARRAYS:
 *
 *   { id, isAlternate, isEmergency,
 *     contact: { first, last, email, phones: [...], addresses: [...] } }
 *
 * Reading it as if it were the write shape finds nothing at all — every field
 * comes back empty and the form looks unsaved. Verified live 2026-10-06.
 */
function contactFormFrom(row: Record<string, unknown> | undefined): ContactForm | null {
  if (!row) return null;
  // Nested on the way in; tolerate the flat shape too, so a payload that ever
  // matches the write shape still reads.
  const person = (row.contact && typeof row.contact === 'object'
    ? row.contact
    : row) as Record<string, unknown>;
  const addrList = Array.isArray(person.addresses)
    ? (person.addresses as Record<string, unknown>[])
    : [];
  const addr = addressParts(addrList[0] ?? (person.address as Record<string, unknown> | undefined));
  const phoneList = Array.isArray(person.phones)
    ? (person.phones as Record<string, unknown>[])
    : [];
  const phone = (phoneList[0] ?? person.phone ?? {}) as Record<string, unknown>;
  return {
    first: str(person.first),
    last: str(person.last),
    email: str(person.email),
    phone: str(phone.phone) || str(phone.number),
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
export function editFormFrom(record: AccountRecord, leaseId?: string): EditForm {
  const addr = addressParts(primaryAddress(record));
  const secondaries = Array.isArray(record.secondaryContacts)
    ? (record.secondaryContacts as Record<string, unknown>[])
    : [];

  // Secondary contacts are PER LEASE (each row carries a leaseId). The form
  // edits the selected space's, so its lease's rows come first; any lease's
  // is the fallback for a record whose rows carry no lease at all.
  const forLease = (isEmergency: boolean) =>
    secondaries.find((c) => Boolean(c.isEmergency) === isEmergency && (!leaseId || str(c.leaseId) === leaseId))
    ?? secondaries.find((c) => Boolean(c.isEmergency) === isEmergency);
  const emergency = forLease(true);
  const alternate = forLease(false);

  return {
    ...EDIT_DEFAULTS,
    // The country dropdown has no empty option, so it alone keeps a default.
    country: countryName(str(addr.country)) || EDIT_DEFAULTS.country,
    address: str(addr.line1),
    city: str(addr.city),
    state: str(addr.state),
    zip: str(addr.zip),

    usePassport: isPassport(record),
    licenceNumber: str(record.driverLicense),
    licenceState: licenceStateIn(str(record.driverLicenseState)),
    licenceCountry: isoCountryCode(str(record.driverLicenseCountry)),
    licenceExpiry: isoToMdy(str(record.driverLicenseExpiration)),

    alternate: contactFormFrom(alternate) ?? emptyContact(),
    emergency: contactFormFrom(emergency) ?? emptyContact(),
  };
}

function secondaryFrom(
  form: ContactForm,
  existing: Record<string, unknown> | undefined,
  isEmergency: boolean,
  leaseId?: string,
): SecondaryContactInput | null {
  // Nothing typed is not an instruction to create an empty contact.
  if (!form.first.trim() && !form.last.trim() && !form.email.trim() && !form.phone.trim()) {
    return null;
  }
  const out: SecondaryContactInput = {
    first: form.first.trim(),
    last: form.last.trim(),
    email: form.email.trim(),
  };

  /*
   * The flag rule INVERTS on whether this row already exists, and both halves
   * are enforced. Verified live 2026-10-06:
   *
   *   new, with neither flag        400  "a new secondary contact must be an
   *                                       alternate or an emergency contact"
   *   existing, with a flag         400  "isAlternate: cannot be changed on an
   *                                       existing secondary contact"
   *
   * So a new row MUST carry one and an existing row MUST NOT — which also
   * means a contact's kind cannot be changed through this endpoint at all.
   * Neither half is in the guide.
   */
  if (existing?.id) {
    // WITHOUT the id this adds a second row instead of editing the one shown.
    out.id = String(existing.id);
  } else if (isEmergency) {
    out.isEmergency = true;
  } else {
    out.isAlternate = true;
  }
  // A new row belongs to a lease; an existing one already does.
  if (!existing?.id && leaseId) out.leaseId = leaseId;
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
export function updateFromEditForm(form: EditForm, record: AccountRecord, leaseId?: string): ContactUpdate {
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
  /*
   * ONE ROW PER LEASE. Secondary contacts hang off a lease, so "Apply change
   * to all spaces" means the same person written to every lease on the
   * record — an existing row updated by id, a lease without one given a new
   * row with its leaseId. Unticked, only the selected space's lease is
   * touched (the one the form was seeded from).
   */
  const leaseIds = (Array.isArray(record.leases) ? (record.leases as Record<string, unknown>[]) : [])
    .map((l) => str(l.id)).filter(Boolean);
  const existingFor = (isEmergency: boolean, id: string) =>
    secondaries.find((c) => Boolean(c.isEmergency) === isEmergency && str(c.leaseId) === id)
    ?? (id === leaseId ? secondaries.find((c) => Boolean(c.isEmergency) === isEmergency && !str(c.leaseId)) : undefined);
  const rowsFor = (contact: ContactForm, isEmergency: boolean): SecondaryContactInput[] => {
    const targets = contact.applyToAll ? leaseIds : (leaseId ? [leaseId] : []);
    if (!targets.length) {
      const one = secondaryFrom(contact, secondaries.find((c) => Boolean(c.isEmergency) === isEmergency), isEmergency);
      return one ? [one] : [];
    }
    return targets
      .map((id) => secondaryFrom(contact, existingFor(isEmergency, id), isEmergency, id))
      .filter((r): r is SecondaryContactInput => r !== null);
  };
  const secondaryContacts = [...rowsFor(form.alternate, false), ...rowsFor(form.emergency, true)];

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
  // Masked = untouched, so leave the stored number alone. See `isMasked`.
  if (form.licenceNumber.trim() && !isMasked(form.licenceNumber)) {
    details.driverLicense = form.licenceNumber.trim();
  }
  const expiry = mdyToIso(form.licenceExpiry);
  if (expiry) details.driverLicenseExpiration = expiry;
  if (form.usePassport) {
    // Passport: the issuing country goes in the country slot and the state
    // is BLANKED — '' is the proxy's "clear it" (verified 2026-10-14), and a
    // lingering state would read the record back as a licence.
    if (form.licenceCountry.trim()) details.driverLicenseCountry = form.licenceCountry.trim();
    details.driverLicenseState = '';
  } else if (form.licenceState.trim()) {
    details.driverLicenseState = licenceStateOut(form.licenceState.trim());
  }

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

// ---------------------------------------------------------------------------
// The DISPLAY panel — the same record, read-only
// ---------------------------------------------------------------------------

/**
 * "(877) 657-7465" from the digits the API stores ("12352415214").
 *
 * Display only. The stored value is never reformatted on the way back, because
 * what is sent is what the operator's system matches on.
 */
function displayPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  const local = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (local.length !== 10) return raw;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

/** The frame prints an address over two lines: street, then city/state/zip. */
function addressLines(row: Record<string, unknown> | undefined): string[] | undefined {
  const a = addressParts(row);
  const street = str(a.line1);
  const rest = [str(a.city), [str(a.state), str(a.zip)].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  const lines = [street, rest].filter(Boolean);
  return lines.length ? lines : undefined;
}

function phoneOf(rows: unknown): string {
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  // `primary` first — a contact can hold several and the panel shows one.
  const row = list.find((p) => p.primary) ?? list[0];
  const raw = str(row?.phone) || str(row?.number);
  return raw ? displayPhone(raw) : '';
}

/** The account holder, for the "Primary Contact" block. */
export function primaryContactFrom(record: AccountRecord): Contact {
  const name = [str(record.first), str(record.last)].filter(Boolean).join(' ');
  /*
   * The licence arrives already masked ("****4567"), which is what this block
   * wants to show anyway — so it is printed as given rather than re-masked.
   * Absent entirely when the account has none, instead of an empty label.
   */
  const licence = str(record.driverLicense);
  return {
    name,
    email: str(record.email) || undefined,
    phone: phoneOf(record.phones) || undefined,
    address: addressLines(primaryAddress(record)),
    licence: licence ? `${isPassport(record) ? 'Passport' : 'Drivers License'}: ${licence}` : undefined,
  };
}

/**
 * One secondary contact for the display panel — the alternate or the
 * emergency one — or null when the account has none of that kind.
 *
 * Null rather than an empty Contact: the panel can then hide the block,
 * instead of drawing a heading over four blank lines.
 *
 * Secondary contacts are PER LEASE (each row carries a leaseId — see
 * editFormFrom), so the selected space's own row comes first and any lease's
 * is the fallback. The old reader took the first non-emergency row whatever
 * the lease, and never read the emergency rows at all — which is why the
 * display showed an Alternate Contact but no Emergency Contact even though
 * the Edit form could save one.
 */
export function secondaryContactFrom(
  record: AccountRecord,
  isEmergency: boolean,
  leaseId?: string,
): Contact | null {
  const rows = Array.isArray(record.secondaryContacts)
    ? (record.secondaryContacts as Record<string, unknown>[])
    : [];
  const ofKind = rows.filter((c) => Boolean(c.isEmergency) === isEmergency);
  const row = (leaseId ? ofKind.find((c) => str(c.leaseId) === leaseId) : undefined) ?? ofKind[0];
  if (!row) return null;

  // Nested, as on the way in — see contactFormFrom.
  const person = (row.contact && typeof row.contact === 'object'
    ? row.contact
    : row) as Record<string, unknown>;
  const addrList = Array.isArray(person.addresses)
    ? (person.addresses as Record<string, unknown>[])
    : [];

  const name = [str(person.first), str(person.last)].filter(Boolean).join(' ');
  if (!name && !str(person.email)) return null;
  return {
    name,
    email: str(person.email) || undefined,
    phone: phoneOf(person.phones ?? (person.phone ? [person.phone] : [])) || undefined,
    address: addressLines(addrList[0] ?? (person.address as Record<string, unknown> | undefined)),
  };
}

export const alternateContactFrom = (record: AccountRecord, leaseId?: string): Contact | null =>
  secondaryContactFrom(record, false, leaseId);
export const emergencyContactFrom = (record: AccountRecord, leaseId?: string): Contact | null =>
  secondaryContactFrom(record, true, leaseId);
