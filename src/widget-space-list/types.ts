// ---------------------------------------------------------------------------
// Space List widget — data + prop types
//
// The backend developer's main concern is the `Unit` shape below: this is the
// contract every component renders against. Swap the static DEMO_UNITS in
// data.ts for a Hummingbird-backed Unit[] and nothing in the components needs
// to change. See HANDOFF.md.
// ---------------------------------------------------------------------------

export type SpaceType = 'storage' | 'parking';
/** @deprecated — use SpaceType[] in FilterState.types instead */
export type FilterType = SpaceType;

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
  /** Number of vacant (available to rent) units in this tier */
  vacantCount?: number;
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
  /** Promotion categories this unit qualifies for — matched against the Promotions filter checkboxes */
  promotions?: string[];
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

export interface SpaceListProps {
  /** Radio in the content panel: Grid View / List View */
  layoutMode?: 'grid' | 'list';
  /** @deprecated Filters now always render as a top bar; this is ignored. */
  filterPosition?: 'left' | 'top' | 'right';
  /** Dropdown in the content panel: which side the accordion panel sits on. Default 'right'. */
  apLocation?: 'left' | 'right';

  // ── Duda runtime context (forwarded from `data` in the Duda JS tab, NOT
  //    content-panel inputs). Used to gate the editor-only reorder UI and to
  //    key this instance's saved accordion config (siteId + elementId). ───────
  /** True only inside the Duda editor — gates the floating "Reorder" button. */
  inEditor?: boolean;
  /** Duda's per-page unique element id (data.elementId). */
  elementId?: string;
  /** Duda's site id (data.siteId). */
  siteId?: string;
  /**
   * URL of the PHP write-proxy that persists the accordion arrangement to the
   * Duda collection. Set in the Duda JS tab so it can change without a rebuild.
   * When absent (dev harness / not configured) Save applies locally only.
   */
  configApiUrl?: string;
  /** Name of the Duda collection holding the arrangement. Default 'accordionConfig'. */
  configCollection?: string;

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

  // ── AP section visibility toggles ──────────────────────────────────────────
  isReviews?:   boolean;
  isFeatures?:  boolean;
  isNearby?:    boolean;
  isSizeGuide?: boolean;
  isBlog?:      boolean;
  isStore?:     boolean;
  isNotes?:     boolean;
  isFAQ?:       boolean;
  isHours?:     boolean;
}

