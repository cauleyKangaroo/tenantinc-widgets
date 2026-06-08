// ---------------------------------------------------------------------------
// Space List widget — data + prop types
//
// The backend developer's main concern is the `Unit` shape below: this is the
// contract every component renders against. Swap the static DEMO_UNITS in
// data.ts for a Hummingbird-backed Unit[] and nothing in the components needs
// to change. See HANDOFF.md.
// ---------------------------------------------------------------------------

export type SpaceType = 'storage' | 'parking';
export type UnitSize = 'small' | 'medium' | 'large';

/** A single rentable space. One flat array of these drives both views. */
export interface Unit {
  id: string;
  type: SpaceType;
  size: UnitSize;
  /** Display dimensions, e.g. "5' x 5'" */
  dimensions: string;
  /** Short descriptor shown under the title, e.g. "Climate Controlled" */
  subtype: string;
  /** Bulleted feature list on the card */
  features: string[];
  /** Amenities this unit has — matched against the amenity checkboxes filter */
  amenities: string[];
  image: string;
  /** Strike-through "in-store" price */
  inStorePrice: number;
  /** Main "starting at" price */
  startingPrice: number;
  /** Optional "+ Plus $X Admin Fee" line */
  adminFee?: number;
  /** Optional promo badge text */
  promo?: string;
  /** Optional urgency line, e.g. "Only 1 left · Rent soon!" */
  urgency?: string;
}

// ---------------------------------------------------------------------------
// Filter option definitions (drive the filter panel UI)
// ---------------------------------------------------------------------------

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

// ---------------------------------------------------------------------------
// Widget props — these come straight from the Duda content panel
// ---------------------------------------------------------------------------

export type AdditionalPanelPosition = 'left' | 'right' | 'bottom';

export interface SpaceListProps {
  /** Radio in the content panel: Grid View / List View */
  layoutMode?: 'grid' | 'list';
  /** Dropdown in the content panel: Left / Top / Right */
  filterPosition?: 'left' | 'top' | 'right';
  /**
   * Additional Panel mode:
   * - 'single' — show one section, always open (uses additionalPanelSection)
   * - 'all'    — show every section as a collapsible accordion
   * Default 'single'. In 'all' mode the section dropdown is irrelevant (Duda
   * hides it via conditional logic).
   */
  additionalPanelMode?: 'single' | 'all';
  /** Section shown in the Additional Panel when mode is 'single'. 'none'/omitted = AP hidden. */
  additionalPanelSection?: string;
  /** Where the Additional Panel sits (constrained by filterPosition in Duda). */
  additionalPanelPosition?: AdditionalPanelPosition;
}

export type { SectionKey } from './sections';
