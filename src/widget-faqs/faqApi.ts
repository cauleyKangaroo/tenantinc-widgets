import cfg from './config.json';

// Pulls the property's FAQ list from the properties endpoint (faq expansion).

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;
const COMPANY_ID = cfg.companyId;
const PROPERTY_ID = cfg.propertyId;

// question/answer are localized maps, e.g. { en: "...", es: "" }.
interface ApiLocalized { en?: string; es?: string; }

interface ApiFaq {
  question?: ApiLocalized;
  answer?: ApiLocalized;
}

interface ApiProperty {
  id: string;
  Faq?: ApiFaq[] | '';
}

interface ApiResponse {
  applicationData: Record<string, Array<{
    status: number;
    data: { properties: ApiProperty[] };
  }>>;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export async function fetchProperties(): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${COMPANY_ID}/properties?faq=true`;

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

/** Find our property and extract its FAQ list (English text). */
export function extractFaqs(raw: unknown, propertyId: string = PROPERTY_ID): FaqItem[] {
  const response = raw as ApiResponse;
  const list = response?.applicationData?.[APP_ID]?.[0]?.data?.properties ?? [];
  const prop = list.find((p) => p.id === propertyId);
  if (!prop || !Array.isArray(prop.Faq)) return [];

  return prop.Faq
    .map((f) => ({ question: f.question?.en ?? '', answer: f.answer?.en ?? '' }))
    .filter((f) => f.question && f.answer);
}
