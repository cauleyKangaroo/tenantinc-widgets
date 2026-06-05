import type { Unit, FilterOption, SpaceType, UnitSize } from './types';

// ===========================================================================
// HANDOFF SEAM
//
// Everything the widget displays comes from DEMO_UNITS below. To go live, the
// backend developer replaces this static array with units fetched from
// Hummingbird (via the server-side proxy) — same Unit[] shape, no component
// changes required. See HANDOFF.md for the exact swap.
//
// The grid and list views both derive from this single array:
//   • Grid view  — units grouped by size into accordions, one card per unit.
//   • List view  — units grouped by size, one row per size, each unit's
//                  `dimensions` shown as a selectable pill.
// ===========================================================================

const IMG_BASE =
  'https://image-res-platform.s3.amazonaws.com/cwdt/ddbf0ca382124341a481f870782890a3/images';

const STD_FEATURES = ['24 Hour Access', 'Near Entrances', 'No Late Fees', 'Smart Lock'];

export const DEMO_UNITS: Unit[] = [
  // ── Small ────────────────────────────────────────────────────────────
  {
    id: 'sm-5x5',
    type: 'storage',
    size: 'small',
    dimensions: "5' x 5'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor', 'Power Outlet'],
    image: `${IMG_BASE}/77567ee5-0c28-422b-a5a5-f769cba99922.png`,
    inStorePrice: 89.5,
    startingPrice: 79.0,
  },
  {
    id: 'sm-5x8',
    type: 'storage',
    size: 'small',
    dimensions: "5' x 8'",
    subtype: 'Drive Up',
    features: STD_FEATURES,
    amenities: ['Drive Up', 'Ground Floor'],
    image: `${IMG_BASE}/78bb33ed-dbd3-4733-8bb8-f18e709b13cd.png`,
    inStorePrice: 95.5,
    startingPrice: 84.0,
  },
  {
    id: 'sm-4x8',
    type: 'storage',
    size: 'small',
    dimensions: "4' x 8'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/2a88c851-6d81-4a46-9bd5-4ac017d01468.png`,
    inStorePrice: 99.0,
    startingPrice: 88.0,
    promo: 'Save 15% this month',
  },
  {
    id: 'sm-5x10',
    type: 'storage',
    size: 'small',
    dimensions: "5' x 10'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor', 'First Floor'],
    image: `${IMG_BASE}/77567ee5-0c28-422b-a5a5-f769cba99922.png`,
    inStorePrice: 109.0,
    startingPrice: 95.0,
  },

  // ── Medium ───────────────────────────────────────────────────────────
  {
    id: 'md-5x7',
    type: 'storage',
    size: 'medium',
    dimensions: "5' x 7'",
    subtype: 'Climate Controlled',
    features: [...STD_FEATURES, 'Drive Up', 'Se habla espanol'],
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/34873174-f498-414e-bdf0-d1733a4a3596.png`,
    inStorePrice: 199.5,
    startingPrice: 184.5,
  },
  {
    id: 'md-5x8',
    type: 'storage',
    size: 'medium',
    dimensions: "5' x 8'",
    subtype: 'Drive Up',
    features: STD_FEATURES,
    amenities: ['Drive Up', 'Ground Floor'],
    image: `${IMG_BASE}/e03b2827-39f3-4114-ac43-cda08a5b971f.png`,
    inStorePrice: 205.0,
    startingPrice: 189.0,
  },
  {
    id: 'md-7x7',
    type: 'storage',
    size: 'medium',
    dimensions: "7' x 7'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/4012ceb3-f581-4189-a795-038247e71aa2.png`,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    adminFee: 20,
  },
  {
    id: 'md-7x12',
    type: 'storage',
    size: 'medium',
    dimensions: "7' x 12'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor', 'Bluetooth Gate'],
    image: `${IMG_BASE}/a9828d3c-580c-4542-a57b-97d2bc88fed3.png`,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    promo: 'Short Promotion Title',
  },
  {
    id: 'md-9x7',
    type: 'storage',
    size: 'medium',
    dimensions: "9' x 7'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/80a87a20-01bd-4472-889e-579791cb2f2d.png`,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    promo: 'Short Promotion Title',
    adminFee: 20,
  },
  {
    id: 'md-9x9',
    type: 'storage',
    size: 'medium',
    dimensions: "9' x 9'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/3a7c4625-272b-47be-b2b3-8401b363d7e7.png`,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    promo: 'Short Promotion Title',
    urgency: 'Only 1 left · Rent soon!',
  },

  // ── Large ────────────────────────────────────────────────────────────
  {
    id: 'lg-10x10',
    type: 'storage',
    size: 'large',
    dimensions: "10' x 10'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/f47ff7ba-3114-4af1-b072-f5abe786a8cb.png`,
    inStorePrice: 289.5,
    startingPrice: 269.0,
    urgency: 'Only 1 left · Rent soon!',
  },
  {
    id: 'lg-10x15',
    type: 'storage',
    size: 'large',
    dimensions: "10' x 15'",
    subtype: 'Drive Up',
    features: STD_FEATURES,
    amenities: ['Drive Up', 'Ground Floor'],
    image: `${IMG_BASE}/08d74f07-a143-4662-992d-30063240a2f1.png`,
    inStorePrice: 319.5,
    startingPrice: 299.0,
  },
  {
    id: 'lg-10x20',
    type: 'storage',
    size: 'large',
    dimensions: "10' x 20'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor', 'First Floor'],
    image: `${IMG_BASE}/1c075e6c-e31e-4220-8377-97ed57b2afb8.png`,
    inStorePrice: 389.5,
    startingPrice: 349.0,
  },
  {
    id: 'lg-12x12',
    type: 'storage',
    size: 'large',
    dimensions: "12' x 12'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: `${IMG_BASE}/f47ff7ba-3114-4af1-b072-f5abe786a8cb.png`,
    inStorePrice: 359.0,
    startingPrice: 329.0,
  },

  // ── Parking (demonstrates the Type filter) ─────────────────────────────
  {
    id: 'pk-9x18',
    type: 'parking',
    size: 'medium',
    dimensions: "9' x 18'",
    subtype: 'Covered',
    features: ['24 Hour Access', 'Gated Entry', 'Near Entrances'],
    amenities: ['Drive Up', 'Ground Floor', 'First Floor'],
    image: `${IMG_BASE}/1c075e6c-e31e-4220-8377-97ed57b2afb8.png`,
    inStorePrice: 95.0,
    startingPrice: 85.0,
  },
  {
    id: 'pk-10x20',
    type: 'parking',
    size: 'large',
    dimensions: "10' x 20'",
    subtype: 'Outdoor',
    features: ['24 Hour Access', 'Gated Entry'],
    amenities: ['Drive Up', 'Ground Floor'],
    image: `${IMG_BASE}/08d74f07-a143-4662-992d-30063240a2f1.png`,
    inStorePrice: 75.0,
    startingPrice: 65.0,
  },
];

// ---------------------------------------------------------------------------
// Filter option definitions
// ---------------------------------------------------------------------------

export const TYPE_OPTIONS: FilterOption<SpaceType>[] = [
  { value: 'storage', label: 'Storage' },
  { value: 'parking', label: 'Parking' },
];

export const SIZE_OPTIONS: FilterOption<UnitSize>[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/**
 * Feature pills. `label` is matched against a unit's subtype / features /
 * amenities by filterUnits() — see filters.ts.
 */
export const FEATURE_OPTIONS: FilterOption[] = [
  { value: 'climate', label: 'Climate Controlled' },
  { value: 'driveup', label: 'Drive Up' },
  { value: 'ground', label: 'Ground Floor' },
];

export const AMENITY_OPTIONS: string[] = [
  'Smart Phone Access',
  'Ground Floor',
  'Bluetooth Gate',
  'First Floor',
  'Power Outlet',
  'Drive Up',
];

/** Sizes in display order, used to render accordions / list groups. */
export const SIZE_ORDER: UnitSize[] = ['small', 'medium', 'large'];
