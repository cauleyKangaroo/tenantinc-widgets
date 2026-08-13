// Filter panel options (Figma 10557:146492). Static, like the rest of #08 for
// now — these lists become the property/unit facets once the widget is wired up.

export interface FilterState {
  types: string[];
  sizes: string[];
  features: string[];
  amenities: string[];
  promotions: string[];
  minPrice: string;
  maxPrice: string;
  maxDistance: string;
}

export const TYPE_OPTIONS = ['Storage', 'Parking'];
export const SIZE_OPTIONS = ['Small', 'Medium', 'Large'];
export const FEATURE_OPTIONS = ['Climate Controlled', 'Drive Up', 'Ground Floor'];
export const AMENITY_OPTIONS = [
  'Smart Phone Access',
  'Ground Floor',
  'Bluetooth Gate',
  'First Floor',
  'Power outlet',
  'Drive Up',
];
export const PROMOTION_OPTIONS = ['$1 Moves you in', '3 Month 50% Off', 'Get a free Bunny Rabbit'];

export const PRICE_OPTIONS = ['$0', '$50', '$100', '$250', '$500', '$1,000', '$2,000'];
export const DISTANCE_OPTIONS = ['5 miles', '10 miles', '20 miles', '50 miles'];

/** The frame's pre-selected state, so the panel opens looking like the design. */
export const INITIAL_FILTERS: FilterState = {
  types: [],
  sizes: [],
  features: ['Climate Controlled'],
  amenities: ['Smart Phone Access', 'Ground Floor'],
  promotions: ['$1 Moves you in', '3 Month 50% Off'],
  minPrice: '$0',
  maxPrice: '$2,000',
  maxDistance: '20 miles',
};

/** Count shown in the green badge — one per active facet. */
export function activeFilterCount(f: FilterState): number {
  return f.types.length + f.sizes.length + f.features.length
    + f.amenities.length + f.promotions.length;
}
