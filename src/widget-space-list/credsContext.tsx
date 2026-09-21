// ===========================================================================
// The resolved endpoint, reaching the sidebar sections.
//
// Exactly the problem `companyContext` solves, for the other three values.
// `SectionAccordion`'s VISUALS map is a module-level record of pre-built
// elements (`<NearbySection />` with no props), so those sections cannot be
// handed anything by SpaceList directly — they would each fall back to
// config.json and query a DIFFERENT host than the unit list above them.
//
// Unlike companyContext there is no "not resolved yet" state to represent:
// creds come from props, synchronously, so the default is the build-time
// config rather than an empty string. A consumer that renders before the
// provider still asks a real host — the one this bundle was built with.
// ===========================================================================

import React, { createContext, useContext } from 'react';
import { FALLBACK_CREDS, type ApiCreds } from './apiCreds';

const ApiCredsContext = createContext<ApiCreds>(FALLBACK_CREDS);

export function ApiCredsProvider(
  { creds, children }: { creds: ApiCreds; children: React.ReactNode },
) {
  return <ApiCredsContext.Provider value={creds}>{children}</ApiCredsContext.Provider>;
}

/** The endpoint this Space List instance is scoped to. */
export function useApiCreds(): ApiCreds {
  return useContext(ApiCredsContext);
}
