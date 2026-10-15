// ===========================================================================
// Step 2 → the tenant's contact record, through the proxy.
//
//   PATCH {login_api_base}/api/tenant/contacts/{contactId}
//   headers: X-Duda-Site-Id
//   body:    { details, addresses, secondaryContacts, military } — the same
//            shape #19 My Account sends to PATCH /api/account/contact, keyed
//            by contact id instead of by session (spec received 2026-10-15).
//
// What Step 2 collects and where it now goes:
//   licence number / state / expiry   → details.driverLicense / State / Expiration
//   date of birth (Military ticked)   → details.dob
//   mailing address                   → addresses[] (type "Mailing")
//   alternate contact                 → secondaryContacts[] (isAlternate, on
//                                        this lease) — it used to be collected
//                                        and DROPPED, the direct PUT had no
//                                        field for it
//   vehicle                           → nowhere, still: the contract has no
//                                        vehicle section
//   military                          → not sent: the form asks only for a
//                                        date of birth, and the contract's
//                                        military object needs branch, rank,
//                                        service dates… none of which exist
//
// SENDS ONLY WHAT WAS FILLED. A key present but empty would blank a value the
// tenant may have given at the counter (the upstream PUT does exactly that,
// and the proxy's PATCH is documented the same way).
//
// Pure body-building is kept apart from the fetch so `npm run test:contact-
// patch` can pin the request shape without a browser. The import is relative
// rather than `@shared/…` for the same reason: that test compiles this file
// on its own, with no path alias.
// ===========================================================================

import { countryCode } from '../shared/countries';

/** What Step 2 hands over (see SuccessDetails) — only the parts filed here. */
export interface ContactPatchInput {
  driverLicense?: string;
  /** As typed, MM/DD/YYYY. */
  driverLicenseExp?: string;
  driverLicenseState?: string;
  mailingAddress?: { address: string; city?: string; state?: string; zip?: string };
  extras?: {
    /** MM/DD/YYYY. */
    dob?: string;
    altFirst?: string;
    altLast?: string;
    altPhone?: string;
    altEmail?: string;
    /** 'United States' | 'Canada' — a name, as the picker stores it. */
    altCountry?: string;
    altAddress?: string;
    altCity?: string;
    altState?: string;
    altZip?: string;
  };
}

export interface ContactPatchBody {
  details?: {
    dob?: string;
    driverLicense?: string;
    driverLicenseState?: string;
    driverLicenseExpiration?: string;
  };
  addresses?: Array<{
    type: string; primary: boolean; line1: string; city?: string; state?: string; zip?: string; country?: string;
  }>;
  secondaryContacts?: Array<{
    leaseId?: string;
    isAlternate: boolean;
    isEmergency: boolean;
    first?: string;
    last?: string;
    email?: string;
    phone?: { number: string; type: string; sms: boolean };
    address?: { line1: string; city?: string; state?: string; zip?: string; country?: string };
  }>;
}

const t = (v: string | undefined): string => (v ?? '').trim();

/** "MM/DD/YYYY" → "YYYY-MM-DD"; anything else → undefined (and so omitted). */
export function mdyToIso(masked: string | undefined): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t(masked));
  if (!m) return undefined;
  const [, mm, dd, yyyy] = m;
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return undefined;
  return `${yyyy}-${mm}-${dd}`;
}

/** Digits only, without a leading US country code — "5559998888". */
export function phoneNumber(v: string | undefined): string {
  const d = t(v).replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
}

/**
 * The PATCH body, or null when nothing was filled — a PATCH with no section
 * is rejected ("Send at least one of details, addresses, secondaryContacts or
 * military"), so the caller skips the request instead.
 */
export function contactPatchBody(input: ContactPatchInput, leaseId?: string): ContactPatchBody | null {
  const body: ContactPatchBody = {};

  const details: NonNullable<ContactPatchBody['details']> = {};
  const dob = mdyToIso(input.extras?.dob);
  if (dob) details.dob = dob;
  if (t(input.driverLicense)) details.driverLicense = t(input.driverLicense);
  if (t(input.driverLicenseState)) details.driverLicenseState = t(input.driverLicenseState);
  const exp = mdyToIso(input.driverLicenseExp);
  if (exp) details.driverLicenseExpiration = exp;
  if (Object.keys(details).length) body.details = details;

  const m = input.mailingAddress;
  if (m && t(m.address)) {
    body.addresses = [{
      type: 'Mailing',
      primary: false,
      line1: t(m.address),
      ...(t(m.city) ? { city: t(m.city) } : {}),
      ...(t(m.state) ? { state: t(m.state) } : {}),
      ...(t(m.zip) ? { zip: t(m.zip) } : {}),
    }];
  }

  const x = input.extras;
  if (x && (t(x.altFirst) || t(x.altLast))) {
    const number = phoneNumber(x.altPhone);
    const country = countryCode(t(x.altCountry));
    body.secondaryContacts = [{
      ...(leaseId ? { leaseId } : {}),
      isAlternate: true,
      isEmergency: false,
      ...(t(x.altFirst) ? { first: t(x.altFirst) } : {}),
      ...(t(x.altLast) ? { last: t(x.altLast) } : {}),
      ...(t(x.altEmail) ? { email: t(x.altEmail) } : {}),
      ...(number ? { phone: { number, type: 'Cell', sms: false } } : {}),
      ...(t(x.altAddress) ? {
        address: {
          line1: t(x.altAddress),
          ...(t(x.altCity) ? { city: t(x.altCity) } : {}),
          ...(t(x.altState) ? { state: t(x.altState) } : {}),
          ...(t(x.altZip) ? { zip: t(x.altZip) } : {}),
          ...(country ? { country } : {}),
        },
      } : {}),
    }];
  }

  return Object.keys(body).length ? body : null;
}

/**
 * Send it. Boolean, never a throw: the rental is complete by the time this
 * runs, and a failure here must not look like a failed rental — it is logged.
 */
export async function patchContactViaProxy(
  base: string, siteId: string, contactId: string, body: ContactPatchBody,
): Promise<boolean> {
  const url = `${base.replace(/\/$/, '')}/api/tenant/contacts/${encodeURIComponent(contactId)}`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Duda-Site-Id': siteId },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[rental] contact PATCH failed: ${res.status}`, text.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[rental] contact PATCH threw:', err);
    return false;
  }
}
