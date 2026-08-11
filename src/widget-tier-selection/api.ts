import cfg from './config.json';
import { memoGet, MEMO_TTL } from '@shared/requestMemo';
import { fetchPropertiesPreferCollection } from '@shared/propertiesSource';
import type { TierKey } from './types';

// ---------------------------------------------------------------------------
// Value-tier data layer — DIRECT reads from the TenantInc/Hummingbird storage
// API (no server-side proxy; mirrors the other widgets, e.g. #05). The website
// read key + company/app id ship in the bundle config; every request adds the
// x-storageapi-key and x-storageapi-date headers. Tier assignment (good/better/
// best) is server-assigned on the offers endpoint; this layer classifies
// availability and computes the show-tiers gate client-side (ported from the
// former proxy). Business rules of record: VALUE_TIERS_BUSINESS_RULES.md.
// ---------------------------------------------------------------------------

const BASE = cfg.baseUrl.replace(/\/$/, '');
const APP = cfg.appId;
const KEY = cfg.apiKey;
const appBase = `${BASE}/applications/${APP}`;

/** The one resolved context threaded through every call — a property is always
 *  priced and quoted against the SAME facility (no cross-mixing). */
export interface TierContext {
  propertyId: string;
  companyId: string;
}

export function defaultContext(): TierContext {
  return { propertyId: cfg.propertyId, companyId: cfg.companyId };
}

/** Error carrying HTTP status + parsed body so callers can branch. */
class HttpError extends Error {
  constructor(public status: number, public body: unknown, message: string) { super(message); }
}

function hbHeaders(): Record<string, string> {
  return { 'x-storageapi-date': String(Math.floor(Date.now() / 1000)), 'x-storageapi-key': KEY };
}

async function hbGet(url: string, opts?: { ttlMs?: number; fresh?: boolean }): Promise<unknown> {
  return memoGet(url, async () => {
    const res = await fetch(url, { headers: hbHeaders() });
    const body = await res.json().catch(() => undefined);
    if (!res.ok) throw new HttpError(res.status, body, `GET ${url} failed: ${res.status} ${res.statusText}`);
    return body;
  }, opts);
}

// POST (the configure dry-run quote). Direct fetch — not routed through the
// GET-only memo helper; the quote is volatile and dryrun creates nothing.
async function hbPost(url: string, body: unknown): Promise<unknown> {
  const payload = JSON.stringify(body);
  const res = await fetch(url, { method: 'POST', headers: { ...hbHeaders(), 'Content-Type': 'application/json' }, body: payload });
  const parsed = await res.json().catch(() => undefined);
  if (!res.ok) throw new HttpError(res.status, parsed, `POST ${url} failed: ${res.status} ${res.statusText}`);
  return parsed;
}

/** Unwrap the gateway envelope: applicationData[app][0].data. */
function unwrap(raw: unknown): Record<string, unknown> | undefined {
  const apps = (raw as { applicationData?: Record<string, Array<{ data?: Record<string, unknown> }>> })?.applicationData;
  if (!apps) return undefined;
  return Object.values(apps)[0]?.[0]?.data;
}

/** The first app-data entry (status/msg) — the nested per-app status the gateway
 *  puts inside a 200-ish envelope even on failures. */
function firstAppEntry(raw: unknown): { status?: number; msg?: string; actual_cause?: string } | undefined {
  const apps = (raw as { applicationData?: Record<string, Array<Record<string, unknown>>> })?.applicationData;
  if (!apps) return undefined;
  return Object.values(apps)[0]?.[0] as { status?: number; msg?: string; actual_cause?: string } | undefined;
}

/** The verified no-vacancy offers response: HTTP 400 with a nested
 *  "No available units …" message. Matched precisely — not any 400. */
function isNoVacancyOffers(err: unknown): boolean {
  if (!(err instanceof HttpError) || err.status !== 400) return false;
  const entry = firstAppEntry(err.body);
  const msg = String(entry?.msg ?? entry?.actual_cause ?? '');
  return /no available units/i.test(msg);
}

// --- Value tiers (from the offers endpoint) ----------------------------------
// The offers endpoint IS the source of truth: one offer per enabled tier, each
// with a server-assigned value_tier (good/better/best), an operator label, a
// unit to quote and its display amenities. No client-side assignment.

export interface ValueTierBundle {
  key: TierKey;          // server-assigned value_tier.type — also the handoff ?tier=
  label?: string;        // operator display name (value_tier.label)
  unitId: string;        // the offer's unit — quoted directly and passed as ?unitId=
  price: number;         // standard monthly rate
  promoRate?: number;    // discounted monthly rate when a promo applies (< price)
  promo?: string;        // display name of the first promotion, if any
  promotionIds: string[]; // promotion ids sent to the move-in quote (configure)
  features: string[];
}

export interface ValueTierData {
  size: string;
  bundles: ValueTierBundle[];
  /** Configured tiers the API reports as sold out (authoritative, not inferred
   *  from an absent record), with their operator label. Rendered as
   *  placeholders on desktop. */
  soldOutTiers: Array<{ key: TierKey; label?: string }>;
  featureLabels: string[];
}

export const normalizeSize = (s: string): string => s.toLowerCase().replace(/[^0-9x.]/g, '');

/** Decode space_mix_id ("unitTypeId,sqft,w,l,h" base64) → "W' x L'". */
function sizeFromMix(mix?: string): string | undefined {
  try {
    const p = atob(mix ?? '').split(',');
    if (p.length >= 4) return `${Number(p[2])}' x ${Number(p[3])}'`;
  } catch { /* not base64 */ }
  return undefined;
}

interface UnitGroup { unitGroupId: string; size: string; vacant: number }
interface RawGroupTier { tier_id?: string; description?: string; vacant?: { count?: number } }

/**
 * The property's unit groups (size → unitGroupId). Sourced from the
 * authoritative pricing space group: rate-management names the space group, then
 * its groups payload lists the tiers (`tier_id` = the offers `unitGroupId`).
 */
export async function fetchUnitGroups(ctx: TierContext): Promise<UnitGroup[]> {
  const rm = unwrap(await hbGet(`${appBase}/v1/companies/${ctx.companyId}/properties/${ctx.propertyId}/rate-management`, { ttlMs: MEMO_TTL.pricing })) ?? {};
  const spaceGroupId = (rm.space_group_profile as { id?: string } | undefined)?.id;
  if (!spaceGroupId) return [];
  const raw = await hbGet(`${appBase}/v2/companies/${ctx.companyId}/properties/${ctx.propertyId}/space-groups/${encodeURIComponent(spaceGroupId)}/groups`, { ttlMs: MEMO_TTL.pricing });
  const profiles = (unwrap(raw)?.spaceGroupProfile as Record<string, { groups?: Array<{ tiers?: RawGroupTier[] }> }> | undefined) ?? {};
  const out: UnitGroup[] = [];
  for (const prof of Object.values(profiles)) {
    for (const g of prof.groups ?? []) for (const t of g.tiers ?? []) {
      if (t.tier_id && t.description) out.push({ unitGroupId: t.tier_id, size: t.description.trim(), vacant: t.vacant?.count ?? 0 });
    }
  }
  return out;
}

/**
 * offers needs a unitGroupId. Pick the requested size's group (preferring one
 * with vacancy). Without a size, `allowAutoPick` must be set (editor/dev only)
 * — a published page never guesses which product to show.
 */
export function resolveUnitGroupId(groups: UnitGroup[], requestedSize?: string, allowAutoPick = false): UnitGroup | undefined {
  const wanted = requestedSize ? normalizeSize(requestedSize) : undefined;
  if (!wanted && !allowAutoPick) return undefined;
  const cands = wanted ? groups.filter((g) => normalizeSize(g.size) === wanted) : groups.slice();
  if (!cands.length) return undefined;
  return [...cands].sort((a, b) => b.vacant - a.vacant)[0];
}

interface AvailableOfferDto {
  type: string; label?: string; availability: 'available';
  unitId: string; price: number; promoRate?: number; spaceMixId?: string;
  promotions?: Array<{ id?: string; name?: string }>;
  amenities?: Array<{ name?: string; value?: string }>;
}
interface SoldOutOfferDto { type: string; label?: string; availability: 'sold_out'; unitId: null; price: null }
type OfferDto = AvailableOfferDto | SoldOutOfferDto;

export interface OffersResult { offers: OfferDto[]; soldOut: boolean; showTierPricing: boolean }

interface RawAmenity { name?: string; value?: string; sort_order?: number; show_in_website?: number }
interface RawDiscount { value?: number; type?: string }
interface RawOffer {
  unit_id?: string; price?: number; space_mix_id?: string;
  value_tier?: { type?: string; label?: string };
  promotions?: Array<{ id?: string; name?: string }>;
  costs?: { Discounts?: RawDiscount[] };
  amenities?: RawAmenity[];
}
const VALID_TIER_TYPES = new Set(['good', 'better', 'best']);

/** Discounted monthly rate from the offer's costs.Discounts, or undefined.
 *  Only returned when it computes to a positive rate strictly below the
 *  standard price — a mis-read must never invent a higher/equal "promo". */
function computePromoRate(price: number, discounts?: RawDiscount[]): number | undefined {
  const d = (discounts ?? []).find((x) => typeof x.value === 'number' && x.value > 0);
  if (!d || typeof d.value !== 'number') return undefined;
  const rate = d.type === 'percent' ? price * (1 - d.value / 100) : price - d.value;
  return rate > 0 && rate < price ? rate : undefined;
}

/** An available tier: real unit + usable price, display amenities only. */
function toAvailableOffer(o: RawOffer): AvailableOfferDto {
  const amenities = (o.amenities ?? [])
    .filter((a) => a.show_in_website === 1)
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    .map((a) => ({ name: a.name, value: a.value }));
  return {
    type: o.value_tier!.type as string,
    label: o.value_tier?.label,
    availability: 'available',
    unitId: o.unit_id as string,
    price: o.price as number,
    promoRate: computePromoRate(o.price as number, o.costs?.Discounts),
    spaceMixId: o.space_mix_id,
    promotions: (o.promotions ?? []).map((p) => ({ id: p.id, name: p.name })),
    amenities,
  };
}
function toSoldOutOffer(type: string, label?: string): SoldOutOfferDto {
  return { type, label, availability: 'sold_out', unitId: null, price: null };
}

/**
 * Value-pricing offers for a unit group — classified client-side (was the
 * proxy's job): available (real unit + usable price), sold_out (the API's own
 * both-null record), or dropped (unknown tier / inconsistent / duplicate). A
 * tier the API omits is "not configured" and never appears. `showTierPricing` =
 * ≥1 configured tier; `soldOut` = the verified no-vacancy 400, or all-configured
 * -sold-out. `fresh` bypasses the browser GET cache (modal opens).
 */
export async function fetchOffers(ctx: TierContext, unitGroupId: string, opts?: { fresh?: boolean }): Promise<OffersResult> {
  let raw: unknown;
  try {
    raw = await hbGet(
      `${appBase}/v2/companies/${ctx.companyId}/properties/${ctx.propertyId}/offers?amenities=[]&promotions=[]&unitGroupId=${encodeURIComponent(unitGroupId)}`,
      { ttlMs: MEMO_TTL.pricing, fresh: opts?.fresh },
    );
  } catch (err) {
    if (isNoVacancyOffers(err)) return { offers: [], soldOut: true, showTierPricing: false };
    throw err;
  }
  const rawOffers = (unwrap(raw)?.offers as RawOffer[] | undefined) ?? [];
  const seenTier = new Set<string>();
  const seenUnit = new Set<string>();
  const offers: OfferDto[] = [];
  for (const o of rawOffers) {
    const type = o.value_tier?.type;
    if (!type || !VALID_TIER_TYPES.has(type) || seenTier.has(type)) continue;
    const hasUnit = o.unit_id != null;
    const hasPrice = o.price != null;
    if (!hasUnit && !hasPrice) { seenTier.add(type); offers.push(toSoldOutOffer(type, o.value_tier?.label)); continue; }
    const priceOk = typeof o.price === 'number' && Number.isFinite(o.price) && o.price >= 0;
    if (!hasUnit || !priceOk || seenUnit.has(o.unit_id as string)) continue;
    seenTier.add(type); seenUnit.add(o.unit_id as string);
    offers.push(toAvailableOffer(o));
  }
  const soldOut = offers.length > 0 && !offers.some((o) => o.availability === 'available');
  return { offers, soldOut, showTierPricing: offers.length >= 1 };
}

const TIER_ORDER: Record<string, number> = { good: 0, better: 1, best: 2 };
const VALID_TIERS = new Set<string>(['good', 'better', 'best']);
const FEATURE_MAX = 6;

/** Human feature label: a boolean amenity ("Yes") shows its name; "No" is
 *  dropped; anything else shows its value ("Roll-Up Door", "Ground Level"). */
function amenityLabel(a: { name?: string; value?: string }): string | undefined {
  const v = (a.value ?? '').trim();
  if (/^no$/i.test(v)) return undefined;
  if (/^yes$/i.test(v)) return a.name;
  return v || a.name;
}

/** Offers → ValueTierData. Tiers are classified server-side (availability).
 *  Defensive second line (the proxy already validates): keep the first of any
 *  duplicate tier, drop an available offer without a usable unit/price, and
 *  record explicit sold-out tiers separately. Needs ≥1 available tier to sell;
 *  an all-sold-out group returns undefined (nothing to quote). */
export function mapOffersToTiers(offers: OfferDto[], requestedSize?: string): ValueTierData | undefined {
  const seenTier = new Set<string>();
  const seenUnit = new Set<string>();
  const available: AvailableOfferDto[] = [];
  const soldOutTiers: Array<{ key: TierKey; label?: string }> = [];
  for (const o of offers) {
    const t = o.type;
    if (!t || !VALID_TIERS.has(t) || seenTier.has(t)) continue;
    if (o.availability === 'sold_out') { seenTier.add(t); soldOutTiers.push({ key: t as TierKey, label: o.label }); continue; }
    if (!o.unitId || typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price < 0) continue;
    if (seenUnit.has(o.unitId)) continue;
    seenTier.add(t); seenUnit.add(o.unitId);
    available.push(o);
  }
  if (!available.length) return undefined;
  available.sort((a, b) => (TIER_ORDER[a.type] ?? 9) - (TIER_ORDER[b.type] ?? 9));
  const bundles: ValueTierBundle[] = available.map((o) => ({
    key: o.type as TierKey,
    label: o.label,
    unitId: o.unitId,
    price: o.price,
    promoRate: o.promoRate,
    promo: o.promotions?.find((p) => p?.name)?.name,
    promotionIds: (o.promotions ?? []).map((p) => p.id).filter((x): x is string => !!x),
    features: (o.amenities ?? []).map(amenityLabel).filter((x): x is string => !!x).slice(0, FEATURE_MAX),
  }));
  const size = requestedSize || sizeFromMix(available[0].spaceMixId) || '';
  const featureLabels: string[] = [];
  for (const b of bundles) for (const f of b.features) if (!featureLabels.includes(f)) featureLabels.push(f);
  return { size, bundles, soldOutTiers, featureLabels };
}

// --- Property card (name, address, phone, photo, hours) ----------------------

export interface PropertyCardInfo {
  name: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  gateHours?: string;
  timezone?: string;
}

interface ApiAccessHourRow { day?: string; open_time?: string; close_time?: string; is_always_open?: boolean }
interface ApiAccessHours { type?: string; hours?: ApiAccessHourRow[] }
// Raw property record. Only these display fields are read — bank/GL/occupancy/
// entity fields present in the raw payload are never touched.
interface RawProperty {
  id: string; name: string; status?: number;
  Address?: { address?: string; city?: string; state?: string; zip?: string } | '';
  Phones?: Array<{ phone?: string; number?: string; status?: number }> | '';
  Images?: Array<{ url?: string; image?: string }> | '';
  AccessHours?: ApiAccessHours[] | '';
  utc_offset?: string;
}

const tidyTime = (t?: string): string =>
  (t ?? '').replace(/:00(:00)?/g, '').replace(/\s*([AP]M)/i, (_m, p) => p.toLowerCase());

/** Compact "6am - 9pm" / "24 Hours" from the gate (else office) section. */
function gateHoursLabel(sections?: ApiAccessHours[]): string | undefined {
  const sec = sections?.find((s) => s.type === 'gate') ?? sections?.find((s) => s.type === 'office');
  const rows = sec?.hours ?? [];
  if (!rows.length) return undefined;
  if (rows.some((r) => r.is_always_open)) return '24 Hours';
  const open = rows.find((r) => r.open_time && r.open_time !== r.close_time);
  return open ? `${tidyTime(open.open_time)} - ${tidyTime(open.close_time)}` : undefined;
}

export async function fetchProperty(ctx: TierContext): Promise<PropertyCardInfo | undefined> {
  // Prefer the Duda "Properties" collection (published pages — no API call, no
  // key), falling back to the keyed REST call in the editor/harness or if the
  // collection isn't bound to this property. Same pattern/source as #03/#05/#07.
  const raw = await fetchPropertiesPreferCollection(
    APP,
    () => hbGet(`${appBase}/v1/companies/${ctx.companyId}/properties?access_hours=true&images=true`, { ttlMs: MEMO_TTL.stable }),
    { requirePropertyId: ctx.propertyId },
  );
  // The endpoint returns every property for the company; pick this one by id.
  // Inactive/hidden (status !== 1) → undefined (fail closed).
  const props = (unwrap(raw)?.properties as RawProperty[] | undefined) ?? [];
  const p = props.find((x) => x.id === ctx.propertyId);
  if (!p || (p.status != null && p.status !== 1)) return undefined;
  const A = p.Address && typeof p.Address === 'object' ? p.Address : undefined;
  const address = A?.address ? [A.address, A.city, [A.state, A.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') : undefined;
  const phone = Array.isArray(p.Phones) ? (p.Phones.find((x) => x.status !== 0)?.phone ?? p.Phones[0]?.phone ?? p.Phones[0]?.number) : undefined;
  const imageUrl = Array.isArray(p.Images) ? (p.Images[0]?.url ?? p.Images[0]?.image) : undefined;
  const gateHours = gateHoursLabel(Array.isArray(p.AccessHours) ? p.AccessHours : undefined);
  const timezone = typeof p.utc_offset === 'string' && p.utc_offset.trim() ? p.utc_offset.trim() : undefined;
  return { name: p.name, address, phone, imageUrl, gateHours, timezone };
}

// --- Move-in quote -----------------------------------------------------------

export interface QuoteLine { name: string; cost: number; startDate?: string; endDate?: string }
export interface MoveInQuote {
  unitId: string; unitNumber?: string; totalDue: number; totalTax: number; lines: QuoteLine[];
}

// configure (dryrun) invoice shapes — the pre-lease move-in cost source.
interface ApiInvoiceLine { total?: number; subtotal?: number; start_date?: string; end_date?: string; Service?: { name?: string } }
interface ApiConfigureInvoice { balance?: number; total_due?: number; total_tax?: number; total_discounts?: number; InvoiceLines?: ApiInvoiceLine[] }

/** The unit to quote plus the pricing inputs configure needs. */
export interface QuoteInput { unitId: string; unitNumber?: string; rent: number; promotionIds?: string[]; promoName?: string; timezone?: string }

function facilityToday(tz?: string): string {
  if (tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      /* empty */
    }
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pre-lease move-in cost for a tier's unit via `configure` (POST, dryrun) — the
 * endpoint Naveen specified for pre-lease pricing. We send the offer's rent +
 * promotion ids so the quote reflects the promotion (the old `lease-set-up` did
 * NOT apply promos). The NET total is `invoice.balance` (post-discount) — NOT
 * `total_due`, which is the gross. dryrun creates nothing.
 */
export async function fetchMoveInQuote(ctx: TierContext, unit: QuoteInput): Promise<MoveInQuote | undefined> {
  const today = facilityToday(unit.timezone);
  const body = {
    start_date: today, end_date: null, rent: unit.rent, security_deposit: null,
    edit_lease: false, send_invoice: false, tax_exempt: false, tax_exempt_description: null,
    dryrun: true,
    promotions: (unit.promotionIds ?? []).map((id) => ({ promotion_id: id })),
  };
  const raw = await hbPost(`${appBase}/v2/companies/${ctx.companyId}/units/${encodeURIComponent(unit.unitId)}/configure`, body);
  const inv = (unwrap(raw)?.invoice as ApiConfigureInvoice[] | undefined)?.[0];
  if (!inv || typeof inv.balance !== 'number' || !Number.isFinite(inv.balance) || inv.balance < 0) return undefined;
  const balance = inv.balance;
  const tax = Number.isFinite(inv.total_tax) ? (inv.total_tax as number) : 0;
  const raws = (inv.InvoiceLines ?? []).filter((l) => l.Service?.name && (typeof l.subtotal === 'number' || typeof l.total === 'number'));

  const gross: QuoteLine[] = raws.map((l) => ({
    name: l.Service!.name as string,
    cost: (typeof l.subtotal === 'number' ? l.subtotal : l.total) as number,
    startDate: l.start_date, endDate: l.end_date,
  }));
  const discount = typeof inv.total_discounts === 'number' && inv.total_discounts > 0
    ? inv.total_discounts
    : raws.reduce((sum, l) => sum + Math.max(0, (l.subtotal ?? l.total ?? 0) - (l.total ?? l.subtotal ?? 0)), 0);
  const cents = (n: number) => Math.round(n * 100);
  const grossSum = gross.reduce((s, l) => s + l.cost, 0);

  const net: QuoteLine[] = raws.map((l) => ({
    name: l.Service!.name as string,
    cost: (typeof l.total === 'number' ? l.total : l.subtotal) as number,
    startDate: l.start_date, endDate: l.end_date,
  }));
  const netSum = net.reduce((s, l) => s + l.cost, 0);

  let lines: QuoteLine[];
  if (discount > 0 && cents(grossSum - discount + tax) === cents(balance)) {
    const label = (unit.promotionIds?.length ?? 0) > 1 ? 'Promotions' : (unit.promoName ?? 'Promotion');
    lines = [...gross, { name: label, cost: -discount }];
  } else if (cents(netSum + tax) === cents(balance)) {
    lines = net;
  } else {
    lines = [];
  }
  return { unitId: unit.unitId, unitNumber: unit.unitNumber, totalDue: balance, totalTax: tax, lines };
}

export type TierQuoteResult =
  | { status: 'ok'; quote: MoveInQuote }
  | { status: 'contended' }
  | { status: 'error' };

/**
 * Quote the tier's own unit (the offer already resolved a real, available
 * unit — no price-based substitution). Distinguish availability from failure:
 * 404/409 (unit gone/held) or a response with no invoice (held/decline) →
 * 'contended'; network / 5xx / malformed → 'error'.
 */
export async function fetchTierQuote(ctx: TierContext, unit: QuoteInput): Promise<TierQuoteResult> {
  try {
    const quote = await fetchMoveInQuote(ctx, unit);
    return quote ? { status: 'ok', quote } : { status: 'contended' };
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 0;
    return status === 404 || status === 409 ? { status: 'contended' } : { status: 'error' };
  }
}
