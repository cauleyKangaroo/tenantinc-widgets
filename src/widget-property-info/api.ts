import cfg from './config.json';

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

export interface ApiProperty {
  id: string;
  name: string;
  status: number;
  // Capitalized in the API; may be missing/empty when unset.
  Address?: ApiAddress | '';
  Phones?: ApiPhone[] | '';
  Emails?: ApiEmail[] | '';
  Images?: unknown[] | '';
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
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${COMPANY_ID}/properties/`;

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

  return {
    id: prop.id,
    name: prop.name,
    address,
    lat: addr?.lat ?? null,
    lng: addr?.lng ?? null,
    phones,
    email,
  };
}
