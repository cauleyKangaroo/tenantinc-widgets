import cfg from './config.json';
import {
  computeStatus, formatSchedule, formatScheduleByDay,
  type AccessHoursSection, type HoursStatus, type ScheduleRow,
} from '@shared/accessHours';

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;

// ---------------------------------------------------------------------------
// Raw API response types — only the fields we actually use
// ---------------------------------------------------------------------------

interface ApiAddress {
  id: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number;
  lng: number;
}

interface ApiPhone {
  phone?: string;
  number?: string;
  type?: string;   // e.g. "Main"
  status?: number;
}

interface ApiEmail {
  email?: string;
  type?: string;
  status?: number;
}

interface ApiSocialMedia {
  platform?: string;
  type?: string;
  url?: string;
  link?: string;
}

interface ApiUnitTypeCount {
  unit_type: string;        // "storage" | "parking"
  total_count: number;
  vacant_count: number;
}

export interface ApiProperty {
  id: string;
  name: string;
  status: number;
  utc_offset?: string;      // IANA tz, e.g. "America/Los_Angeles"
  // Capitalized in the API; may be missing/empty when unset.
  Address?: ApiAddress | '';
  Phones?: ApiPhone[] | '';
  Emails?: ApiEmail[] | '';
  Images?: unknown[] | '';
  AccessHours?: AccessHoursSection[] | '';
  SocialMedia?: ApiSocialMedia[] | '';
  unit_type_counts?: ApiUnitTypeCount[];
}

interface ApiResponse {
  message: string;
  applicationData: Record<string, Array<{
    status: number;
    data: { properties: ApiProperty[] };
  }>>;
}

// ---------------------------------------------------------------------------
// Mapped shape the widget consumes
// ---------------------------------------------------------------------------

export interface PropertyDetails {
  id: string;
  name: string;
  /** "5281 California, Irvine, CA 92617" */
  address: string;
  lat: number | null;
  lng: number | null;
  phones: { number: string; note?: string }[];
  /** First active email, e.g. "email.test@tenantinc.com" — null when unset. */
  email: string | null;
  /** Computed live status per section; null when that section is disabled/absent. */
  hours: { office: HoursStatus | null; gate: HoursStatus | null; callCenter: HoursStatus | null };
  /** Grouped weekly schedule per section for the "See all Hours" panel. */
  schedule: { office: ScheduleRow[]; gate: ScheduleRow[]; callCenter: ScheduleRow[] };
  /** One entry per enabled AccessHours type (Office / Gate / Call Center / …). */
  scheduleSections: { title: string; rows: ScheduleRow[] }[];
  socials: { platform: string; url: string }[];
  unitCounts: { storage: number | null; parking: number | null };
}

/** "18888888888" → "(888) 888-8888"; leaves anything unrecognized as-is. */
export function formatPhone(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) return rawNumber;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

// ---------------------------------------------------------------------------
// Fetch + filter
// ---------------------------------------------------------------------------

export async function fetchProperties(): Promise<unknown> {
  // Expansion flags pull in the nested sections the widget renders.
  const params = 'access_hours=true&amenities=true&unit_type_counts=true&faq=true&social_media=true';
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${COMPANY_ID}/properties?${params}`;

  const res = await fetch(url, {
    headers: {
      'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
      'x-storageapi-key': API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`fetchProperties failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lead creation ("Send us a Message")
// ---------------------------------------------------------------------------

export interface LeadInput {
  first: string;
  last: string;
  email: string;
  /** Raw phone as typed; digits are extracted before sending. */
  phone: string;
  /** The visitor's message — sent as the lead `content`. */
  message: string;
  /** Facility to attach the lead to; defaults to the configured property. */
  propertyId?: string;
}

/**
 * Create an "inquiry" lead from the Send-Message form. Notes:
 *  - the leads endpoint is on /v1 (not /v2 like the other calls);
 *  - the message goes in `content` — the API rejects a top-level `notes` field
 *    (`"notes" is not allowed`), despite the sample curl showing one;
 *  - source is fixed to "website"; the contact is deduped server-side by email.
 */
export async function createLead(input: LeadInput): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v1/companies/${COMPANY_ID}/leads/`;

  const body = {
    source: 'website',
    property_id: input.propertyId || PROPERTY_ID,
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
      'x-storageapi-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`createLead failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Pull the properties array out of the nested response and find ours by id. */
export function findProperty(raw: unknown, propertyId: string = PROPERTY_ID): PropertyDetails | null {
  const response = raw as ApiResponse;
  const list = response?.applicationData?.[APP_ID]?.[0]?.data?.properties ?? [];
  const prop = list.find((p) => p.id === propertyId);
  if (!prop) return null;

  // Address / Phones are "" (empty string) when unset — guard before reading.
  const addr = prop.Address && typeof prop.Address === 'object' ? prop.Address : null;
  const address = addr
    ? [addr.address, addr.address2].filter(Boolean).join(' ') + `, ${addr.city}, ${addr.state} ${addr.zip}`
    : '';

  const phones = Array.isArray(prop.Phones)
    ? prop.Phones
        .filter((p) => p.status !== 0)
        .map((p) => ({ number: formatPhone(p.phone ?? p.number ?? ''), note: p.type }))
        .filter((p) => p.number)
    : [];

  const email = Array.isArray(prop.Emails)
    ? prop.Emails.find((e) => e.status !== 0 && e.email)?.email ?? null
    : null;

  // Live gate/office/call-centre status + grouped weekly schedule, in the property's own tz.
  const access = Array.isArray(prop.AccessHours) ? prop.AccessHours : [];
  const sectionOf = (type: string) => access.find((a) => a.type === type);
  const officeSection = sectionOf('office');
  const gateSection = sectionOf('gate');
  const callCenterSection = sectionOf('call_center');
  const hours = {
    office: computeStatus(officeSection, 'Office', prop.utc_offset),
    gate: computeStatus(gateSection, 'Gate', prop.utc_offset),
    callCenter: computeStatus(callCenterSection, 'Call Center', prop.utc_offset),
  };
  const schedule = {
    office: formatSchedule(officeSection),
    gate: formatSchedule(gateSection),
    callCenter: formatSchedule(callCenterSection),
  };

  // A titled schedule per enabled AccessHours type, so the "See all Hours" modal
  // can show Gate / Office / Call Center (etc.) as separate columns. Preferred
  // order first; empty/disabled sections are dropped.
  const TYPE_LABELS: Record<string, string> = {
    gate: 'Gate Hours', office: 'Office Hours', call_center: 'Call Center Hours',
  };
  const TYPE_ORDER = ['gate', 'office', 'call_center'];
  const titleFor = (type: string) =>
    TYPE_LABELS[type] ?? `${type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Hours`;
  const scheduleSections = access
    .map((s) => ({ type: s.type, title: titleFor(s.type), rows: formatScheduleByDay(s) }))
    .filter((s) => s.rows.length > 0)
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a.type); const bi = TYPE_ORDER.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(({ title, rows }) => ({ title, rows }));

  const socials = Array.isArray(prop.SocialMedia)
    ? prop.SocialMedia
        .map((s) => ({ platform: (s.platform ?? s.type ?? '').toLowerCase(), url: s.url ?? s.link ?? '' }))
        .filter((s) => s.platform && s.url)
    : [];

  const counts = Array.isArray(prop.unit_type_counts) ? prop.unit_type_counts : [];
  const vacantOf = (type: string) => counts.find((c) => c.unit_type === type)?.vacant_count ?? null;
  const unitCounts = { storage: vacantOf('storage'), parking: vacantOf('parking') };

  return {
    id: prop.id,
    name: prop.name,
    address,
    lat: addr?.lat ?? null,
    lng: addr?.lng ?? null,
    phones,
    email,
    hours,
    schedule,
    scheduleSections,
    socials,
    unitCounts,
  };
}
