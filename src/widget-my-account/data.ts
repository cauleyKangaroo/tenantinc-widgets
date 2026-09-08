// ===========================================================================
// Static demo content for #19, lifted from four Figma frames:
//   • 8815-115354  "Account Info - Display"        → the DEFAULT left panel
//   • 9030-31458   "Screen after Login (1 Space)"  → the Make a Payment panel
//   • 8815-117093  one property card, TWO units    → the sidebar
//   • 8884-131918  "Payment Activity" expanded     → the accordion's table
//   • 8815-115876  the Edit panel                  → the form behind "Edit"
//
// SHAPE: a tenant rents UNITS; units sit at a PROPERTY. The sidebar draws one
// card per property — its photo once at the top, then every unit it holds
// stacked beneath, each with its own balance strip. Selecting a unit rings it
// and opens its details on the left. One unit at one property collapses back
// to the single-unit card the first two frames draw, with no special case.
//
// NO-DEMO-MONEY note: every figure here is a DESIGN SAMPLE and is meant to be.
// There is no account API behind this widget yet, so nothing claims to be a
// real balance. When the endpoints land, this module is the only one to change.
//
// TWO KINDS OF CONTENT, kept apart deliberately:
//
//   #41 is VERBATIM from the frames, inconsistencies and all, because they are
//   in the design and silently "fixing" them would hide them from whoever
//   signs it off:
//     • the unit is #41 in the sidebar and the Account Info heading, but the
//       payment screen heads it #310 and bills "Monthly Rent #301".
//     • the payment screen totals $123.00 while its balance box reads $350.00.
//     • "1rst of each month" is the designer's typo for "1st".
//     • the primary contact is sneha@storelocal.com in the panel but
//       sneha.jose@storelocal.com in the signed-in line above it.
//     • Payment Activity's first row bills a space "#305" that is not in the
//       design's own data.
//
//   #42 is INVENTED — the frame draws its second unit as another copy of #41,
//   and Macauley asked for it to differ. It is internally CONSISTENT on
//   purpose: same number everywhere, a total that matches its balance. It also
//   deliberately exercises the branches #41 leaves untested — not enrolled in
//   autopay, no alternate contact, nothing past due, a different document set.
// ===========================================================================

export interface MoneyLine {
  /** Bold lead text — "Monthly Rent #301". */
  label: string;
  /** Regular text after the label, e.g. the billing period in brackets. */
  note?: string;
  /** Pre-formatted, so "$ 100.00" and "$123.00" can differ exactly as designed. */
  amount: string;
}

export interface AutopayInfo {
  enrolled: boolean;
  cardLast4: string;
  /** Free text — the frame reads "Charged on the 1rst of each month". */
  schedule: string;
}

export interface BalanceDue {
  amount: string;
  payThrough: string;
  pastDue: boolean;
}

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
  /** Rendered one line per entry, as the frame wraps it. */
  address?: string[];
  /** Primary contact only — "Drivers License: xxxx 8476". */
  licence?: string;
}

export interface AccountDocument {
  label: string;
  /** Pill to the right. Absent → no pill, as on the frame's last two rows. */
  status?: string;
}

export interface SpaceProperty {
  id: string;
  name: string;
  address: string;
  phone: string;
}

/** The sidebar card's unit block. */
export interface SpaceUnit {
  /** "5’ x 7’ I Climate Controlled" — the pipe is the designer's separator. */
  size: string;
  features: string[];
  balanceAmount: string;
  balanceDate: string;
}

export interface AccountSpace {
  id: string;
  /** Which property's card this unit stacks into. */
  propertyId: string;
  /** "#41" — as printed, hash included. Heads the unit block. */
  number: string;
  /** "Space #41" — the Account Info panel's heading. */
  title: string;

  unit: SpaceUnit;

  /* ── Account Info view (8815-115354) ────────────────────────────────── */
  primaryContact: Contact;
  alternateContact?: Contact;
  documents: AccountDocument[];
  /** "Balance Due (Due Jun 5,2026)" — the due date is baked into the label. */
  dueLabel: string;
  dueAmount: string;

  /* ── Make a Payment view (9030-31458) ───────────────────────────────── */
  /** #41's payment screen heads the space #310 rather than #41. Verbatim. */
  paymentNumber: string;
  paymentAddress: string;
  autopay: AutopayInfo;
  lines: MoneyLine[];
  /** Carries a "Change Coverage" action; nothing else in the list does. */
  coverage: MoneyLine;
  taxes: MoneyLine;
  total: string;
  balance: BalanceDue;
}

/** One row of the Payment Activity table (8884-131918). */
export interface ActivityRow {
  date: string;
  /** "xxxxx 7468" or "Cash". */
  method: string;
  /** A payment can cover more than one space — the frame's first row does. */
  spaces: string[];
  /** …and therefore more than one invoice. Rendered as links. */
  invoices: string[];
  amount: string;
  balance: string;
}

export const USER = {
  firstName: 'Sneha',
  email: 'sneha.jose@storelocal.com',
};

/** The promo card swaps with the view. Both frames carry the same body copy. */
const PROMO_BODY = 'Qorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate '
  + 'libero et velit interdum, ac aliquet odio mattis. Class aptent';

/** Default view — the tenant is not on autopay yet, so the card sells it. */
export const PROMO_AUTOPAY = {
  title: 'Enroll in Autopay',
  body: PROMO_BODY,
  cta: 'Enroll',
};

/** Payment view — by then the autopay panel reads "Enrolled", so this sells supplies. */
export const PROMO_SUPPLIES = {
  title: 'Stock up on Storage Supplies',
  body: PROMO_BODY,
  cta: 'Shop Now',
};

export const PROPERTIES: SpaceProperty[] = [
  {
    id: 'prop-3rd-street',
    name: '3rd Street Storage',
    address: '1301 E. Mission Ave, Fullerton, CA 02027',
    phone: '(877) 657-7465',
  },
];

/** The tenant's primary contact — the same person on every unit they rent. */
const SNEHA: Contact = {
  name: 'Sneha Jose',
  email: 'sneha@storelocal.com',
  phone: '(877) 657-7465',
  address: ['1301 E. Mission Ave,', 'Fullerton, CA 02027'],
  licence: 'Drivers License: xxxx 8476',
};

export const SPACES: AccountSpace[] = [
  /* ── #41 — VERBATIM from the frames ──────────────────────────────────── */
  {
    id: 'space-41',
    propertyId: 'prop-3rd-street',
    number: '#41',
    title: 'Space #41',

    unit: {
      size: '5’ x 7’ I Climate Controlled',
      features: ['24 Hour Access', 'Drive Up', 'Near Entrances', 'No Late Fees'],
      balanceAmount: '$123.00',
      balanceDate: 'Apr 20, 2026',
    },

    primaryContact: SNEHA,
    alternateContact: {
      name: 'Jerry Boo',
      address: ['635 Water Way', 'Los Angeles, CA 90210'],
      email: 'Jerry@storelocal.com',
      phone: '(988) 873-9387',
    },
    documents: [
      { label: 'Lease Agreement', status: 'Signed' },
      { label: 'Tenant Protection', status: 'Signed' },
      { label: 'Autopay Enrollment', status: 'Signed' },
      { label: 'Rules & Regulations' },
      { label: 'Insurance Brochure' },
    ],
    dueLabel: 'Balance Due (Due Jun 5,2026)',
    dueAmount: '$123.00',

    paymentNumber: '#310',
    paymentAddress: '1301 E. Mission Ave, Fullerton, CA 02027',
    autopay: {
      enrolled: true,
      cardLast4: '8746',
      // sic — the design reads "1rst". See the header note.
      schedule: 'Charged on the 1rst of each month',
    },
    lines: [
      { label: 'Monthly Rent #301', note: '(06/01/2026 to 06/30/2026)', amount: '$ 100.00' },
    ],
    coverage: { label: 'Coverage', amount: '$ 13.00' },
    taxes: { label: 'Taxes', amount: '$ 10.00' },
    total: '$123.00',
    balance: {
      amount: '$350.00',
      payThrough: 'Pay through 06/30/2026',
      pastDue: true,
    },
  },

  /* ── #42 — INVENTED, and deliberately unlike #41 ─────────────────────── */
  {
    id: 'space-42',
    propertyId: 'prop-3rd-street',
    number: '#42',
    title: 'Space #42',

    unit: {
      size: '10’ x 10’ I Drive Up Access',
      features: ['24 Hour Access', 'Ground Floor', 'Vehicle Parking', 'Wide Aisle'],
      balanceAmount: '$248.00',
      balanceDate: 'May 03, 2026',
    },

    primaryContact: SNEHA,
    // No alternate contact on this one — the panel's optional block, exercised.
    documents: [
      { label: 'Lease Agreement', status: 'Signed' },
      { label: 'Rules & Regulations' },
    ],
    dueLabel: 'Balance Due (Due Jul 1,2026)',
    dueAmount: '$248.00',

    paymentNumber: '#42',
    paymentAddress: '1301 E. Mission Ave, Fullerton, CA 02027',
    autopay: {
      enrolled: false,
      cardLast4: '',
      schedule: 'Set up autopay to avoid late fees',
    },
    lines: [
      { label: 'Monthly Rent #42', note: '(07/01/2026 to 07/31/2026)', amount: '$ 215.00' },
    ],
    coverage: { label: 'Coverage', amount: '$ 23.00' },
    taxes: { label: 'Taxes', amount: '$ 10.00' },
    total: '$248.00',
    balance: {
      amount: '$248.00',
      payThrough: 'Pay through 07/31/2026',
      pastDue: false,
    },
  },
];

/**
 * The Edit panel's form (8815-115876). Separate from the display data above
 * because the frame edits DIFFERENT values than it displays — a mailing
 * address in Laguna Beach against a contact address in Fullerton, and an
 * alternate contact "Betty Boo" where the display panel reads "Jerry Boo".
 * Reproduced as drawn; see the header note.
 */
export interface EditForm {
  email: string;
  mobile: string;
  /** The lookup field above the split address. Blank in the frame. */
  mailingLookup: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  applyToAll: boolean;
  hasAlternate: boolean;
  altFirst: string;
  altLast: string;
  altEmail: string;
  altPhone: string;
  altLookup: string;
  altAddress: string;
  altCity: string;
  altState: string;
  altZip: string;
}

export const EDIT_DEFAULTS: EditForm = {
  email: 'sneha.jose@storelocal.com',
  mobile: '+1 (949) 938-9387',
  mailingLookup: '',
  address: '435 Woodland Drive',
  city: 'Laguna Beach',
  state: 'California',
  zip: '92651',
  // Unticked in the frame; the alternate-contact toggle is ticked.
  applyToAll: false,
  hasAlternate: true,
  altFirst: 'Betty',
  altLast: 'Boo',
  altEmail: 'Betty@boo.com',
  altPhone: '+91 938 938 9387',
  altLookup: '',
  altAddress: '435 Woodland Drive',
  altCity: 'Laguna Beach',
  altState: 'California',
  altZip: '92651',
};

/** sic — the frame reads "Updates to updates to". See the header note. */
export const EDIT_ACCOUNT_NOTE =
  'Updates to updates to email and phone will apply to all spaces associated with this account.';

/**
 * Payment Activity (8884-131918). Account-wide, not per-unit — the frame's
 * rows name different spaces, and its first row is one payment covering two.
 */
export const PAYMENT_ACTIVITY: ActivityRow[] = [
  {
    date: '06/15/2026',
    method: 'xxxxx 7468',
    // "#305" is not a space in the design's own data. Verbatim; see the header.
    spaces: ['#41', '#305'],
    invoices: ['#763537828', '#873636882'],
    amount: '$123.00',
    balance: '$0.00',
  },
  { date: '06/15/2026', method: 'Cash', spaces: ['#41'], invoices: ['#763537828'], amount: '$50.00', balance: '$60.00' },
  { date: '06/15/2026', method: 'xxxxx 9837', spaces: ['#41'], invoices: ['#763537828'], amount: '$123.00', balance: '$0.00' },
  { date: '06/15/2026', method: 'xxxxx 7468', spaces: ['#41'], invoices: ['#763537828'], amount: '$123.00', balance: '$0.00' },
  { date: '06/15/2026', method: 'xxxxx 7468', spaces: ['#41'], invoices: ['#763537828'], amount: '$123.00', balance: '$0.00' },
  { date: '06/15/2026', method: 'xxxxx 7468', spaces: ['#41'], invoices: ['#763537828'], amount: '$123.00', balance: '$0.00' },
];
