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
