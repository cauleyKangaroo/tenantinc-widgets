// ===========================================================================
// Static city-page data (Figma 10622:77201).
//
// Deliberately static for now: the design is being signed off before the widget
// is wired to the Properties collection + space-groups. When that happens this
// file is the only thing that goes — the shapes below already mirror what those
// sources return (name/address/phone/lat/lng per property, dimensions/subtype/
// in-store/starting per unit), so the components shouldn't need to change.
// ===========================================================================

export interface CityUnit {
  id: string;
  /** e.g. "5' x 5'" */
  dimensions: string;
  /** e.g. "Climate Controlled" */
  subtype: string;
  inStorePrice: number;
  startingPrice: number;
  /** The filter facets below are present on live units (see api.ts CitySpace)
   *  and absent on the demo rows, so everything that reads them tolerates
   *  undefined — a demo unit simply never matches a facet. */
  spaceType?: 'Storage' | 'Parking';
  sizeBucket?: string;
  features?: string[];
  amenities?: string[];
  promo?: string;
  vacantCount?: number;
}

export interface CityFacility {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  /** False → lat/lng are placeholders; don't plot or measure. See api.ts. */
  hasCoords?: boolean;
  /** NaN when unknown (no visitor location, or the property has no coords). */
  distanceMiles: number;
  rating: number;
  reviewCount: number;
  /** Dashed promo banner above the unit rows. Empty = no banner. */
  promo?: string;
  adminFee: number;
  /** Map bubble label, e.g. "$25". Empty when no priced space is available. */
  priceLabel: string;
  /** Green outline + "Featured Property" ribbon. */
  featured?: boolean;
  units: CityUnit[];
  /** Facility photo from the API's `Images`, if any (else the demo imagery). */
  imageUrl?: string;
}

const UNITS: CityUnit[] = [
  { id: 'u1', dimensions: '5’ x 5’',   subtype: 'Climate Controlled', inStorePrice: 55,  startingPrice: 25 },
  { id: 'u2', dimensions: '10’ x 10’', subtype: 'Drive Up',           inStorePrice: 174, startingPrice: 140 },
  { id: 'u3', dimensions: '10’ x 12’', subtype: 'Drive Up',           inStorePrice: 580, startingPrice: 450 },
];

export const CITY_FACILITIES: CityFacility[] = [
  {
    id: 'f1',
    name: '3rd Street Storage',
    address: '8478 3rd Street, Fullerton, CA 02027',
    phone: '(555) 555-5555',
    lat: 33.8703, lng: -117.9243,
    distanceMiles: 3.5,
    rating: 4.5, reviewCount: 32,
    promo: 'Short Promotion Title',
    adminFee: 20,
    priceLabel: '$120',
    featured: true,
    units: [
      { ...UNITS[0], id: 'f1u1', startingPrice: 120 },
      UNITS[1],
      UNITS[2],
    ],
  },
  {
    id: 'f2',
    name: 'Upper Fullerton Self Storage',
    address: '8478 3rd Street, Fullerton, CA 02027',
    phone: '(555) 555-5555',
    lat: 33.8847, lng: -117.9089,
    distanceMiles: 0.7,
    rating: 4.8, reviewCount: 214,
    promo: 'Short Promotion Title',
    adminFee: 20,
    priceLabel: '$25',
    units: UNITS,
  },
  {
    id: 'f3',
    name: 'Jamboree RV Parking',
    address: '8478 3rd Street, Fullerton, CA 02027',
    phone: '(555) 555-5555',
    lat: 33.8579, lng: -117.9502,
    distanceMiles: 2.5,
    rating: 4.2, reviewCount: 87,
    promo: 'Short Promotion Title',
    adminFee: 20,
    priceLabel: '$40',
    units: UNITS,
  },
];
