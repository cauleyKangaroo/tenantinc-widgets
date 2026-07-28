// Shared lead-creation ("Send us a Message") used by #03 property-info and #05
// space-list. Each widget passes its own API credentials (from config.json).

export interface LeadApiConfig {
  baseUrl: string;
  appId: string;
  apiKey: string;
  companyId: string;
  propertyId: string;
}

export interface LeadInput {
  first: string;
  last: string;
  email: string;
  /** Raw phone as typed; digits are extracted before sending. */
  phone: string;
  /** The visitor's message — sent as the lead `content`. */
  message: string;
  /** Facility to attach the lead to; defaults to the config property. */
  propertyId?: string;
}

/**
 * Create an "inquiry" lead. Hard-won API notes:
 *  - the leads endpoint is on /v1 (not /v2 like the other calls);
 *  - the message goes in `content` — a top-level `notes` field is rejected
 *    (`"notes" is not allowed`) despite the sample curl showing one;
 *  - source is fixed to "website"; the contact is deduped server-side by email.
 */
export async function createLead(cfg: LeadApiConfig, input: LeadInput): Promise<unknown> {
  const url = `${cfg.baseUrl}/applications/${cfg.appId}/v1/companies/${cfg.companyId}/leads/`;

  const body = {
    source: 'website',
    property_id: input.propertyId || cfg.propertyId,
    lead_type: 'inquiry',
    subject: 'Website Inquiry',
    content: input.message,
    Contact: {
      first: input.first,
      last: input.last,
      email: input.email,
      Phones: [{ phone: input.phone.replace(/\D/g, ''), sms: true, type: 'Cell' }],
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
      'x-storageapi-key': cfg.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`createLead failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
