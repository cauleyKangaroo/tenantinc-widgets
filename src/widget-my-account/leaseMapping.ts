// ===========================================================================
// The signed-in contact's real leases → the panels' AccountSpace shape.
//
// WHY THIS EXISTS. #19 rendered `SPACES` from data.ts whatever account was
// open, so picking a different contact in the login picker changed who the page
// said you were but not a single unit, balance or rent. Verified live
// 2026-10-07: the three contacts behind jaweed@kangaroouk.com hold 1, 3 and 1
// leases respectively, and the page showed the same two invented units for all
// of them.
//
// The API's lease rows carry more than the panels draw, so this maps rather
// than renames: a lease becomes a space, its unit becomes the size/features
// line, and the money becomes the pre-formatted strings the frames expect.
//
// FORMATTING LIVES HERE, not in the panels. AccountSpace holds strings like
// "$123.00" because the Figma frames differ in spacing between screens, so the
// components print what they are given. That makes this the one place a number
// becomes money, and the one place to correct it.
// ===========================================================================

import type { AccountRecord } from '@shared/accountApi';
import type { PropertyContact } from '@shared/propertyContact';
import { classifySize, mediaManagerImagesFor } from '@shared/unitArtwork';
import type {
  AccountDocument, AccountSpace, ActivityRow, Contact, SavedCard, SpaceProperty,
} from './data';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** "$123.00". The frames print the symbol tight against the figure. */
function money(v: unknown): string {
  return `$${num(v).toFixed(2)}`;
}

/** "Jun 5, 2026" from the API's "2026-06-05". Empty in, empty out. */
function longDate(v: unknown): string {
  const s = str(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * The properties the contact actually rents at, for the sidebar cards.
 *
 * Built from the leases' own `unit` rows — the account API has no property
 * list of its own, and the unit carries the address the card prints. The
 * property's NAME and PHONE are not on a lease at all; they come from the
 * site's `Properties` collection, looked up by the unit's propertyId and
 * handed in as `contacts`. Without a match (Duda editor, harness, a property
 * the collection does not list) the card falls back to the unit's own street
 * line and address, as it always did.
 */
export function propertiesFrom(
  record: AccountRecord,
  contacts: Record<string, PropertyContact> = {},
): SpaceProperty[] {
  const leases = Array.isArray(record.leases) ? (record.leases as Record<string, unknown>[]) : [];
  const out: SpaceProperty[] = [];
  const seen = new Set<string>();
  for (const l of leases) {
    const u = (l.unit ?? {}) as Record<string, unknown>;
    const id = str(u.propertyId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const address = [
      str(u.line1),
      [str(u.city), str(u.state)].filter(Boolean).join(', '),
      str(u.zip),
    ].filter(Boolean).join(', ');
    const c = contacts[id];
    out.push({
      id,
      name: c?.name || str(u.line1) || 'Your storage',
      address: c?.address || address,
      phone: c?.phone || '',
    });
  }
  return out;
}

/**
 * The unit's picture candidates — the same chain the space cards walk, so a
 * tenant sees their unit drawn the way it was sold: the site's own upload for
 * the band and amenity, then the band alone, then the shared set.
 *
 * Band from width × length (the record carries `size.width/length` as
 * strings, plus `sqft`); amenity from the unit's first listed amenity, which
 * is also the first one the card prints, so picture and caption agree.
 */
function unitImages(u: Record<string, unknown>, siteId?: string): string[] {
  const size = (u.size ?? {}) as Record<string, unknown>;
  const w = Number(size.width), l = Number(size.length), sq = Number(size.sqft);
  const area = Number.isFinite(w) && Number.isFinite(l) && w > 0 && l > 0 ? w * l
    : Number.isFinite(sq) && sq > 0 ? sq : 0;
  const amenities = Array.isArray(u.amenities) ? (u.amenities as unknown[]) : [];
  const first = amenities.find((a) => typeof a === 'string' && a.trim()) as string | undefined;
  return mediaManagerImagesFor(classifySize(area), {
    type: str(u.type) || 'storage',
    siteId,
    amenity: first,
  });
}

/** The documents on one lease, for that space's panel. */
/**
 * The documents on one lease, for that space's panel.
 *
 * EVERY document, each with its date, NEWEST FIRST, the signed lease pinned to
 * the top. Not de-duplicated by name: a delinquent lease carries "Past Due
 * Notice", "Pre-Lien Notice" and "Lien Notice" once per month it went unpaid
 * (verified live 2026-10-12: 25 documents on one lease, 25 distinct ids, the
 * same five names over and over), and collapsing them would hide real
 * letters. The date is what tells them apart, so it is drawn beside the name.
 */
function documentsOf(lease: Record<string, unknown>): AccountDocument[] {
  const docs = Array.isArray(lease.documents) ? (lease.documents as Record<string, unknown>[]) : [];
  const stamp = (d: Record<string, unknown>) => str(d.signedAt) || str(d.uploadedAt);
  return docs
    .map((d) => {
      const label = str(d.name);
      if (!label) return null;
      const ext = str(d.extension);
      const signed = d.signatureStatus === 1 || !!str(d.signedAt);
      return {
        doc: {
          label,
          status: signed ? 'Signed' : undefined,
          leaseId: str(lease.id),
          documentId: str(d.id),
          filename: ext ? `${label}.${ext}` : label,
          available: d.available !== false,
          date: longDate(stamp(d)) || undefined,
        } as AccountDocument,
        signed,
        when: stamp(d).slice(0, 19),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (Number(b.signed) - Number(a.signed)) || (a.when < b.when ? 1 : a.when > b.when ? -1 : 0))
    .map((x) => x.doc);
}

/**
 * Every lease as a space the panels can render.
 *
 * `primary` and `alternate` are passed in rather than re-derived: they are
 * contact-level, identical on every space, and already mapped for the display
 * panel — deriving them twice would be two things to keep in step.
 */
export function spacesFrom(
  record: AccountRecord,
  primary: Contact,
  alternate: Contact | null,
  /** Duda's data.siteId — what builds the site's own artwork URLs. */
  media: { siteId?: string } = {},
): AccountSpace[] {
  const leases = Array.isArray(record.leases) ? (record.leases as Record<string, unknown>[]) : [];
  const card = (Array.isArray(record.paymentMethods)
    ? (record.paymentMethods as Record<string, unknown>[])
    : [])[0];

  return leases.map((l) => {
    const u = (l.unit ?? {}) as Record<string, unknown>;
    const number = str(u.number);
    const balance = num(l.balance);
    /*
     * `daysLate` decides past-due, not a balance above zero: a balance is
     * normal between bill date and due date, and colouring it red would call
     * every tenant delinquent for the few days before their rent is due.
     */
    const pastDue = num(l.daysLate) > 0 || num(l.rentDaysLate) > 0;
    const paidThrough = longDate(l.paidThroughDate);
    const rent = money(l.rent);

    const address = [
      str(u.line1),
      [str(u.city), str(u.state)].filter(Boolean).join(', '),
      str(u.zip),
    ].filter(Boolean).join(', ');

    return {
      id: str(l.id) || number,
      propertyId: str(u.propertyId),
      openInvoices: (Array.isArray(l.invoices) ? (l.invoices as Record<string, unknown>[]) : [])
        .filter((i) => num(i.balance) > 0 && str(i.id))
        .map((i) => ({ id: str(i.id), number: str(i.number), amount: num(i.balance) })),
      number: number ? `#${number}` : '',
      title: number ? `Space #${number}` : 'Your space',
      unit: {
        // The frames print "5' x 7' I Climate Controlled". The unit now
        // carries its dimensions as `label` ("5' x 5'") beside `type`, so
        // the line is label + type — "5' x 5' I Storage" — and only what
        // exists is shown: a lone "I" with nothing after it reads as a typo.
        size: [str(u.label), titleCase(str(u.type))].filter(Boolean).join(' I '),
        /*
         * The first FOUR of the unit's amenities, as the card's check-marked
         * list (the frame draws four). `unit.amenities` is a plain string
         * array on /api/account/contact (verified 2026-10-08 — a Chino unit
         * lists 23, an Apex one 3), so there is nothing to unwrap; anything
         * that is not a non-empty string is dropped rather than printed.
         */
        features: (Array.isArray(u.amenities) ? u.amenities : [])
          .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
          .slice(0, 4),
        images: unitImages(u, media.siteId),
        balanceAmount: money(balance),
        balanceDate: paidThrough,
      },
      primaryContact: primary,
      alternateContact: alternate ?? undefined,
      documents: documentsOf(l),
      dueLabel: paidThrough ? `Balance Due (Paid through ${paidThrough})` : 'Balance Due',
      dueAmount: money(balance),

      paymentNumber: number ? `#${number}` : '',
      paymentAddress: address,
      autopay: {
        // `autopay` is on the PAYMENT METHOD, not the lease — a card is enrolled
        // or it is not, for the account.
        enrolled: num(card?.autopay) === 1,
        cardLast4: str(card?.last4),
        schedule: num(l.billDay) > 0
          ? `Charged on the ${ordinal(num(l.billDay))} of each month`
          : '',
      },
      lines: [
        { label: `Monthly Rent ${number ? `#${number}` : ''}`.trim(), amount: rent },
      ],
      coverage: { label: 'Coverage', amount: money(0) },
      taxes: { label: 'Taxes', amount: money(0) },
      total: money(balance),
      balance: {
        amount: money(balance),
        payThrough: paidThrough,
        pastDue,
      },
    };
  });
}

/** "storage" → "Storage", for the size line. The API spells the type in lower case. */
function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** "06/15/2026" from the API's "2026-06-15" — the frame's own date format. */
function shortDate(v: unknown): string {
  const s = str(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
}

/**
 * Payment Activity: one row per INVOICE, across every lease, newest first.
 *
 * The frame's table is per payment ("Payment Date", "Payment Method"), but
 * the account record carries invoices and no payment records at all —
 * verified live 2026-10-12: a contact with two leases and fourteen invoices,
 * every one with `totalPayments: 0` and no `payments` array anywhere. So the
 * rows are the invoices: the invoice date, its number, the space it bills,
 * what it asked for (`totalDue`) and what is still owed (`balance`). The
 * method column is "—" rather than a guess; nothing in the record says how
 * an invoice was settled, and inventing "xxxxx 7468" would be a lie in a
 * statement.
 *
 * Newest first, because the question a tenant brings to this table is "what
 * was I charged lately" — and ties (several invoices on one date, as the
 * admin-fee and lien-notice ones are) fall back to the invoice number.
 */
export function activityFrom(record: AccountRecord): ActivityRow[] {
  const leases = Array.isArray(record.leases) ? (record.leases as Record<string, unknown>[]) : [];
  const rows: Array<ActivityRow & { _sort: string }> = [];
  for (const l of leases) {
    const u = (l.unit ?? {}) as Record<string, unknown>;
    const unitNo = str(u.number);
    const invoices = Array.isArray(l.invoices) ? (l.invoices as Record<string, unknown>[]) : [];
    for (const inv of invoices) {
      const number = str(inv.number) || str(inv.id);
      if (!number) continue;
      rows.push({
        date: shortDate(inv.date) || shortDate(inv.due),
        method: '—',
        spaces: unitNo ? [`#${unitNo}`] : [],
        invoices: [`#${number}`],
        amount: money(inv.totalDue),
        balance: money(inv.balance),
        _sort: `${str(inv.date).slice(0, 10)}|${number.padStart(12, '0')}`,
      });
    }
  }
  rows.sort((a, b) => (a._sort < b._sort ? 1 : a._sort > b._sort ? -1 : 0));
  return rows.map(({ _sort, ...row }) => row);
}

/** 1 → "1st". For the autopay sentence. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * The cards on file, each tied to the property it was saved at — the
 * payments API takes a saved method by id, and the record lists several per
 * property (verified: six on one account, all last4 1111, two properties).
 */
export function savedCardsFrom(record: AccountRecord): SavedCard[] {
  const rows = Array.isArray(record.paymentMethods) ? (record.paymentMethods as Record<string, unknown>[]) : [];
  return rows
    .filter((m) => str(m.id) && str(m.type) === 'card')
    .map((m) => ({
      id: str(m.id),
      propertyId: str(m.propertyId),
      last4: str(m.last4),
      cardType: str(m.cardType),
      nameOnCard: str(m.nameOnCard),
      autopay: num(m.autopay) === 1,
    }));
}
