import cfg from './config.json';
import {
  computeStatus, formatSchedule, formatScheduleByDay,
  type AccessHoursSection, type HoursStatus, type ScheduleRow,
} from '@shared/accessHours';

// Second API call for this widget: the properties endpoint (with expansions)
// supplies FAQ, contact phone, and social links for the sidebar accordion.
// The primary call (space-groups) still lives in ./api.ts.

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;

// ---------------------------------------------------------------------------
// Raw response types — only what we read
// ---------------------------------------------------------------------------

interface ApiPhone {
  phone?: string;
  number?: string;
  type?: string;
  status?: number;
}

// question/answer are localized maps, e.g. { en: "...", es: "" }.
interface ApiLocalized { en?: string; es?: string; }

interface ApiFaq {
  question?: ApiLocalized;
  answer?: ApiLocalized;
}

interface ApiSocialMedia {
  platform?: string;
  type?: string;
  url?: string;
  link?: string;
}

interface ApiProperty {
  id: string;
  name?: string;
  utc_offset?: string;      // IANA tz, e.g. "America/Los_Angeles"
  Phones?: ApiPhone[] | '';
  Faq?: ApiFaq[] | '';
  SocialMedia?: ApiSocialMedia[] | '';
  AccessHours?: AccessHoursSection[] | '';
}

interface ApiResponse {
  applicationData: Record<string, Array<{
    status: number;
    data: { properties: ApiProperty[] };
  }>>;
}

// ---------------------------------------------------------------------------
// Mapped shape the sidebar sections consume
// ---------------------------------------------------------------------------

export interface PropertyExtras {
  /** Property display name, e.g. "Storelocal Dove Mountain". */
  name: string;
  phones: { number: string; note?: string }[];
  socials: { platform: string; url: string }[];
  faqs: { question: string; answer: string }[];
  /** Live open/closed status per section; null when disabled/absent. */
  hours: { office: HoursStatus | null; gate: HoursStatus | null };
  /** Grouped weekly schedule per section for "See all Hours". */
  schedule: { office: ScheduleRow[]; gate: ScheduleRow[] };
  /** One entry per enabled AccessHours type (Gate / Office / Call Center / …),
   *  listed day-by-day, for the "See all Hours" popup. */
  scheduleSections: { title: string; rows: ScheduleRow[] }[];
}

/** "18888888888" → "(888) 888-8888"; leaves anything unrecognized as-is. */
export function formatPhone(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) return rawNumber;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

// ---------------------------------------------------------------------------
// Fetch + extract
// ---------------------------------------------------------------------------

export async function fetchProperties(): Promise<unknown> {
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

/** Find our property and pull out the phone / social / FAQ bits for the sidebar. */
export function extractPropertyExtras(raw: unknown, propertyId: string = PROPERTY_ID): PropertyExtras | null {
  const response = raw as ApiResponse;
  const list = response?.applicationData?.[APP_ID]?.[0]?.data?.properties ?? [];
  const prop = list.find((p) => p.id === propertyId);
  if (!prop) return null;

  const phones = Array.isArray(prop.Phones)
    ? prop.Phones
        .filter((p) => p.status !== 0)
        .map((p) => ({ number: formatPhone(p.phone ?? p.number ?? ''), note: p.type }))
        .filter((p) => p.number)
    : [];

  const socials = Array.isArray(prop.SocialMedia)
    ? prop.SocialMedia
        .map((s) => ({ platform: (s.platform ?? s.type ?? '').toLowerCase(), url: s.url ?? s.link ?? '' }))
        .filter((s) => s.platform && s.url)
    : [];

  const faqs = Array.isArray(prop.Faq)
    ? prop.Faq
        .map((f) => ({ question: f.question?.en ?? '', answer: f.answer?.en ?? '' }))
        .filter((f) => f.question && f.answer)
    : [];

  // Live gate/office status + grouped weekly schedule, in the property's own tz.
  const access = Array.isArray(prop.AccessHours) ? prop.AccessHours : [];
  const sectionOf = (type: string) => access.find((a) => a.type === type);
  const officeSection = sectionOf('office');
  const gateSection = sectionOf('gate');
  const hours = {
    office: computeStatus(officeSection, 'Office', prop.utc_offset),
    gate: computeStatus(gateSection, 'Gate', prop.utc_offset),
  };
  const schedule = {
    office: formatSchedule(officeSection),
    gate: formatSchedule(gateSection),
  };

  // Per enabled type, listed day-by-day, for the "See all Hours" popup.
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

  return { name: prop.name ?? '', phones, socials, faqs, hours, schedule, scheduleSections };
}
