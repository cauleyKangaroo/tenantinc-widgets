// ===========================================================================
// The property this Space List instance is rendering.
//
// On a Duda dynamic page the id arrives as a prop from the JS tab and differs per
// page, so the sidebar sections cannot read it from config.json. They also can't
// take it as a prop: `SectionAccordion`'s VISUALS map is a module-level record of
// pre-built elements, so there is nowhere to pass one in. Context threads it
// through without restructuring that map.
//
// The default is deliberately EMPTY, not cfg.propertyId. A stale configured id is
// worse than none: it belongs to a different company on this site, so a consumer
// would filter against a property that doesn't exist and silently show nothing.
// Consumers must decide for themselves what "no property bound" means.
// ===========================================================================

import React, { createContext, useContext } from 'react';
import type { PropertyExtras } from './propertyApi';

const PropertyIdContext = createContext<string>('');

export function PropertyIdProvider(
  { propertyId, children }: { propertyId: string; children: React.ReactNode },
) {
  return <PropertyIdContext.Provider value={propertyId}>{children}</PropertyIdContext.Provider>;
}

/** The bound property id, or '' when this instance has none. */
export function usePropertyId(): string {
  return useContext(PropertyIdContext);
}

// ---------------------------------------------------------------------------
// The same property's loaded details (name, address, phones, hours), for UI
// that lives inside a unit card — the waitlist confirmation — and so has no
// route to SpaceList's `propertyExtras` state. null until the sidebar's
// properties call lands, or when it fails; consumers render without it.
// ---------------------------------------------------------------------------

const PropertyExtrasContext = createContext<PropertyExtras | null>(null);

export function PropertyExtrasProvider(
  { extras, children }: { extras: PropertyExtras | null; children: React.ReactNode },
) {
  return <PropertyExtrasContext.Provider value={extras}>{children}</PropertyExtrasContext.Provider>;
}

export function usePropertyExtras(): PropertyExtras | null {
  return useContext(PropertyExtrasContext);
}

// ---------------------------------------------------------------------------
// Where the sidebar's Reviews section fetches live reviews: the proxy base
// (the site's `login_api_base`) and Duda's site id, which the proxy's reviews
// routes insist on. Both arrive as SpaceList props; the section sits in the
// module-level VISUALS map (see above), so they travel by context.
// ---------------------------------------------------------------------------

export interface ReviewsProxy { siteId: string; base: string }
const ReviewsProxyContext = createContext<ReviewsProxy>({ siteId: '', base: '' });

export function ReviewsProxyProvider(
  { siteId, base, children }: { siteId: string; base: string; children: React.ReactNode },
) {
  const value = React.useMemo(() => ({ siteId, base }), [siteId, base]);
  return <ReviewsProxyContext.Provider value={value}>{children}</ReviewsProxyContext.Provider>;
}

export function useReviewsProxy(): ReviewsProxy {
  return useContext(ReviewsProxyContext);
}
