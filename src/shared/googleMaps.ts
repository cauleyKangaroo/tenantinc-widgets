// ---------------------------------------------------------------------------
// Google Maps JavaScript API loader.
//
// WHY THIS EXISTS, GIVEN WE ALREADY HAVE MAPS
//
// #03's map and @shared/NearbyMap both use the keyless `output=embed` iframe.
// That is the right call for NearbyMap — its price pins are projected on top,
// so the iframe is deliberately pointer-events:none to stop panning drifting
// them out of alignment.
//
// But an iframe map REQUIRES TWO FINGERS TO PAN on a touch device. One finger
// scrolls the page. That behaviour lives inside Google's frame and no CSS of
// ours can reach it, which is why "grab and move the map" could not be fixed
// without changing approach. `gestureHandling: 'greedy'` on a real map instance
// is the switch that makes one finger pan, and it only exists on the JS API.
//
// THE KEY IS BROWSER-VISIBLE, AND THAT IS NORMAL
//
// The Maps JS API runs in the page and authenticates from the page, so its key
// cannot be proxied — tenant-proxy hides GOOGLE_API_KEY for Places precisely
// because that one can be billed by anyone who sees it. This must therefore be
// a SEPARATE key, restricted by HTTP referrer to the site's domains, where
// being public is the intended design. Never reuse the proxy's key here.
//
// Fails soft: no key, a blocked script, a CSP refusal — all resolve to null and
// the caller keeps its iframe, which still pans on desktop.
// ---------------------------------------------------------------------------

/** Minimal surface we use — typing the whole API would be noise. */
export interface GMapsApi {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => unknown;
  LatLng: new (lat: number, lng: number) => unknown;
}

export interface GMap {
  setCenter(pos: { lat: number; lng: number }): void;
  setZoom(z: number): void;
  getZoom(): number | undefined;
  panTo(pos: { lat: number; lng: number }): void;
}

declare global {
  interface Window {
    google?: { maps?: GMapsApi };
    [k: string]: unknown;
  }
}

/** One load per page however many widgets ask — the API throws on a second. */
let loader: Promise<GMapsApi | null> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<GMapsApi | null> {
  if (loader) return loader;

  const key = (apiKey ?? '').trim();
  if (!key) return Promise.resolve(null);

  loader = new Promise<GMapsApi | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    // Another widget — or the host page — may already have it.
    if (window.google?.maps) { resolve(window.google.maps); return; }

    /*
     * A uniquely named global callback rather than the `load` event: the script
     * resolves further modules after it executes, so `load` can fire before
     * `google.maps` is usable. The name is random so two widgets initialising
     * together cannot overwrite each other's.
     */
    const cbName = `__gmapsReady_${Math.random().toString(36).slice(2)}`;
    const done = (api: GMapsApi | null) => {
      delete window[cbName];
      resolve(api);
    };
    window[cbName] = () => done(window.google?.maps ?? null);

    const tag = document.createElement('script');
    tag.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cbName}&loading=async`;
    tag.async = true;
    tag.addEventListener('error', () => {
      console.warn('[googleMaps] the Maps JS API could not be loaded — keeping the embedded map.');
      done(null);
    });
    document.head.appendChild(tag);

    /*
     * A stop, because `error` does not fire for every failure: a key rejected
     * for referrer restrictions loads the script and then complains in the
     * console without ever calling back. Without this the caller would wait for
     * a map that is never coming.
     */
    window.setTimeout(() => { if (window[cbName]) done(window.google?.maps ?? null); }, 8000);
  });

  return loader;
}
