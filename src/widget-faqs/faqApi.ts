import cfg from './config.json';
import { createApiCredsStore, type ApiCredProps } from '@shared/apiConfig';
import { fetchPropertiesPreferCollection, asPropertiesResponse } from '@shared/propertiesSource';
import {
  resolveBoundProperty, resolvePropertyId, resolveRequireId, type BoundPropertyProps,
} from '@shared/propertyBinding';
import { resolveCompanyIdFromSources } from '@shared/companySource';

export type { BoundPropertyProps };

// Pulls the property's FAQ list from the properties endpoint (faq expansion).

/*
 * This widget's REST credentials — the site's, via the Duda JS tab
 * (api_domain / app_id / api_key), with config.json as the fallback for the
 * Duda editor, the dev harness, and sites whose texts are not filled in.
 * See @shared/apiConfig.
 */
const store = createApiCredsStore('#10 faqs', {
  baseUrl: cfg.baseUrl,
  appId: cfg.appId,
  apiKey: cfg.apiKey,
});

/** The credentials to use right now. */
export const creds = store.creds;
/** Apply the site's props. Safe on every render; ignores an empty set. */
export const configureApi = store.configure;
export type { ApiCredProps };

/*
 * Creds plus a company, for the shared API modules.
 *
 * Replaces `{ ...cfg, companyId }`, which pinned baseUrl/appId/apiKey to the
 * build-time file — so the call would have kept using the old host and key
 * even after the site supplied its own, while still rendering normally.
 */
export function credsWithCompany(companyId: string) {
  return { ...store.creds(), companyId };
}

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
export async function fetchProperties(
  requirePropertyId?: string,
  bound: BoundPropertyProps = {},
): Promise<unknown> {
  // No PROPERTY_ID default — see the note in #03's api.ts.
  //
  // `bound` is threaded through so the company can come from the JS tab's
  // `companyId`. Without it the REST call resolved with an empty bound and the
  // prop was silently ignored — the same gap #03 and #07 had.
  return fetchPropertiesPreferCollection(
    creds().appId,
    () => fetchPropertiesFromApi(bound),
    { requirePropertyId },
  );
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
    const faqs = extractFaqs(asPropertiesResponse([row], creds().appId), String(row.id ?? effectiveId));
    if (faqs.length) return faqs;
  }

  return extractFaqs(
    await fetchProperties(resolveRequireId(bound, PROPERTY_ID), bound),
    effectiveId,
  );
}

/**
 * The company this widget is scoped to — `Company` collection first, config.json
 * only as the editor/harness fallback. See @shared/companySource.
 */
function companyId(bound: BoundPropertyProps = {}): Promise<string> {
  return resolveCompanyIdFromSources('#10 faqs', bound, COMPANY_ID);
}

async function fetchPropertiesFromApi(bound: BoundPropertyProps = {}): Promise<unknown> {
  const { baseUrl, appId, apiKey } = creds();
  const url = `${baseUrl}/applications/${appId}/v2/companies/${await companyId(bound)}/properties?faq=true`;

  const res = await fetch(url, {
    headers: {
      'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
      'x-storageapi-key': apiKey,
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
  const list = response?.applicationData?.[creds().appId]?.[0]?.data?.properties ?? [];
  const prop = list.find((p) => p.id === propertyId);
  if (!prop || !Array.isArray(prop.Faq)) return [];

  return prop.Faq
    .map((f) => ({ question: f.question?.en ?? '', answer: f.answer?.en ?? '' }))
    .filter((f) => f.question && f.answer);
}
