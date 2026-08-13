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
    name: prop.name,
    phone: prop.Phones?.[0]?.phone,
    address: a?.address
      ? [a.address, a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
      : undefined,
    officeHours: hoursLines(office),
    gateHours: hoursLines(gate),
  };
}

// --- Protection plans (space-groups → insurance[]) ---------------------------

export interface ProtectionPlan {
  id: string;
  /** Dollar coverage amount, e.g. 2000. */
  coverage?: number;
  /** Monthly premium, e.g. 12. */
  premium?: number;
  name?: string;
}

// The insurance rows are [] on every tenant we can read, so the field names
// below are best guesses across the API's usual vocabulary. Anything
// unrecognised still surfaces as a plan with just an id + name.
interface ApiInsurance {
  id?: string;
  name?: string;
  coverage?: number | string;
  coverage_amount?: number | string;
  coverage_limit?: number | string;
  premium?: number | string;
  premium_value?: number | string;
  price?: number | string;
}

const num = (v: number | string | undefined): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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

export function extractProtectionPlans(raw: unknown): ProtectionPlan[] {
  const data = unwrap(raw);
  const profiles = (data?.spaceGroupProfile as Record<string, { insurance?: ApiInsurance[] }>) ?? {};
  const seen = new Map<string, ProtectionPlan>();
  for (const profile of Object.values(profiles)) {
    for (const ins of profile.insurance ?? []) {
      const id = ins.id ?? ins.name ?? JSON.stringify(ins);
      if (seen.has(id)) continue;
      seen.set(id, {
        id,
        name: ins.name,
        coverage: num(ins.coverage ?? ins.coverage_amount ?? ins.coverage_limit),
        premium: num(ins.premium ?? ins.premium_value ?? ins.price),
      });
    }
  }
  return Array.from(seen.values());
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
}

interface ApiUnitRow {
  id: string;
  number?: string;
  type?: string;
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
export async function findUnitForSelection(ctx: RentalCtx, size?: string, price?: number, fresh = false): Promise<{ id: string; number?: string } | undefined> {
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
  return { id: pick.id, number: pick.number };
}

interface ApiQuoteDetail { name?: string; total_cost?: number; start_date?: string; end_date?: string }
interface ApiQuoteInvoice { total_due?: number; total_tax?: number; Detail?: ApiQuoteDetail[] }

/**
 * Move-in money from lease-set-up. Two modes (verified 2026-08-03):
 * - No hold: plain GET — but the GET 409s once ANYONE holds the unit.
 * - Holding: POST with { hold_token } — the only quote path for a held
 *   unit, and hold-aware (this is what the rail must use after holding).
 * `move_in_date` in the POST body is accepted but IGNORED by the engine.
 */
export async function fetchMoveInQuote(ctx: RentalCtx, unit: { id: string; number?: string }, holdToken?: string): Promise<MoveInQuote | undefined> {
  // Hold-aware quote through the proxy when configured — the only quote path
  // for a held unit, and it keeps the key server-side.
  if (holdToken && shouldUseProxyWrites(ctx)) return fetchHeldQuoteViaProxy(ctx, unit, holdToken);
  const path = `companies/${ctx.companyId}/units/${unit.id}/lease-set-up`;
  let data: Record<string, unknown> | undefined;
  if (holdToken && writesEnabled(ctx)) {
    const inner = await sendV1('POST', path, { hold_token: holdToken });
    if (inner.status !== 200) throw new Error(`lease-set-up POST failed: ${inner.status} ${inner.msg ?? ''}`);
    data = inner.data;
  } else {
    data = unwrap(await getJsonV1(path));
  }
  const inv = ((data?.details as { Invoices?: ApiQuoteInvoice[] } | undefined)?.Invoices ?? [])[0];
  if (!inv || typeof inv.total_due !== 'number') return undefined;
  return {
    unitId: unit.id,
    unitNumber: unit.number,
    totalDue: inv.total_due,
    totalTax: inv.total_tax ?? 0,
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

async function sendV1(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<InnerResult> {
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
    const d = inner.data ?? {};
    // Return the authoritative quote we just submitted so the confirmation shows
    // exactly the reserved amount, not the earlier step-2 quote.
    return { ok: true, reservationId: (d.id ?? d.reservation_id) as string | undefined, unitNumber: (d.unit_number as string | undefined) ?? args.unit.number, quote };
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
