// ---------------------------------------------------------------------------
// Space List widget — data + prop types
//
// The backend developer's main concern is the `Unit` shape below: this is the
// contract every component renders against. Swap the static DEMO_UNITS in
// data.ts for a Hummingbird-backed Unit[] and nothing in the components needs
// to change. See HANDOFF.md.
// ---------------------------------------------------------------------------

export type SpaceType = 'storage' | 'parking';

/**
 * Size categories derived from length × height area (sq ft):
 *   0 → other | 1 → extra_small | 2–24 → small | 25–76 → medium
 *   77–151 → large | 152+ → extra_large
 */
export type UnitSize = 'other' | 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';

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
  /** Amenity names where show_in_filter_bar === 1 — drives the Space Features pills */
  filterBarFeatures: string[];
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
  /** CTA state: absent = normal Select, 'call' = Call button, 'waitlist' = Waitlist button */
  availability?: 'call' | 'waitlist';
}

// ---------------------------------------------------------------------------
// Widget-level display config — built from SpaceListProps in SpaceList.tsx
// and threaded down to all card components.
// ---------------------------------------------------------------------------

export interface WidgetConfig {
  showInstorePrice: boolean;
  /** Label shown above the in-store strike price ("IN-STORE", "WAS", etc.) */
  instorePriceLabel: string;
  showJunkFeeDisclaimer: boolean;
  showUrgencyMessage: boolean;
  enableWaitlist: boolean;
  callOnLimitedAvailability: boolean;
  ctaButtonCopy: string;
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
  /**
   * Order of the accordion sections in 'all' mode (section keys), set by the
   * editor's draggable list in Duda. Defensive: missing/unknown handled by
   * orderSections(); ignored in 'single' mode.
   */
  panelOrder?: string[];

  // ── General widget properties ───────────────────────────────────────────
  /** Toggle: show or hide the in-store strike-through price block. Default true. */
  showInstorePrice?: boolean;
  /** Text label above the in-store strike price. Default 'IN-STORE'. */
  instorePriceLabel?: string;
  /** Toggle: show a junk-fee disclaimer below unit pricing. Default false. */
  showJunkFeeDisclaimer?: boolean;
  /** Toggle: show "Only X left" urgency messages on eligible units. Default true. */
  showUrgencyMessage?: boolean;
  /** Toggle: show "Waitlist" CTA + "Limited Availability" label on waitlisted units. Default false. */
  enableWaitlist?: boolean;
  /** Toggle: show "Call" CTA on units flagged as call-only. Default false. */
  callOnLimitedAvailability?: boolean;
  /** Text for the primary CTA button. Default 'Select'. */
  ctaButtonCopy?: string;
}

export type { SectionKey } from './sections';
