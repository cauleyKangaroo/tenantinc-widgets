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
import type {
  AccountDocument, AccountSpace, Contact, SpaceProperty,
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
 * list of its own, and the unit carries the address the card prints.
 */
export function propertiesFrom(record: AccountRecord): SpaceProperty[] {
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
    out.push({
      id,
      // The API gives no property NAME on a lease — only its address. Using the
      // street line beats inventing a brand, and it is what the card's heading
      // is for.
      name: str(u.line1) || 'Your storage',
      address,
      phone: '',
    });
  }
  return out;
}

/** The documents on one lease, for that space's panel. */
function documentsOf(lease: Record<string, unknown>): AccountDocument[] {
  const docs = Array.isArray(lease.documents) ? (lease.documents as Record<string, unknown>[]) : [];
  return docs
    .map((d) => {
      const label = str(d.name);
      if (!label) return null;
      const ext = str(d.extension);
      return {
        label,
        status: d.signatureStatus === 1 || str(d.signedAt) ? 'Signed' : undefined,
        leaseId: str(lease.id),
        documentId: str(d.id),
        filename: ext ? `${label}.${ext}` : label,
        available: d.available !== false,
      } as AccountDocument;
    })
    .filter(Boolean) as AccountDocument[];
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
