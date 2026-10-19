import type { IdvIdentity } from './idvApi';
import type { IdvScope } from './idvApi';
import { idvSessionGet, idvSessionSet } from './idvStorage';
import type { IdvRequirement } from './idvPolicy';
import { isRawIdvId } from './idvLinking';

export type LeadContact = Pick<IdvIdentity, 'first' | 'last' | 'email' | 'phone'>;
export interface PreparedIdvLead { contact: LeadContact; contactId: string; leadId: string; expiresAt: number }
export interface IdvCheckoutReadiness { contact: LeadContact; scope: IdvScope; verified: boolean; idvId?: string }
const LEAD_TTL_MS = 30 * 60 * 1000;
const leadKey = (scope: IdvScope) => `mariposa:idv:lead:v1:${scope.companyId}:${scope.propertyId}`;

export function sameLeadContact(a: LeadContact, b: LeadContact): boolean {
  return a.first.trim() === b.first.trim() && a.last.trim() === b.last.trim()
    && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()
    && a.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '');
}

export function allowsOneStepPayment(policy: { requirement: IdvRequirement; policyPending: boolean; scope: IdvScope } | undefined,
  readiness: IdvCheckoutReadiness | undefined, currentContact: LeadContact): boolean {
  return !policy || (!policy.policyPending && (policy.requirement === 'disabled'
    || Boolean(readiness && sameLeadContact(readiness.contact, currentContact)
      && readiness.scope.companyId === policy.scope.companyId && readiness.scope.propertyId === policy.scope.propertyId
      && (readiness.verified ? isRawIdvId(readiness.idvId) : policy.requirement === 'optional'))));
}

export function checkoutIdvId(policy: { requirement: IdvRequirement; policyPending: boolean; scope: IdvScope } | undefined,
  readiness: IdvCheckoutReadiness | undefined, contact: LeadContact): string | undefined {
  return policy && readiness?.verified && isRawIdvId(readiness.idvId)
    && readiness.scope.companyId === policy.scope.companyId && readiness.scope.propertyId === policy.scope.propertyId
    && sameLeadContact(readiness.contact, contact) && allowsOneStepPayment(policy, readiness, contact)
    ? readiness.idvId : undefined;
}

/** The actual v1 lead response, verified against staging on 2026-10-14. */
export function parseCreatedIdvLead(response: unknown, appId: string, contact: LeadContact): PreparedIdvLead {
  const envelope = response as { applicationData?: Record<string, Array<{ status?: number; data?: { contact_id?: unknown; lead_id?: unknown } }>> } | null;
  const result = envelope?.applicationData?.[appId]?.[0];
  const contactId = result?.data?.contact_id;
  const leadId = result?.data?.lead_id;
  if (result?.status !== 200 || typeof contactId !== 'string' || !contactId.trim()
    || typeof leadId !== 'string' || !leadId.trim()) {
    throw new Error('Your contact could not be prepared for verification. Please try again.');
  }
  return { contact, contactId, leadId, expiresAt: Date.now() + LEAD_TTL_MS };
}

export function readPreparedIdvLead(scope: IdvScope): PreparedIdvLead | undefined {
  try {
    const raw = idvSessionGet(leadKey(scope));
    if (!raw) return undefined;
    const lead = JSON.parse(raw) as PreparedIdvLead;
    if (!lead || !Number.isFinite(lead.expiresAt) || lead.expiresAt <= Date.now()
      || typeof lead.contactId !== 'string' || !lead.contactId || typeof lead.leadId !== 'string' || !lead.leadId
      || !lead.contact || ['first', 'last', 'email', 'phone'].some(key => typeof lead.contact[key as keyof LeadContact] !== 'string')) return undefined;
    return lead;
  } catch { return undefined; }
}

export function savePreparedIdvLead(scope: IdvScope, lead: PreparedIdvLead): void {
  // Contact preparation is not an IDV start. If this cannot save, the
  // controller's own uncertainty markers still apply.
  idvSessionSet(leadKey(scope), JSON.stringify(lead));
}
