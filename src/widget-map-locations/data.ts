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
  /**
   * "california/bellflower/storage-outlet-bellflower-340079517" — the property
   * page's own path under `propertyBasePath`. Empty when the API row carries no
   * slug, in which case "See All Spaces" has nowhere to go and is not rendered.
   */
  slug?: string;
  units: CityUnit[];
  /** Facility photo from the API's `Images`, if any (else the demo imagery). */
  imageUrl?: string;
}

const UNITS: CityUnit[] = [
  { id: 'u1', dimensions: '5’ x 5’',   subtype: 'Climate Controlled', inStorePrice: 55,  startingPrice: 25 },
  { id: 'u2', dimensions: '10’ x 10’', subtype: 'Drive Up',           inStorePrice: 174, startingPrice: 140 },
  { id: 'u3', dimensions: '10’ x 12’', subtype: 'Drive Up',           inStorePrice: 580, startingPrice: 450 },
];

/* Every entry carries a `slug`. It is what the property-page links are built
   from — the popup card and "See All Spaces" both render only when one is
   present, because without it there is nowhere to point. The demo rows had
   none, so in the harness those links silently did not exist while the live
   mapper (api.ts: `slug: p.slug ?? ''`) supplied them fine. Same shape the
   live data uses: state/city/property-name-id. */
export const CITY_FACILITIES: CityFacility[] = [
  {
    id: 'f1',
    name: '3rd Street Storage',
    slug: 'california/fullerton/3rd-street-storage-f1',
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
    slug: 'california/fullerton/upper-fullerton-self-storage-f2',
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
    slug: 'california/fullerton/jamboree-rv-parking-f3',
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
