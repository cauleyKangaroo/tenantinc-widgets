import cfg from './config.json';
import { fetchPropertiesPreferCollection, asPropertiesResponse } from '@shared/propertiesSource';
import {
  resolveBoundProperty, resolvePropertyId, resolveRequireId, type BoundPropertyProps,
} from '@shared/propertyBinding';
import { resolveCompanyIdFromSources } from '@shared/companySource';

export type { BoundPropertyProps };

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

/**
 * Duda's "Properties" collection when it's bound to our company, else the keyed
 * REST call. Same envelope either way, so extractFaqs below is unchanged.
 * See @shared/propertiesSource.
 */
export async function fetchProperties(requirePropertyId: string | undefined = PROPERTY_ID): Promise<unknown> {
  return fetchPropertiesPreferCollection(APP_ID, fetchPropertiesFromApi, { requirePropertyId });
}

/**
 * FAQs for the property this instance is bound to — the dynamic-page equivalent of
 * `fetchProperties` + `extractFaqs`. With `propertyId` connected to `Properties > id`
 * the row comes straight from the collection (its `Faq` array arrives parsed);
 * otherwise this falls back to the collection-then-REST fetch, with the trust check
 * using the EFFECTIVE id rather than the stale config.json one.
 *
 * Note there is no `propertyFaq` content-menu binding: `Faq` is an array of
 * localized {question, answer} maps, which a text field cannot carry usefully.
 * FAQs need the `propertyId` route.
 */
export async function fetchFaqsForProperty(bound: BoundPropertyProps = {}): Promise<FaqItem[]> {
  const effectiveId = resolvePropertyId(bound, PROPERTY_ID);
  const row = await resolveBoundProperty('#10 faqs', bound, { configPropertyId: PROPERTY_ID });

  if (row) {
    const faqs = extractFaqs(asPropertiesResponse([row], APP_ID), String(row.id ?? effectiveId));
    if (faqs.length) return faqs;
  }

  return extractFaqs(await fetchProperties(resolveRequireId(bound, PROPERTY_ID)), effectiveId);
}

/**
 * The company this widget is scoped to — `Company` collection first, config.json
 * only as the editor/harness fallback. See @shared/companySource.
 */
function companyId(bound: BoundPropertyProps = {}): Promise<string> {
  return resolveCompanyIdFromSources('#10 faqs', bound, COMPANY_ID);
}

async function fetchPropertiesFromApi(): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v2/companies/${await companyId()}/properties?faq=true`;

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
