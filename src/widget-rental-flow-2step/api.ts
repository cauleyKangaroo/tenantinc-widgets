import cfg from './config.json';
import { memoGet, memoInvalidate, MEMO_TTL } from '@shared/requestMemo';
import { normalizePhone } from '@shared/ui/phone';

const BASE_URL = cfg.baseUrl;
const APP_ID = cfg.appId;
const API_KEY = cfg.apiKey;

export interface RentalCtx {
  companyId: string;
  propertyId: string;
  spaceGroupId?: string;
  /** Proxy base for the Phase-2 writes (hold / lease-set-up). Empty → the
   *  legacy direct-edge test-tenant path (writesEnabled) is used instead. */
  proxyBaseUrl?: string;
  /** The owned group the quoted unit belongs to — the proxy needs it to scope
   *  ownership on every write, exactly like Reserve. */
  unitGroupId?: string;
}
export function defaultRentalCtx(): RentalCtx {
  return { companyId: cfg.companyId, propertyId: cfg.propertyId, spaceGroupId: cfg.spaceGroupId, proxyBaseUrl: cfg.proxyBaseUrl ?? '' };
}

/** True when the Phase-2 writes should route through the proxy (dynamic, any
 *  tenant) rather than the legacy direct-edge test-tenant path. */
function shouldUseProxyWrites(ctx: RentalCtx): boolean {
  return !!(ctx.proxyBaseUrl && ctx.unitGroupId);
}
const tenantPath = (ctx: RentalCtx, unitId: string, suffix: string) =>
  `${(ctx.proxyBaseUrl as string).replace(/\/$/, '')}/api/tenant/properties/${encodeURIComponent(ctx.propertyId)}/units/${encodeURIComponent(unitId)}/${suffix}`;

// ---------------------------------------------------------------------------
// READ-ONLY data layer for the rental flow. Everything here is a GET; the
// transactional calls (create reservation/lease, payment) are deliberately
// absent until the POST/PUT integration is agreed with the backend team.
//
// Verified against the test tenant (edge.tenant.dev, 2026-08-01):
//   GET companies/{co}/properties                              → property name/phones
//   GET .../properties/{id}/space-groups/{sg}/groups           → tiers + insurance[]
//   GET .../properties/{id}/documents                          → lease templates
// `spaceGroupProfile.<id>.insurance` is the protection-plan slot but is [] on
// both tenants we can see — the mapper below is shape-tolerant and the widget
// keeps its hard-coded plan as the fallback until a populated example exists.
// ---------------------------------------------------------------------------

function headers() {
  return {
    'x-storageapi-date': String(Math.floor(Date.now() / 1000)),
    'x-storageapi-key': API_KEY,
  };
}

async function getJson(path: string): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v2/${path}`;
  return memoGet(url, async () => {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  });
}

/** Unwrap the standard envelope: applicationData.<appId>[0].data */
function unwrap(raw: unknown): Record<string, unknown> | undefined {
  const env = raw as { applicationData?: Record<string, Array<{ data?: Record<string, unknown> }>> };
  return env?.applicationData?.[APP_ID]?.[0]?.data;
}

// --- Property (brand name for the SMS consent line, contact phone) ----------

export interface PropertyInfo {
  /** The property this describes — lets the rail look up its hero photo. */
  id: string;
  name: string;
  phone?: string;
  address?: string;
  /** Human lines like "Mon-Sat: 8:00 AM - 5:00 PM", grouped by identical times. */
  officeHours?: string[];
  gateHours?: string[];
}

interface ApiAccessHourRow { day?: string; open_time?: string; close_time?: string; is_always_open?: boolean }
interface ApiAccessHours { type?: string; hours?: ApiAccessHourRow[] }
interface ApiProperty {
  id: string;
  name: string;
  Phones?: Array<{ phone?: string; type?: string }>;
  AccessHours?: ApiAccessHours[];
  Address?: { address?: string; city?: string; state?: string; zip?: string };
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

/** "06:00:00 AM" → "6:00 AM". */
const tidyTime = (t?: string): string => (t ?? '').replace(/^0/, '').replace(/:00\s/, ' ').replace(/(:\d\d):\d\d/, '$1');

/** Collapse per-day rows into "Mon-Sat: 8:00 AM - 5:00 PM" lines. */
function hoursLines(sched?: ApiAccessHours): string[] | undefined {
  const rows = sched?.hours ?? [];
  if (!rows.length) return undefined;
  if (rows.some((r) => r.is_always_open)) return ['Open 24 hours'];
  const byDay = new Map<string, string>();
  for (const r of rows) {
    const d = (r.day ?? '').toLowerCase();
    if (!DAY_ORDER.includes(d)) continue;
    // 12:00 AM - 12:00 AM encodes "closed" in the data (seen on Corona's
    // office Sundays). Confirm semantics with Jaweed; display as Closed.
    byDay.set(d, r.open_time === r.close_time
      ? 'Closed'
      : `${tidyTime(r.open_time)} - ${tidyTime(r.close_time)}`);
  }
  if (!byDay.size) return undefined;
  const lines: string[] = [];
  let start: string | null = null;
  let prevTimes: string | null = null;
  let prevDay: string | null = null;
  const flush = () => {
    if (!start || !prevDay || !prevTimes) return;
    const label = start === prevDay
      ? DAY_SHORT[start]
      : `${DAY_SHORT[start]}-${DAY_SHORT[prevDay]}`;
    lines.push(`${label}: ${prevTimes}`);
  };
  for (const d of DAY_ORDER) {
    const times = byDay.get(d);
    if (times && times === prevTimes) {
      prevDay = d;
      continue;
    }
    flush();
    start = times ? d : null;
    prevDay = times ? d : null;
    prevTimes = times ?? null;
  }
  flush();
  return lines.length ? lines : undefined;
}

export async function fetchProperty(ctx: RentalCtx): Promise<PropertyInfo | undefined> {
  const data = unwrap(await getJson(`companies/${ctx.companyId}/properties?access_hours=true`));
  const props = (data?.properties as ApiProperty[] | undefined) ?? [];
  // Fail unavailable rather than showing a DIFFERENT property's facts: the
  // transaction targets ctx.propertyId, so never fall back to props[0].
  const prop = props.find((p) => p.id === ctx.propertyId);
  if (!prop) return undefined;
  const office = prop.AccessHours?.find((a) => a.type === 'office');
  const gate = prop.AccessHours?.find((a) => a.type === 'gate');
  const a = prop.Address;
  return {
    id: prop.id,
    name: prop.name,
    phone: prop.Phones?.[0]?.phone,
    address: a?.address
      ? [a.address, a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : undefined,
    officeHours: hoursLines(office),
    gateHours: hoursLines(gate),
  };
}

// --- Protection plans (space-types → property insurances) --------------------
//
// Coverage products are configured PER SPACE TYPE and are served by the
// property's own `insurances` endpoint (Hummingbird rental-flow guide, APIs 1
// and 6). They used to be read from `spaceGroupProfile.<type>.insurance` in the
// space-groups payload, which is `[]` on every tenant — re-verified on Storage
// Outlet Bellflower 2026-08-20, where the groups payload had three empty
// insurance arrays while /insurances returned two live plans. That empty read is
// why step 2 always fell through to "confirmed at checkout".

export interface ProtectionPlan {
  id: string;
  /** Dollar coverage amount, e.g. 2000. */
  coverage?: number;
  /** Monthly premium, e.g. 12. */
  premium?: number;
  name?: string;
  /** The space type this plan covers. Plans are per type, so a commercial or
   *  parking rental must never be offered a storage plan — see plansForUnitType().
   *  Matched by ID: the NAMES disagree across endpoints (a unit row says
   *  'commercial_storage' where the space type and the plan both say
   *  'Commercial'), while unit_type_id is identical on all three. */
  unitTypeId?: string;
  /** Machine name of that type, for logs and debugging — never a match key. */
  unitType?: string;
}

export interface SpaceType {
  id: string;
  /** Machine name, e.g. 'storage' — matches a unit row's `type`. */
  name: string;
  displayName?: string;
  /** Coverage is enabled for this type; only these are worth asking about. */
  hasCoverage: boolean;
}

interface ApiSpaceType {
  unit_type_id?: string;
  id?: string;
  unit_type_name?: string;
  display_name?: string;
  have_coverage?: number;
}

// The live shape (verified 2026-08-20): coverage arrives as a STRING
// ("2000.00"), premium as a number under `premium_value`, and `premium_type`
// says what that number means — "$" is a flat monthly premium, anything else
// (e.g. a percentage of rent) cannot be printed as "$N/mo" and is dropped
// rather than mislabelled.
interface ApiInsurance {
  id?: string;
  name?: string;
  description?: string;
  coverage?: number | string;
  premium_value?: number | string;
  premium_type?: string;
  unit_type?: string;
  unit_type_id?: string;
  status?: number;
}

const num = (v: number | string | undefined): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** The company's space types. Cached by the GET memo — every widget on the page
 *  shares one request. Fails soft: no types ⇒ no plans, never an exception. */
export async function fetchSpaceTypes(ctx: RentalCtx): Promise<SpaceType[]> {
  const raw = await getJson(`companies/${ctx.companyId}/space-management/space-types`);
  // This endpoint's `data` is an ARRAY, unlike the object every other read returns.
  const rows = (unwrap(raw) as unknown as ApiSpaceType[] | undefined) ?? [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((t) => ({
      id: (t.unit_type_id ?? t.id ?? '') as string,
      name: t.unit_type_name ?? '',
      displayName: t.display_name,
      hasCoverage: t.have_coverage === 1,
    }))
    .filter((t) => !!t.id);
}

/**
 * The property's protection plans, for the given space types (default: every
 * coverage-enabled type on the company).
 *
 * A plan is only offered when it is active AND carries a usable coverage +
 * flat-dollar premium — the dropdown prints both, so a half-configured row
 * would render "$undefined Coverage". Cheapest coverage first.
 */
export async function fetchProtectionPlans(ctx: RentalCtx, unitTypeIds?: string[]): Promise<ProtectionPlan[]> {
  let ids = unitTypeIds?.filter(Boolean);
  if (!ids?.length) ids = (await fetchSpaceTypes(ctx)).filter((t) => t.hasCoverage).map((t) => t.id);
  if (!ids.length) return [];
  const q = encodeURIComponent(`[${ids.join(',')}]`);
  const data = unwrap(await getJson(
    `companies/${ctx.companyId}/properties/${ctx.propertyId}/insurances?unit_type_ids=${q}`,
  ));
  const rows = (data?.insurances as ApiInsurance[] | undefined) ?? [];
  const plans: ProtectionPlan[] = [];
  for (const ins of rows) {
    if (!ins.id || ins.status === 0) continue;
    if (ins.premium_type && ins.premium_type !== '$') continue;
    const coverage = num(ins.coverage);
    const premium = num(ins.premium_value);
    if (coverage === undefined || premium === undefined) continue;
    plans.push({
      id: ins.id,
      name: ins.name,
      coverage,
      premium,
      unitTypeId: ins.unit_type_id,
      unitType: ins.unit_type,
    });
  }
  return plans.sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0));
}

/**
 * Narrow plans to the space type actually being rented. Verified live on
 * Bellflower 2026-08-20: asking for every coverage-enabled type returns six
 * plans — two storage and four Commercial — so without this a storage renter is
 * offered four plans that do not apply to them.
 *
 * Falls back to the full list when the type is unknown or nothing matches:
 * showing a plan that may be for the wrong type is recoverable, showing NO
 * plans re-creates the very bug this replaced.
 */
export function plansForUnitType(plans: ProtectionPlan[], unitTypeId?: string): ProtectionPlan[] {
  if (!unitTypeId) return plans;
  const matched = plans.filter((p) => p.unitTypeId === unitTypeId);
  return matched.length ? matched : plans;
}

async function resolveSpaceGroupId(ctx: RentalCtx): Promise<string | undefined> {
  if (ctx.spaceGroupId) return ctx.spaceGroupId;
  const rm = unwrap(await getJson(`companies/${ctx.companyId}/properties/${ctx.propertyId}/rate-management`));
  let found: string | undefined;
  const walk = (x: unknown): void => {
    if (found || !x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    const sgp = o.space_group_profile as { id?: string } | undefined;
    if (sgp?.id) { found = sgp.id; return; }
    for (const v of Object.values(o)) walk(v);
  };
  walk(rm);
  return found;
}

export async function fetchSpaceGroups(ctx: RentalCtx): Promise<unknown> {
  const sg = await resolveSpaceGroupId(ctx);
  if (!sg) return undefined;
  return getJson(
    `companies/${ctx.companyId}/properties/${ctx.propertyId}/space-groups/${sg}/groups`,
  );
}

// --- Rental agreement document (property documents) --------------------------

export interface LeaseDocument {
  id: string;
  name: string;
  type: string;
  signed: boolean;
}

interface ApiDocument {
  id: string;
  name: string;
  type: string;
  signed?: number;
}

/** The signable lease template ('super-lease' on the test tenant). */
export async function fetchLeaseDocument(ctx: RentalCtx): Promise<LeaseDocument | undefined> {
  const data = unwrap(await getJson(`companies/${ctx.companyId}/properties/${ctx.propertyId}/documents`));
  const docs = (data?.documents as ApiDocument[] | undefined) ?? [];
  const lease = docs.find((d) => d.type === 'super-lease') ?? docs.find((d) => d.signed === 1);
  if (!lease) return undefined;
  return { id: lease.id, name: lease.name, type: lease.type, signed: lease.signed === 1 };
}

// --- Selection context (tiers → rent handoff receiver) -----------------------

export interface SelectionContext {
  size: string;
  price?: number;
  online?: number;
  inStore?: number;
  promo?: string;
  /** Amenity bundle labels, from the group name. */
  features?: string[];
  /** Promotion ids behind `promo` — lease-set-up needs the IDS, not the name,
   *  to actually discount the quote. Only the offers source can supply them. */
  promotionIds?: string[];
  /** `dossier.token` from the offer: Hummingbird validates the quoted price
   *  against it. Only the offers source can supply it. */
  offerToken?: string;
  /** `space_mix_id` from the offer — required verbatim by documents/finalize. */
  spaceMixId?: string;
}

/** "10' x 10'" / "10x10" → "10x10" for comparisons. */
const normalizeSize = (s: string): string => s.toLowerCase().replace(/[^0-9x.]/g, '');

interface CtxTier {
  id?: string;
  tier_id?: string;
  description?: string;
  sell_rate?: number | null;
  set_rate?: number | null;
  promotion_sell_rate?: number | null;
  units?: { min_price?: number | null };
  vacant?: { count?: number; min_price?: number | null };
  promo?: Array<{ name?: string }>;
}

/**
 * Resolve the handed-off selection against live space-groups data: by tier id
 * when given, else the cheapest tier of the requested size. Display context
 * ONLY — the transaction re-resolves everything server-side later.
 */
export function extractSelectionContext(
  raw: unknown,
  tierId?: string,
  size?: string,
): SelectionContext | undefined {
  const env = raw as { applicationData?: Record<string, Array<{ data?: { spaceGroupProfile?: Record<string, unknown> } }>> };
  const profiles = env?.applicationData?.[APP_ID]?.[0]?.data?.spaceGroupProfile;
  if (!profiles) return undefined;
  const wanted = size ? normalizeSize(size) : undefined;

  let best: SelectionContext | undefined;
  for (const profile of Object.values(profiles)) {
    const groups = (profile as { groups?: Array<{ name?: string; tiers?: CtxTier[] }> })?.groups;
    if (!Array.isArray(groups)) continue;
    for (const g of groups) {
      const features = (g.name ?? '')
        .split('>')
        .map((s) => s.trim())
        .filter((s) => s && !/^(all units|no .*)$/i.test(s));
      for (const t of g.tiers ?? []) {
        const desc = t.description?.trim();
        if (!desc) continue;
        const price = (t.vacant?.count ? t.vacant?.min_price : undefined)
          ?? t.units?.min_price ?? t.sell_rate ?? undefined;
        const ctx: SelectionContext = {
          size: desc,
          price: price ?? undefined,
          online: typeof t.promotion_sell_rate === 'number' && t.promotion_sell_rate > 0
            ? Math.min(t.promotion_sell_rate, price ?? t.promotion_sell_rate) : price ?? undefined,
          inStore: typeof t.set_rate === 'number' && t.set_rate > 0
            ? Math.max(t.set_rate, price ?? t.set_rate) : price ?? undefined,
          promo: t.promo?.find((p) => p?.name)?.name,
          features,
        };
        if (tierId && (t.id === tierId || t.tier_id === tierId)) return ctx;
        if (!tierId && wanted && normalizeSize(desc) === wanted) {
          if (!best || (price != null && (best.price == null || price < best.price))) best = ctx;
        }
      }
    }
  }
  return best;
}

// --- Rich selection from the offers endpoint --------------------------------
//
// The order rail wants the SAME display data the value-tiers card shows:
// real amenities, online (discounted) vs in-store (standard) rate, and the
// promo name. The space-groups payload only carries the group name, so pull
// the tier from /offers?unitGroupId= and pick the handed-off unit/tier.

interface OfferAmenity { name?: string; value?: string; sort_order?: number }
interface OfferDiscount { value?: number; type?: string }
interface SelOffer {
  unit_id?: string; price?: number;
  value_tier?: { type?: string };
  promotions?: Array<{ id?: string; name?: string }>;
  costs?: { Discounts?: OfferDiscount[] };
  amenities?: OfferAmenity[];
  dossier?: { token?: string };
  space_mix_id?: string;
}

function offerAmenityLabel(a: OfferAmenity): string | undefined {
  const v = (a.value ?? '').trim();
  if (/^no$/i.test(v)) return undefined;
  if (/^yes$/i.test(v)) return a.name;
  return v || a.name;
}

function offerOnlineRate(price: number, discounts?: OfferDiscount[]): number | undefined {
  const d = (discounts ?? []).find((x) => typeof x.value === 'number' && x.value > 0);
  if (!d || typeof d.value !== 'number') return undefined;
  const rate = d.type === 'percent' ? price * (1 - d.value / 100) : price - d.value;
  return rate > 0 && rate < price ? rate : undefined;
}

export async function fetchSelectionFromOffers(
  ctx: RentalCtx,
  unitGroupId: string,
  sel: { tier?: string; unitId?: string; size?: string },
): Promise<SelectionContext | undefined> {
  const raw = await getJson(
    `companies/${ctx.companyId}/properties/${ctx.propertyId}/offers?amenities=[]&promotions=[]&unitGroupId=${encodeURIComponent(unitGroupId)}`,
  );
  const offers = (unwrap(raw)?.offers as SelOffer[] | undefined) ?? [];
  const avail = offers.filter((o) => o.unit_id != null && typeof o.price === 'number' && (o.price as number) >= 0);
  if (!avail.length) return undefined;
  const pick =
    (sel.unitId ? avail.find((o) => o.unit_id === sel.unitId) : undefined)
    ?? (sel.tier ? avail.find((o) => o.value_tier?.type === sel.tier) : undefined)
    ?? avail[0];
  const price = pick.price as number;
  const online = offerOnlineRate(price, pick.costs?.Discounts) ?? price;
  const features = (pick.amenities ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    .map(offerAmenityLabel)
    .filter((x): x is string => !!x)
    .slice(0, 6);
  return {
    size: sel.size ?? '',
    price,
    online,
    inStore: price,
    promo: pick.promotions?.find((p) => p?.name)?.name,
    features,
    promotionIds: (pick.promotions ?? []).map((p) => p?.id).filter((x): x is string => !!x),
    offerToken: pick.dossier?.token,
    spaceMixId: pick.space_mix_id,
  };
}

// --- Move-in quote (GET /units/{unit_id}/lease-set-up) -----------------------
//
// "Get payment required for a lease without creating a lease" — the REAL
// money breakdown (prorated rent, fees, tax, total due) from a read-only
// call. Discovered 2026-08-03; replaces the hold→lease→dryrun-invoice chain
// for quoting. Quote assumes move-in today (no start_date param).

export interface QuoteLine {
  name: string;
  cost: number;
  startDate?: string;
  endDate?: string;
}

export interface MoveInQuote {
  unitId: string;
  unitNumber?: string;
  totalDue: number;
  totalTax: number;
  lines: QuoteLine[];
  /** `details.bill_day` — required verbatim by the documents/finalize call. */
  billDay?: number;
  /** `details.rent` — the NON-prorated monthly rate, which is what
   *  documents/finalize means by `web_rate`. Not the move-in total. */
  rent?: number;
}

interface ApiUnitRow {
  id: string;
  number?: string;
  type?: string;
  unit_type_id?: string;
  state?: string;
  price?: number;
  space_mix_id?: string;
}

/** space_mix_id is base64 of "unitTypeId,sqft?,w,l,h" — decode for size match. */
function unitDims(u: ApiUnitRow): string | undefined {
  try {
    const parts = atob(u.space_mix_id ?? '').split(',');
    if (parts.length >= 4) return `${Number(parts[2])}x${Number(parts[3])}`;
  } catch { /* not base64 */ }
  return undefined;
}

async function getJsonV1(path: string, fresh = false): Promise<unknown> {
  const url = `${BASE_URL}/applications/${APP_ID}/v1/${path}`;
  // v1 reads here are availability + per-unit quotes — volatile, dedupe only.
  return memoGet(url, async () => {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`GET v1/${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }, { fresh, ttlMs: MEMO_TTL.volatile });
}

/** First Available storage unit matching the selection's size (and price when known). */
export async function findUnitForSelection(ctx: RentalCtx, size?: string, price?: number, fresh = false): Promise<{ id: string; number?: string; unitTypeId?: string } | undefined> {
  const data = unwrap(await getJsonV1(`companies/${ctx.companyId}/properties/${ctx.propertyId}/units/available`, fresh));
  const units = (data?.units as ApiUnitRow[] | undefined) ?? [];
  const wantSize = size ? size.toLowerCase().replace(/[^0-9x.]/g, '') : undefined;
  const candidates = units.filter((u) =>
    u.state === 'Available'
    && (u.type ?? 'storage') === 'storage'
    && (!wantSize || unitDims(u) === wantSize),
  );
  if (!candidates.length) return undefined;
  // Exact price match ties the unit to the clicked tier; else cheapest of the size.
  const exact = price != null ? candidates.find((u) => u.price === price) : undefined;
  const pick = exact ?? candidates.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9))[0];
  return { id: pick.id, number: pick.number, unitTypeId: pick.unit_type_id };
}

/** Resolve a unit's display number and space type by id (from units/available).
 *  The value-tiers handoff passes only a unitId, and the reserve response carries
 *  no unit_number, so this is how "Space #…" gets populated on the confirmation;
 *  the type id is what narrows the protection plans to the space type rented.
 *  Fails soft — an unresolvable unit must never stop the rental. */
export async function fetchUnitInfo(ctx: RentalCtx, unitId: string): Promise<{ number?: string; unitTypeId?: string }> {
  try {
    const data = unwrap(await getJsonV1(`companies/${ctx.companyId}/properties/${ctx.propertyId}/units/available`));
    const units = (data?.units as ApiUnitRow[] | undefined) ?? [];
    const u = units.find((x) => x.id === unitId);
    return { number: u?.number, unitTypeId: u?.unit_type_id };
  } catch { return {}; }
}

interface ApiQuoteDetail { name?: string; total_cost?: number; start_date?: string; end_date?: string }
interface ApiQuoteInvoice { total_due?: number; balance?: number; total_tax?: number; Detail?: ApiQuoteDetail[] }

/**
 * What the shopper has chosen, as lease-set-up's documented inputs.
 *
 * Every field beyond `holdToken` changes the MONEY: coverage adds its own
 * invoice line, promotions discount the rent, and start_date moves the proration
 * window. Omitting them (which is what this widget did until 2026-08-20) quotes
 * bare rent and silently prices a move-in that nobody asked for.
 */
export interface QuoteOptions {
  /** Hold token — required for the POST form; without it only the GET works. */
  holdToken?: string;
  /** Chosen coverage product (API 6). Adds a "Protection Plan …" line. */
  insuranceId?: string;
  /** Promotions to apply, from the offer. */
  promotionIds?: string[];
  /** Move-in date, YYYY-MM-DD. This is the documented parameter name —
   *  `move_in_date`, which this widget used to send, is not one and was
   *  ignored, which is why the date picker never moved the numbers. */
  startDate?: string;
  /** `dossier.token` from the offer — Hummingbird validates the quoted price
   *  against it. Optional per the guide; sent whenever the offer supplied one. */
  offerToken?: string;
}

/** The documented lease-set-up payload, omitting anything not chosen. */
function leaseSetUpBody(opts: QuoteOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { hold_token: opts.holdToken };
  if (opts.insuranceId) body.insurance_id = opts.insuranceId;
  if (opts.promotionIds?.length) body.promotions = opts.promotionIds.map((id) => ({ promotion_id: id }));
  if (opts.startDate) body.start_date = opts.startDate;
  if (opts.offerToken) body.token = opts.offerToken;
  return body;
}

/**
 * POST lease-set-up for a held unit.
 *
 * The extra parameters ARE honoured by v1 — verified against a held unit
 * 2026-08-20: `insurance_id` added a prorated "Coverage $2000" line, a
 * `start_date` of 2026-08-25 came back on `details.start_date` (the minimal
 * call returned today), and `promotions` produced a Discounts entry and moved
 * the balance. The fallback below is therefore belt-and-braces rather than an
 * expected path; if the warning ever appears, the endpoint changed.
 */
async function postLeaseSetUp(path: string, opts: QuoteOptions): Promise<Record<string, unknown> | undefined> {
  const body = leaseSetUpBody(opts);
  try {
    const inner = await sendV1('POST', path, body);
    if (inner.status !== 200) throw new Error(`lease-set-up POST failed: ${inner.status} ${inner.msg ?? ''}`);
    return inner.data;
  } catch (err) {
    if (Object.keys(body).length === 1) throw err; // nothing extra to blame
    console.warn('[rental] lease-set-up rejected the documented extras — re-quoting with hold_token only. Coverage/promo/date will NOT be priced:', err);
    const inner = await sendV1('POST', path, { hold_token: opts.holdToken });
    if (inner.status !== 200) throw new Error(`lease-set-up POST failed: ${inner.status} ${inner.msg ?? ''}`);
    return inner.data;
  }
}

/**
 * Move-in money from lease-set-up. Two modes (verified 2026-08-03):
 * - No hold: plain GET — but the GET 409s once ANYONE holds the unit, and it
 *   carries no chosen coverage/promo/date, so it is a rent-only estimate.
 * - Holding: POST with the shopper's choices — the only quote path for a held
 *   unit, and the one the rail must use after holding.
 */
export async function fetchMoveInQuote(ctx: RentalCtx, unit: { id: string; number?: string }, opts: QuoteOptions = {}): Promise<MoveInQuote | undefined> {
  const holdToken = opts.holdToken;
  // Hold-aware quote through the proxy when configured — the only quote path
  // for a held unit, and it keeps the key server-side.
  if (holdToken && shouldUseProxyWrites(ctx)) return fetchHeldQuoteViaProxy(ctx, unit, holdToken);
  const path = `companies/${ctx.companyId}/units/${unit.id}/lease-set-up`;
  let data: Record<string, unknown> | undefined;
  if (holdToken && writesEnabled(ctx)) {
    data = await postLeaseSetUp(path, opts);
  } else {
    data = unwrap(await getJsonV1(path));
  }
  const details = data?.details as { Invoices?: ApiQuoteInvoice[]; bill_day?: number; rent?: number } | undefined;
  const inv = (details?.Invoices ?? [])[0];
  if (!inv || typeof inv.total_due !== 'number') return undefined;
  // `balance` is the NET payable; `total_due` is the gross before discounts.
  // Verified on a held unit 2026-08-20: with a 50%-off promotion the same quote
  // returned total_due 75.52 against balance 71.02, and the per-line total_cost
  // values summed to the balance — so reading total_due showed a total $4.50
  // higher than both the lines above it and the amount actually charged.
  const payable = typeof inv.balance === 'number' ? inv.balance : inv.total_due;
  return {
    unitId: unit.id,
    unitNumber: unit.number,
    totalDue: payable,
    totalTax: inv.total_tax ?? 0,
    billDay: typeof details?.bill_day === 'number' ? details.bill_day : undefined,
    rent: typeof details?.rent === 'number' ? details.rent : undefined,
    lines: (inv.Detail ?? [])
      .filter((d) => d.name && typeof d.total_cost === 'number')
      .map((d) => ({
        name: d.name as string,
        cost: d.total_cost as number,
        startDate: d.start_date,
        endDate: d.end_date,
      })),
  };
}

// --- Unit hold (the 14:58 countdown) -----------------------------------------
//
// FIRST WRITE in this widget. Approved by Macauley 2026-08-03: hold /
// lease-set-up / dryrun invoice against the TEST TENANT ONLY — the guard
// below refuses to POST against any other tenant, so a config pointed at
// prod fails closed (writes silently disabled, GET-only behavior remains).
//
// Verified on the gateway 2026-08-03:
//   POST   v1/companies/{co}/units/{unit}/hold  {}      → { hold_token }
//   DELETE v1/companies/{co}/units/{unit}/hold/{token}  → 200 (release)
//   POST on an already-held unit → inner status 409
//     "This unit is currently being held by another customer"
//   While held, the unit DISAPPEARS from units/available — conflict
//   recovery is: refetch available, pick another unit, hold that.
// The response carries no expiry; the live platform shows ~15 minutes.

// DIRECT-EDGE writes are the "before the proxy is live" path: the widget calls
// Hummingbird directly with the config key. This means a write-capable key is
// in the bundle — an accepted TEMPORARY tradeoff until the proxy is deployed,
// at which point set config `enableDirectWrites: false` (or a proxyBaseUrl) so
// every write goes through the proxy and the key leaves the bundle. When a
// proxy IS configured it always wins (see shouldUseProxyWrites); direct is the
// fallback only.
export function writesEnabled(ctx: RentalCtx): boolean {
  if (shouldUseProxyWrites(ctx)) return false; // proxy path takes precedence
  return !!API_KEY && !!BASE_URL && (cfg as { enableDirectWrites?: boolean }).enableDirectWrites !== false;
}

/** Assumed TTL — the hold response has no expiry field; 15 min per the live platform. */
export const HOLD_TTL_SECONDS = 15 * 60;

export interface UnitHold {
  unitId: string;
  unitNumber?: string;
  holdToken: string;
  /** ms epoch when the hold was acquired (client clock). */
  heldAt: number;
}

interface InnerResult { status?: number; data?: Record<string, unknown>; msg?: string }

async function sendV1(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<InnerResult> {
  const res = await fetch(`${BASE_URL}/applications/${APP_ID}/v1/${path}`, {
    method,
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} v1/${path} failed: ${res.status} ${res.statusText}`);
  const env = await res.json() as { applicationData?: Record<string, InnerResult[]> };
  return env?.applicationData?.[APP_ID]?.[0] ?? {};
}

export type HoldResult =
  | { ok: true; hold: UnitHold }
  | { ok: false; reason: 'conflict' | 'writes-disabled' | 'error'; detail?: string };

export async function holdUnit(ctx: RentalCtx, unit: { id: string; number?: string }): Promise<HoldResult> {
  if (shouldUseProxyWrites(ctx)) return holdUnitViaProxy(ctx, unit);
  if (!writesEnabled(ctx)) {
    console.warn('[rental-flow] holdUnit skipped — writes are enabled for the test tenant only');
    return { ok: false, reason: 'writes-disabled' };
  }
  try {
    const inner = await sendV1('POST', `companies/${ctx.companyId}/units/${unit.id}/hold`, {});
    memoInvalidate('units/available'); // this write just changed availability page-wide
    memoInvalidate('/space-groups/');  // cached vacancy in groups payloads may lag too
    const token = inner.data?.hold_token as string | undefined;
    if (inner.status === 409) return { ok: false, reason: 'conflict', detail: inner.msg };
    if (inner.status !== 200 || !token) {
      return { ok: false, reason: 'error', detail: inner.msg ?? `status ${inner.status}` };
    }
    return { ok: true, hold: { unitId: unit.id, unitNumber: unit.number, holdToken: token, heldAt: Date.now() } };
  } catch (err) {
    return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : String(err) };
  }
}

/** Fail-soft release — the server expires holds on its own if this never lands. */
export async function releaseHold(ctx: RentalCtx, hold: UnitHold): Promise<void> {
  if (shouldUseProxyWrites(ctx)) { await releaseHoldViaProxy(ctx, hold); return; }
  if (!writesEnabled(ctx)) return;
  try {
    await sendV1('DELETE', `companies/${ctx.companyId}/units/${hold.unitId}/hold/${hold.holdToken}`);
    memoInvalidate('units/available');
    memoInvalidate('/space-groups/');
  } catch (err) {
    console.warn('[rental-flow] releaseHold failed (hold will expire server-side):', err);
  }
}

// --- Rent (Phase 2) writes via the proxy (key stays server-side) -------------
//
// Same boundary as Reserve: hold / lease-set-up go through the proxy so the
// edge key is never in the bundle and every write is ownership-scoped to the
// handed-off group. Selected when ctx.proxyBaseUrl + ctx.unitGroupId are set;
// otherwise the legacy direct-edge test-tenant path above runs unchanged.

async function holdUnitViaProxy(ctx: RentalCtx, unit: { id: string; number?: string }): Promise<HoldResult> {
  try {
    const res = await fetch(tenantPath(ctx, unit.id, 'hold'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitGroupId: ctx.unitGroupId }),
    });
    const json = await res.json().catch(() => undefined) as { data?: { holdToken?: string; unitNumber?: string }; error?: { code?: string; message?: string } } | undefined;
    if (res.status === 409 || json?.error?.code === 'unit_held') {
      return { ok: false, reason: 'conflict', detail: json?.error?.message };
    }
    const token = json?.data?.holdToken;
    if (!res.ok || !token) return { ok: false, reason: 'error', detail: json?.error?.message ?? `status ${res.status}` };
    memoInvalidate('units/available'); // this write just changed availability page-wide
    memoInvalidate('/space-groups/');
    return { ok: true, hold: { unitId: unit.id, unitNumber: json?.data?.unitNumber ?? unit.number, holdToken: token, heldAt: Date.now() } };
  } catch (err) {
    return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : String(err) };
  }
}

async function releaseHoldViaProxy(ctx: RentalCtx, hold: UnitHold): Promise<void> {
  try {
    const url = `${tenantPath(ctx, hold.unitId, `hold/${encodeURIComponent(hold.holdToken)}`)}?unitGroupId=${encodeURIComponent(ctx.unitGroupId as string)}`;
    await fetch(url, { method: 'DELETE' });
    memoInvalidate('units/available');
    memoInvalidate('/space-groups/');
  } catch (err) {
    console.warn('[rental-flow] releaseHold (proxy) failed (hold will expire server-side):', err);
  }
}

async function fetchHeldQuoteViaProxy(ctx: RentalCtx, unit: { id: string; number?: string }, holdToken: string): Promise<MoveInQuote | undefined> {
  const res = await fetch(tenantPath(ctx, unit.id, 'lease-set-up'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitGroupId: ctx.unitGroupId, holdToken }),
  });
  const json = await res.json().catch(() => undefined) as { data?: { totalDue: number; totalTax: number; lines: QuoteLine[] } } | undefined;
  if (!res.ok || !json?.data || typeof json.data.totalDue !== 'number') return undefined;
  return { unitId: unit.id, unitNumber: unit.number, totalDue: json.data.totalDue, totalTax: json.data.totalTax, lines: json.data.lines ?? [] };
}

// --- Reserve (Phase 1) — DOCUMENTED hold-based flow, DUAL PATH -----------------
//
// Guide (2026-08-10): reserve requires a HELD unit + the lease-setup cost:
//   POST v1/companies/{co}/units/{unit}/reserve
//   { hold_token, contacts:[{first,last,email,Phones:[{phone,type,sms}]}],
//     platform, start_date, move_in_cost }   // move_in_cost = lease-setup object
//
// Two ways, chosen automatically:
//   • PROXY (proxyBaseUrl + unitGroupId): the proxy re-fetches move_in_cost and
//     builds the reserve body — the widget just sends the contact + hold token.
//   • DIRECT edge (no proxy, key in config): the widget fetches the lease-setup
//     cost itself and posts the full reserve body. Temporary, until the proxy.

export interface ReserveContact { first: string; last: string; email: string; phone: string }
export interface ReserveArgs {
  unit: { id: string; number?: string };
  holdToken: string;
  contact: ReserveContact;
  startDate: string; // YYYY-MM-DD
  platform?: string;
}
export type ReserveResult =
  | { ok: true; reservationId?: string; unitNumber?: string; quote?: MoveInQuote }
  | { ok: false; error: string };

/** Lease-setup for a held unit at RESERVE time (direct edge). Returns BOTH the
 *  raw move_in_cost object echoed into the reserve body AND the parsed display
 *  quote — the authoritative amount the reservation is actually submitted with,
 *  so the confirmation can show exactly that (not a possibly-stale prior quote). */
async function fetchReserveCost(
  ctx: RentalCtx, unit: { id: string; number?: string }, holdToken: string,
): Promise<{ moveInCost: unknown; quote?: MoveInQuote }> {
  const inner = await sendV1('POST', `companies/${ctx.companyId}/units/${unit.id}/lease-set-up`, { hold_token: holdToken });
  if (inner.status !== 200 || !inner.data) throw new Error(`lease-set-up failed: ${inner.status} ${inner.msg ?? ''}`);
  const d = inner.data as Record<string, unknown>;
  const moveInCost = d.move_in_cost ?? d.details ?? d;
  const inv = ((d.details as { Invoices?: ApiQuoteInvoice[] } | undefined)?.Invoices ?? [])[0];
  const quote: MoveInQuote | undefined = inv && typeof inv.total_due === 'number' ? {
    unitId: unit.id,
    unitNumber: unit.number,
    totalDue: inv.total_due,
    totalTax: inv.total_tax ?? 0,
    lines: (inv.Detail ?? [])
      .filter((x) => x.name && typeof x.total_cost === 'number')
      .map((x) => ({ name: x.name as string, cost: x.total_cost as number, startDate: x.start_date, endDate: x.end_date })),
  } : undefined;
  return { moveInCost, quote };
}

/** Reserve a held unit. Returns a soft result, never throws. */
export async function reserveSpace(ctx: RentalCtx, args: ReserveArgs): Promise<ReserveResult> {
  // Canonicalise the pretty display phone to E.164 ONCE. This is the value we
  // carry INTERNALLY (and in the proxy DTO); it is NOT necessarily the exact
  // string each backend wants on the wire. The proxy re-formats E.164 for
  // Hummingbird at its own adapter (it strips to digits); the direct-edge path
  // below IS the Hummingbird boundary, so it applies the same digit-strip there.
  // The UI keeps the formatted string; only what leaves for a backend changes.
  const phoneE164 = normalizePhone(args.contact.phone, 'US');
  if (!phoneE164) return { ok: false, error: 'Please enter a valid phone number.' };
  const a: ReserveArgs = { ...args, contact: { ...args.contact, phone: phoneE164 } };
  if (shouldUseProxyWrites(ctx)) return reserveViaProxy(ctx, a);
  if (writesEnabled(ctx)) return reserveViaEdge(ctx, a);
  return { ok: false, error: 'Reservations are not configured for this site.' };
}

async function reserveViaProxy(ctx: RentalCtx, args: ReserveArgs): Promise<ReserveResult> {
  try {
    const res = await fetch(tenantPath(ctx, args.unit.id, 'reserve'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitGroupId: ctx.unitGroupId,
        holdToken: args.holdToken,
        startDate: args.startDate,
        platform: args.platform,
        firstName: args.contact.first,
        lastName: args.contact.last,
        email: args.contact.email,
        phone: args.contact.phone,
      }),
    });
    const json = await res.json().catch(() => undefined) as { data?: { reservationId?: string; unitNumber?: string }; error?: { message?: string }; message?: string } | undefined;
    if (!res.ok) return { ok: false, error: json?.error?.message ?? json?.message ?? `Reservation failed (${res.status}).` };
    return { ok: true, reservationId: json?.data?.reservationId, unitNumber: json?.data?.unitNumber ?? args.unit.number };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function reserveViaEdge(ctx: RentalCtx, args: ReserveArgs): Promise<ReserveResult> {
  try {
    const { moveInCost, quote } = await fetchReserveCost(ctx, args.unit, args.holdToken);
    const inner = await sendV1('POST', `companies/${ctx.companyId}/units/${args.unit.id}/reserve`, {
      hold_token: args.holdToken,
      contacts: [{
        first: args.contact.first,
        last: args.contact.last,
        email: args.contact.email,
        // Hummingbird boundary: send digits only, matching the proxy's HB
        // adapter output (E.164 "+14155552671" → "14155552671"). Keeps direct
        // and proxy identical on the wire until HB confirms it accepts "+"/E.164.
        Phones: [{ phone: args.contact.phone.replace(/\D/g, ''), type: 'Cell', sms: true }],
      }],
      platform: args.platform ?? 'website',
      start_date: args.startDate,
      move_in_cost: moveInCost,
    });
    if (inner.status !== 200) return { ok: false, error: inner.msg || `Reservation failed (${inner.status}).` };
    memoInvalidate('units/available');
    // Verified shape (2026-08-13): the ids are nested under `data.reservation`:
    //   { reservation: { reservation_id, lease_id, tenants } }
    // The response carries NO unit_number, so that falls back to the held unit.
    const d = (inner.data ?? {}) as Record<string, unknown>;
    const r = (d.reservation ?? d) as Record<string, unknown>;
    // Return the authoritative quote we just submitted so the confirmation shows
    // exactly the reserved amount, not the earlier step-2 quote.
    return {
      ok: true,
      reservationId: (r.reservation_id ?? r.id ?? d.reservation_id ?? d.id) as string | undefined,
      unitNumber: ((r.unit_number ?? d.unit_number) as string | undefined) ?? args.unit.number,
      quote,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Rent (Phase 2) — lease → invoice → insurance → hosted payment (proxy) ---
//
// All writes/reads for the rent transaction go through the proxy (key stays
// server-side, ownership scoped to the handed-off group). Each returns a soft
// result and never throws, so the UI can branch without try/catch. Available
// only when ctx.proxyBaseUrl + ctx.unitGroupId are set.

const apiBase = (ctx: RentalCtx) =>
  `${(ctx.proxyBaseUrl as string).replace(/\/$/, '')}/api/tenant/properties/${encodeURIComponent(ctx.propertyId)}`;

export interface LeaseInput {
  unitId: string;
  holdToken: string;
  /** Reuse a Reserve lead, or supply contact fields to create a rental lead. */
  leadId?: string;
  contact?: { firstName: string; lastName: string; email: string; phone: string };
  insuranceId?: string;
  paymentCycle?: string;
  rent?: number;
}
export type LeaseResult =
  | { ok: true; leaseId: string; contactId?: string; status: string }
  | { ok: false; error: string };

/** Create a lease on the held unit (Phase-2 rent step 3). */
export async function createLease(ctx: RentalCtx, input: LeaseInput): Promise<LeaseResult> {
  if (!shouldUseProxyWrites(ctx)) return { ok: false, error: 'Rentals are not configured for this site.' };
  const body: Record<string, unknown> = { unitGroupId: ctx.unitGroupId, holdToken: input.holdToken };
  if (input.insuranceId) body.insuranceId = input.insuranceId;
  if (input.paymentCycle) body.paymentCycle = input.paymentCycle;
  if (input.rent != null) body.rent = input.rent;
  if (input.leadId) body.leadId = input.leadId;
  else if (input.contact) {
    // Same API boundary rule as reserve: send canonical E.164, not the display
    // string. If it isn't a possible number, fail soft rather than post junk.
    const phoneE164 = normalizePhone(input.contact.phone, 'US');
    if (!phoneE164) return { ok: false, error: 'Please enter a valid phone number.' };
    Object.assign(body, { ...input.contact, phone: phoneE164 });
  }
  try {
    const res = await fetch(`${apiBase(ctx)}/units/${encodeURIComponent(input.unitId)}/lease`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => undefined) as { data?: { leaseId: string; contactId?: string; status: string }; error?: { message?: string } } | undefined;
    if (!res.ok || !json?.data?.leaseId) return { ok: false, error: json?.error?.message ?? `Lease failed (${res.status}).` };
    return { ok: true, leaseId: json.data.leaseId, contactId: json.data.contactId, status: json.data.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Authoritative move-in money block for a lease (dryrun preview by default). */
export async function fetchMoveInInvoice(ctx: RentalCtx, leaseId: string, dryrun = true): Promise<MoveInQuote | undefined> {
  if (!shouldUseProxyWrites(ctx)) return undefined;
  try {
    const res = await fetch(`${apiBase(ctx)}/leases/${encodeURIComponent(leaseId)}/generate-move-in-invoice`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryrun }),
    });
    const json = await res.json().catch(() => undefined) as { data?: { totalDue: number; totalTax: number; lines: QuoteLine[] } } | undefined;
    if (!res.ok || !json?.data || typeof json.data.totalDue !== 'number') return undefined;
    return { unitId: '', totalDue: json.data.totalDue, totalTax: json.data.totalTax, lines: json.data.lines ?? [] };
  } catch { return undefined; }
}

/** Protection-plan options for a lease (server-provided; supersedes the demo list). */
export async function fetchInsuranceOptions(ctx: RentalCtx, leaseId: string): Promise<ProtectionPlan[]> {
  if (!shouldUseProxyWrites(ctx)) return [];
  try {
    const res = await fetch(`${apiBase(ctx)}/leases/${encodeURIComponent(leaseId)}/insurances`);
    const json = await res.json().catch(() => undefined) as { data?: Array<{ id: string; name?: string; coverage?: number; premium?: number }> } | undefined;
    if (!res.ok || !Array.isArray(json?.data)) return [];
    return json.data.map((o) => ({ id: o.id, name: o.name, coverage: o.coverage, premium: o.premium }));
  } catch { return []; }
}

/** Apply a protection plan to a lease. Returns success as a boolean. */
export async function setInsurance(ctx: RentalCtx, leaseId: string, insuranceId: string): Promise<boolean> {
  if (!shouldUseProxyWrites(ctx)) return false;
  try {
    const res = await fetch(`${apiBase(ctx)}/leases/${encodeURIComponent(leaseId)}/insurance`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ insuranceId }),
    });
    const json = await res.json().catch(() => undefined) as { data?: { ok?: boolean } } | undefined;
    return !!(res.ok && json?.data?.ok);
  } catch { return false; }
}

/** Hosted one-time payment link for a contact (pay.tenantinc.com) — the PCI-safe
 *  payment path. The widget opens this URL; card entry never touches our pages. */
export async function fetchPaymentLink(ctx: RentalCtx, contactId: string): Promise<string | undefined> {
  if (!shouldUseProxyWrites(ctx)) return undefined;
  try {
    const res = await fetch(`${apiBase(ctx)}/contacts/${encodeURIComponent(contactId)}/payment-link`);
    const json = await res.json().catch(() => undefined) as { data?: { url?: string } } | undefined;
    if (!res.ok || !json?.data?.url) return undefined;
    return json.data.url;
  } catch { return undefined; }
}

// --- Rent: documents → lease → autopay (guide APIs 9, 10, 11) ---------------
//
// The documented rental transaction, called DIRECTLY against Hummingbird with
// the config key — the same boundary reserveViaEdge already uses.
//
// CARD DATA: APIs 9 and 10 take the raw PAN, CVV and expiry in the request
// body; the guide describes no tokenized alternative. That is a deliberate,
// client-directed choice (2026-08-20) and it means the card number passes
// through this bundle, so this path is only reachable from the static CardForm
// (no Global Payments key configured). Where a GP key IS set, the hosted-fields
// path is untouched and no card data exists widget-side.
//
// Nothing here is memoised and nothing is retried: these are money writes.

/**
 * `source` on both calls — Hummingbird records it as the originating
 * application. TenantInc's own sample uses this exact string; override per site
 * once more than one website feeds the same company.
 */
const DEFAULT_SOURCE = 'Mariposa Website Application';

/**
 * The masked "MM/DD/YYYY" a form collects → the API's "YYYY-MM-DD".
 *
 * Purely positional: no Date is constructed, so an incomplete or nonsense entry
 * yields undefined instead of a silently shifted date (new Date('13/40/2020')
 * rolls over into 2021 rather than failing). Every date field here is optional
 * to the API, so sending nothing beats sending a wrong birthday.
 */
export const dobToIso = (masked: string): string | undefined => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked.trim());
  if (!m) return undefined;
  const [, mm, dd, yyyy] = m;
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return undefined;
  return `${yyyy}-${mm}-${dd}`;
};

/** Billing/contact address — required by both the contact and the card. */
export interface RentAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface RentContact extends RentAddress {
  first: string;
  last: string;
  email: string;
  phone: string;
  /** Trading name when renting as a business. Sent as `company` — the contact
   *  record's own field for it — so Hummingbird stores the business rather than
   *  only the first/last the name was split into. */
  businessName?: string;
}

export interface CardPayment extends RentAddress {
  /** Digits only. */
  cardNumber: string;
  /** "09" */
  expMonth: string;
  /** "2027" */
  expYear: string;
  cvv: string;
  nameOnCard: string;
  /** Enrol this card for recurring rent (drives API 11). */
  autoCharge?: boolean;
}

/** A documented cost line. `costType` is a closed set; dates are YYYY-MM-DD. */
export interface RentCostLine {
  amount: number;
  description: string;
  costType: 'rent' | 'discount' | 'other' | 'tax';
  start: string;
  end: string;
  tax: number;
  total: number;
  pmsRaw: null;
}

/** A signed document, as APIs 9 and 10 exchange them. */
export interface LeaseDocumentRef {
  document_type: string;
  filename: string;
  src: string;
  version: string;
}

/**
 * The optional Additional Information sections, mapped to the guide's names.
 *
 * NOTE on `business`: the guide's contact example carries `"Business": {}` and
 * documents no fields for it, so the business details are deliberately NOT sent
 * — inventing a shape would either be ignored or rejected. Ask TenantInc for it.
 */
export interface RentalExtras {
  business?: boolean;
  businessAddress?: string;
  businessFirst?: string;
  businessLast?: string;
  military?: boolean;
  /** YYYY-MM-DD. */
  dateOfBirth?: string;
  altContact?: boolean;
  altFirst?: string;
  altLast?: string;
  altPhone?: string;
  altEmail?: string;
  altAddress?: string;
  vehicle?: boolean;
  vehicleType?: string;
}

export interface RentArgs {
  unit: { id: string; number?: string };
  holdToken: string;
  contact: RentContact;
  card: CardPayment;
  /** YYYY-MM-DD. */
  startDate: string;
  /** From the offer — documents/finalize rejects the call without it. */
  spaceMixId?: string;
  /** From lease-set-up. */
  billDay?: number;
  /** Non-prorated monthly rent, from lease-set-up. */
  webRate?: number;
  totalPaymentAmount: number;
  costs: RentCostLine[];
  promotionIds?: string[];
  /** Reserve first, then rent: the lease attaches to the reservation. */
  reservationId?: string;
  platform?: string;
  /** `source` — which application originated this, for attribution in
   *  Hummingbird. TenantInc's own example sends "Mariposa Website Application". */
  source?: string;
  /** How the tenant wants legal notices delivered: hand_delivery | email | mail. */
  noticeDelivery?: 'hand_delivery' | 'email' | 'mail';
  /** Military / alternate-contact / vehicle sections, when the shopper opened them. */
  extras?: RentalExtras;
}

export type RentStage = 'documents' | 'lease' | 'autopay';
export type RentResult =
  | {
    ok: true;
    leaseId: string;
    paymentId?: string;
    paymentMethodId?: string;
    unitNumber?: string;
    autopay?: boolean;
    /** The tenant's gate PIN, from `lease.tenants[0].pin`. THE access code —
     *  no other endpoint returns one, and it exists only after the lease. */
    accessCode?: string;
    /** 'active' on a completed rental. */
    status?: string;
  }
  | { ok: false; error: string; stage: RentStage };

/** The `contacts` array both calls take. Phones are E.164 with the type lowercase. */
function rentContacts(c: RentContact, extras?: RentalExtras): unknown[] {
  const contact: Record<string, unknown> = {
    first: c.first,
    last: c.last,
    email: c.email,
    Phones: [{ phone: c.phone, type: 'cell', sms: true }],
    Addresses: [{
      Address: { address: c.address, city: c.city, state: c.state, zip: c.zip },
      type: 'primary',
    }],
  };

  // Renting as a business: the trading name belongs in `company`, with
  // `rent_as_business` marking the contact. Both are real fields on the contact
  // record and both persist (verified 2026-08-21) — without them the business
  // survives only as the first/last its name was split into.
  if (c.businessName) {
    contact.company = c.businessName;
    contact.rent_as_business = 1;
  }

  // Military. The guide's Military object has ten fields; the form asks only for
  // a date of birth, so only that is sent. active_military is the flag the guide
  // says accompanies military details.
  if (extras?.military && extras.dateOfBirth) {
    contact.active_military = 1;
    contact.Military = { active: 1, date_of_birth: extras.dateOfBirth };
  }

  // Alternate contact — a Relationship, not a second contact. Sent only when the
  // section is ticked AND has a name, so a half-filled section that the shopper
  // closed again cannot post an empty person.
  if (extras?.altContact && (extras.altFirst || extras.altLast)) {
    const alt: Record<string, unknown> = {
      first: extras.altFirst ?? '',
      last: extras.altLast ?? '',
      email: extras.altEmail ?? '',
    };
    const altPhone = extras.altPhone ? normalizePhone(extras.altPhone, 'US') : undefined;
    if (altPhone) alt.Phones = [{ phone: altPhone, type: 'cell', sms: true }];
    if (extras.altAddress) {
      // The form takes one address line; city/state/zip are not asked for, so
      // they are omitted rather than guessed from it.
      alt.Addresses = [{ Address: { address: extras.altAddress }, type: 'alternate' }];
    }
    contact.Relationships = [{ Contact: alt, is_alternate: 1, type: 'alternate' }];
  }

  return [contact];
}

/** `vehicle_info`, when the shopper is storing one. Type is all the form asks. */
function vehicleInfo(extras?: RentalExtras): Record<string, unknown> | undefined {
  if (!extras?.vehicle || !extras.vehicleType) return undefined;
  return { description: extras.vehicleType, vehicle: { type: extras.vehicleType } };
}

/** The `payment_method` object. Card only — ACH is not wired yet. */
function cardPaymentMethod(card: CardPayment, autoCharge: boolean): Record<string, unknown> {
  const parts = card.nameOnCard.trim().split(/\s+/);
  const body: Record<string, unknown> = {
    type: 'card',
    card_number: card.cardNumber.replace(/\D/g, ''),
    cvv2: card.cvv,
    exp_mo: card.expMonth,
    exp_yr: card.expYear,
    name_on_card: card.nameOnCard,
    first: parts[0] ?? '',
    last: parts.slice(1).join(' ') || (parts[0] ?? ''),
    address: card.address,
    city: card.city,
    state: card.state,
    zip: card.zip,
    save_to_account: false,
  };
  if (autoCharge) body.auto_charge = true;
  return body;
}

/** Browser context the clickwrap signature is stamped with. */
function signingMetadata(): Record<string, unknown> {
  return {
    // The guide also wants `ip` and `location`. Neither is knowable in the
    // browser without calling a third-party geo service, which would leak the
    // shopper to an unrelated host — so they are sent empty and Hummingbird
    // records what it sees from the request itself.
    ip: '',
    location: '',
    user_agent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  };
}

interface FinalizeData { documents?: unknown[]; signed?: boolean }

/**
 * API 9 — generate and sign the lease documents.
 *
 * ClickWrap / Super Lease sign internally and return `signed: true` with the
 * `documents` array the lease call needs. Traditional signing returns
 * `signed: false` and per-document signing URLs, and the guide then requires
 * the integrator to host the signed PDF and supply its public URL — which this
 * widget cannot do. That case fails with a message naming the situation rather
 * than posting a lease that would be rejected for unsigned documents.
 */
async function finalizeDocuments(ctx: RentalCtx, args: RentArgs): Promise<LeaseDocumentRef[]> {
  const body: Record<string, unknown> = {
    contacts: rentContacts(args.contact, args.extras),
    payment_method: cardPaymentMethod(args.card, !!args.card.autoCharge),
    start_date: args.startDate,
    space_mix_id: args.spaceMixId,
    total_payment_amount: args.totalPaymentAmount,
    bill_day: args.billDay,
    payment_cycle: 'Monthly',
    web_rate: args.webRate,
    costs: args.costs,
    metadata: signingMetadata(),
    platform: args.platform ?? 'website',
    source: args.source ?? DEFAULT_SOURCE,
    deliveryMethod: { notice_delivery: args.noticeDelivery ?? 'email' },
  };
  const vehicle = vehicleInfo(args.extras);
  if (vehicle) body.vehicle_info = vehicle;
  if (args.promotionIds?.length) body.discount_id = args.promotionIds[0];

  const inner = await sendV1('POST', `companies/${ctx.companyId}/units/${args.unit.id}/documents/finalize`, body);
  if (inner.status !== 200 || !inner.data) {
    throw new Error(inner.msg || `documents/finalize failed (${inner.status}).`);
  }
  const data = inner.data as FinalizeData;
  const docs = (data.documents ?? []) as Array<Record<string, unknown>>;
  if (data.signed !== true) {
    console.error(
      '[rental] documents came back UNSIGNED — this company uses Traditional signing, which needs a signing UI and a hosted PDF. Signing URLs:',
      docs.map((d) => d.url).filter(Boolean),
    );
    throw new Error('This facility requires the lease to be signed in person. Please contact the office to finish your rental.');
  }
  // Keep only the four fields the lease call consumes; anything else is noise.
  return docs.map((d) => ({
    document_type: String(d.document_type ?? ''),
    filename: String(d.filename ?? d.document_type ?? 'Document'),
    src: String(d.src ?? ''),
    version: String(d.version ?? d.fileId ?? ''),
  }));
}

/** API 10 — finalize the lease and take the move-in payment. */
async function finalizeLease(
  ctx: RentalCtx, args: RentArgs, documents: LeaseDocumentRef[],
): Promise<{ leaseId: string; paymentId?: string; paymentMethodId?: string; accessCode?: string; status?: string }> {
  const body: Record<string, unknown> = {
    contacts: rentContacts(args.contact, args.extras),
    documents,
    payment_method: cardPaymentMethod(args.card, !!args.card.autoCharge),
    start_date: args.startDate,
    platform: args.platform ?? 'website',
    source: args.source ?? DEFAULT_SOURCE,
    deliveryMethod: { notice_delivery: args.noticeDelivery ?? 'email' },
    additional_months: 0,
  };
  // One identifier or the other, never both: reservation_id continues a
  // reservation, hold_token rents the held unit directly (guide, API 10).
  if (args.reservationId) body.reservation_id = args.reservationId;
  else body.hold_token = args.holdToken;
  if (args.promotionIds?.length) {
    body.promotions = args.promotionIds.map((id) => ({ promotion_id: id }));
  }

  const inner = await sendV1('POST', `companies/${ctx.companyId}/units/${args.unit.id}/lease`, body);
  if (inner.status !== 200 || !inner.data) {
    throw new Error(inner.msg || `lease failed (${inner.status}).`);
  }
  // VERIFIED 2026-08-20: the real response nests everything under `lease`,
  // where the guide's example shows it flat. Both are accepted so a fix at
  // either end cannot break this.
  const raw = inner.data as Record<string, unknown>;
  const d = (raw.lease ?? raw) as Record<string, unknown>;
  const leaseId = (d.lease_id ?? d.id) as string | undefined;
  if (!leaseId) throw new Error('The lease was created but returned no id — please contact the facility before trying again.');
  // The gate PIN rides on the tenant, not the lease. This is the ONLY place any
  // endpoint returns an access code — it does not exist before the lease.
  const tenants = (d.tenants as Array<{ pin?: string | number }> | undefined) ?? [];
  const pin = tenants.find((t) => t?.pin != null)?.pin;
  return {
    leaseId,
    paymentId: d.payment_id as string | undefined,
    paymentMethodId: d.payment_method_id as string | undefined,
    accessCode: pin != null ? String(pin) : undefined,
    status: d.status as string | undefined,
  };
}

/** API 11 — enrol the saved card for recurring rent. */
async function enableAutopay(ctx: RentalCtx, leaseId: string, paymentMethodId: string): Promise<boolean> {
  const inner = await sendV1(
    'PUT', `companies/${ctx.companyId}/leases/${leaseId}/payment-methods/${paymentMethodId}/autopay`, {},
  );
  return inner.status === 200;
}

/**
 * The whole rental: documents → lease → (optional) autopay.
 *
 * Returns a soft result and never throws, so the UI branches without
 * try/catch — and carries the STAGE, because the three failures need different
 * words: documents means nothing happened, lease means the money may or may not
 * have moved, autopay means the rental succeeded and only the recurring
 * enrolment did not.
 */
export async function rentSpace(ctx: RentalCtx, args: RentArgs): Promise<RentResult> {
  if (!writesEnabled(ctx)) {
    return { ok: false, error: 'Rentals are not configured for this site.', stage: 'documents' };
  }
  const phoneE164 = normalizePhone(args.contact.phone, 'US');
  if (!phoneE164) return { ok: false, error: 'Please enter a valid phone number.', stage: 'documents' };
  const a: RentArgs = { ...args, contact: { ...args.contact, phone: phoneE164 } };

  let documents: LeaseDocumentRef[];
  try {
    documents = await finalizeDocuments(ctx, a);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), stage: 'documents' };
  }

  let lease: Awaited<ReturnType<typeof finalizeLease>>;
  try {
    lease = await finalizeLease(ctx, a, documents);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), stage: 'lease' };
  }
  memoInvalidate('units/available');

  // The rental is DONE at this point. Autopay is an add-on: a failure here is
  // reported alongside success, never as a failed rental.
  let autopay: boolean | undefined;
  if (a.card.autoCharge && lease.paymentMethodId) {
    try {
      autopay = await enableAutopay(ctx, lease.leaseId, lease.paymentMethodId);
    } catch {
      autopay = false;
    }
    if (!autopay) console.warn('[rental] lease created but autopay enrolment failed — the tenant must enrol from their account.');
  }

  return {
    ok: true,
    leaseId: lease.leaseId,
    paymentId: lease.paymentId,
    paymentMethodId: lease.paymentMethodId,
    accessCode: lease.accessCode,
    status: lease.status,
    unitNumber: a.unit.number,
    autopay,
  };
}

/**
 * Quote lines → the documented `costs` array.
 *
 * `costType` is a closed set, so it is derived from the line rather than passed
 * through: a negative amount is a discount (that is how the quote encodes a
 * promotion), and rent/tax are matched by name. Everything else is `other`,
 * which is where fees and coverage land.
 */
export function quoteToCosts(quote: MoveInQuote, startDate: string): RentCostLine[] {
  const lines: RentCostLine[] = quote.lines.map((l) => {
    const costType: RentCostLine['costType'] =
      l.cost < 0 ? 'discount'
        : /(^|\s)tax(es)?(\s|$)/i.test(l.name) ? 'tax'
          : /rent/i.test(l.name) ? 'rent'
            : 'other';
    const amount = Math.abs(l.cost);
    return {
      amount,
      description: l.name,
      costType,
      start: l.startDate ?? startDate,
      end: l.endDate ?? l.startDate ?? startDate,
      tax: 0,
      total: amount,
      pmsRaw: null,
    };
  });
  // Tax is a total on the quote, not a line, so it is added explicitly — the
  // guide's example carries a "Total Tax" entry of its own.
  if (quote.totalTax > 0 && !lines.some((l) => l.costType === 'tax')) {
    lines.push({
      amount: 0, description: 'Total Tax', costType: 'tax',
      start: startDate, end: startDate, tax: quote.totalTax, total: quote.totalTax, pmsRaw: null,
    });
  }
  return lines;
}
