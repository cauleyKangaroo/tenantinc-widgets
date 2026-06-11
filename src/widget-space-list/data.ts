import type { Unit, FilterOption, SpaceType, UnitSize } from './types';
import unitImg from './assets/unit-medium.png.png';

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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    promo: 'Short Promotion Title',
    availability: 'call',
  },
  {
    id: 'md-9x7',
    type: 'storage',
    size: 'medium',
    dimensions: "9' x 7'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: unitImg,
    inStorePrice: 199.5,
    startingPrice: 184.5,
    promo: 'Short Promotion Title',
    adminFee: 20,
    availability: 'waitlist',
  },
  {
    id: 'md-9x9',
    type: 'storage',
    size: 'medium',
    dimensions: "9' x 9'",
    subtype: 'Climate Controlled',
    features: STD_FEATURES,
    amenities: ['Smart Phone Access', 'Ground Floor'],
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
    image: unitImg,
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
