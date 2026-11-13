// ===========================================================================
// The account the loading skeleton is shaped from.
//
// While a signed-in reader's record loads, the page is drawn as grey boxes
// over its own markup (`ma-wrapper--busy` in MyAccount.css), so the boxes are
// only as right as the content they are drawn from. The design sample in
// data.ts is the wrong source: it is a Figma mock-up, with more lines per
// space and longer copy than any real record, so the skeleton stood 200-470px
// taller than the account that replaced it and the page jumped up on load.
//
// So the skeleton is drawn from THIS instead: a placeholder record in the
// live API's own shape, put through the very mappers the real record goes
// through (spacesFrom / propertiesFrom / activityFrom). Same fields, same
// structure, typical lengths — the boxes come out the shape a real account
// draws. None of it is ever readable: the skeleton hides every word.
//
// HOW MANY SPACES. Accounts hold one, two, three... (verified live: 1, 3 and
// 1 behind a single email). The count the reader's account had last time is
// remembered per contact, so a returning reader's skeleton matches theirs
// (none included: an account with no spaces draws its "No active rentals"
// box); a first visit assumes one, the commonest case. Only the number is
// stored.
// ===========================================================================

import type { AccountRecord } from '@shared/accountApi';

const COUNT_KEY = 'hb.account.leaseCount';
/** A sane ceiling: a remembered figure must never draw a page of boxes. */
const MAX_SPACES = 4;

function lease(i: number): Record<string, unknown> {
  // The first space owes its rent and the rest are paid up — the usual mix,
  // and it draws both the balance-due and the paid-through variants.
  const owing = i === 0;
  return {
    id: `skeleton-lease-${i}`,
    rent: 120,
    balance: owing ? 120 : 0,
    openBalance: owing ? 120 : 0,
    daysLate: 0,
    billDay: 1,
    paidThroughDate: '2026-11-30',
    invoices: [{
      id: `skeleton-invoice-${i}`,
      number: `10${i}`,
      date: '2026-11-01',
      due: '2026-11-05',
      totalDue: 120,
      balance: owing ? 120 : 0,
    }],
    unit: {
      id: `skeleton-unit-${i}`,
      number: String(21 + i),
      line1: '10326 Foster Rd.',
      line: '10326 Foster Rd.',
      city: 'Bellflower',
      state: 'CA',
      zip: '90706',
      propertyId: 'skeleton-property',
      type: 'storage',
      label: "10' x 10'",
      size: "10' x 10'",
      amenities: ['Climate Controlled', 'Drive-Up Access'],
    },
  };
}

/** A placeholder record with `spaces` leases (0 allowed), in the live API's shape. */
export function skeletonRecord(spaces: number): AccountRecord {
  const n = Math.min(MAX_SPACES, Math.max(0, Math.round(spaces) || 0));
  return {
    id: 'skeleton',
    first: 'Placeholder',
    last: 'Account',
    email: 'placeholder@example.com',
    phones: [{ phone: '+15555550100', type: 'cell' }],
    paymentMethods: [],
    leases: Array.from({ length: n }, (_, i) => lease(i)),
  };
}

function store(): Storage | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; }
}

/** How many spaces this contact's account had last time; 1 if unknown. */
export function recalledSpaceCount(contactId: string | undefined): number {
  if (!contactId) return 1;
  try {
    const all = JSON.parse(store()?.getItem(COUNT_KEY) ?? '{}') as Record<string, unknown>;
    if (!(contactId in all)) return 1;
    const n = Number(all[contactId]);
    return Number.isFinite(n) && n >= 0 ? Math.min(MAX_SPACES, Math.round(n)) : 1;
  } catch {
    return 1;
  }
}

/** Remember the count for next time. Best-effort; storage may be blocked. */
export function rememberSpaceCount(contactId: string | undefined, count: number): void {
  if (!contactId) return;
  try {
    const s = store();
    if (!s) return;
    const all = JSON.parse(s.getItem(COUNT_KEY) ?? '{}') as Record<string, unknown>;
    all[contactId] = Math.max(0, Math.round(count));
    s.setItem(COUNT_KEY, JSON.stringify(all));
  } catch { /* unavailable or corrupt — next visit assumes one */ }
}
