import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './HomepageSearch.css';
import { useLocationPermission } from './useLocationPermission';
import { matchingCities, nearbyCities, milesBetween } from './searchResults';
import { fetchLocationTree, type NavUnitType } from '@shared/propertyNav';
import { MapPinSolidIcon, MapPinIcon, SearchIcon } from '@shared/ui/icons';
import { openFindStorage } from '@shared/findStorageBus';
import { fetchPlaceDetails, fetchPlaceSuggestions, newSessionToken } from '@shared/placesApi';

export interface HomepageSearchProps {
  /** Operator-selectable presentation. `search-bar` is the original horizontal
   *  control; `search-card` is the white Figma promotional card. `promo-card`
   *  is the card's former name, still accepted so a placement configured before
   *  the rename keeps rendering the card. */
  layout?: 'search-bar' | 'search-card' | 'promo-card';
  /** Placeholder for the location input (Figma: "City, ZIP or Address"). */
  searchPlaceholder?: string;
  /** Find button label (desktop Figma: "Find Storage"). */
  ctaLabel?: string;
  /** Editor/harness fallback when Properties inventory counts are unavailable. */
  storageTypes?: string;
  /** Show the Storage Type dropdown at all. */
  showStorageType?: boolean;
  /** Dynamic facility-page base path, before the property's full slug. */
  searchUrl?: string;
  /** Duda external collection containing property slugs and addresses. */
  propertiesCollection?: string;
  /** City/state location-page base path, e.g. "/locations". */
  locationsUrl?: string;
  /** Site map page; defaults to the all-properties page at /locations. */
  mapUrl?: string;
  /** Optional site-specific existing Places proxy; no client-side Google key. */
  placesBase?: string;
  /** Deprecated; retained so existing Duda widget configuration remains compatible. */
  locationsCount?: number;
  /** Deprecated; retained so existing Duda widget configuration remains compatible. */
  locationsLabel?: string;
  /** Search-button accent. Defaults to the theme's --color_2, then red. */
  accentColor?: string;
  /** Layout-2 card heading. */
  cardHeading?: string;
  /** Layout-2 accent promotion copy; wraps naturally to the available width. */
  promotionText?: string;
  /** Optional Layout-2 promotion color; defaults to the search accent/theme color. */
  promotionColor?: string;
  /** Optional Layout-2 promotion size in pixels; defaults to the Figma size. */
  promotionFontSize?: number | string;
  /** Layout-2 legal/disclosure copy below the promotion. */
  promotionDisclaimer?: string;
  /** Optional Layout-2 disclaimer color; defaults to the Figma text color. */
  promotionDisclaimerColor?: string;
  /** Optional Layout-2 disclaimer size in pixels; defaults to the Figma size. */
  promotionDisclaimerFontSize?: number | string;
  /** Deprecated: kept for existing Duda placements; history is no longer displayed. */
  historyLimit?: number;
  inEditor?: boolean | string;
  siteId?: string;
}

const DEFAULT_TYPES = 'Storage Type,Self Storage,Parking';
declare const __HB_DEV_HARNESS__: boolean;

interface SearchTarget { kind: 'state' | 'city' | 'property'; label: string; haystack: string; href: string; types: NavUnitType[]; distanceMiles?: number; }
interface GeoTarget { lat: number; lng: number; target: SearchTarget; fallbackTarget: SearchTarget; types: NavUnitType[]; }
interface StorageTypeOption { value: NavUnitType; label: string; }
interface Coordinates { latitude: number; longitude: number; }
type InventoryStatus = 'loading' | 'loaded' | 'unavailable';
const STORAGE_TYPE_OPTIONS: StorageTypeOption[] = [
  { value: 'storage', label: 'Self Storage' },
  { value: 'parking', label: 'Parking' },
];
const FALLBACK_BAKERSFIELD: SearchTarget = {
  kind: 'city',
  label: 'Bakersfield',
  haystack: 'bakersfield california 93307 101 mt vernon',
  href: '/locations/california/bakersfield',
  types: ['storage', 'parking'],
};
const FALLBACK_FULLERTON: SearchTarget = {
  kind: 'city',
  label: 'Fullerton',
  haystack: 'fullerton california 92831 999 s raymond storage outlet fullerton',
  href: '/property-landing-page--value-tiers-test/california/fullerton/storage-outlet-fullerton-340079520',
  types: ['storage', 'parking'],
};
const FALLBACK_TARGETS: SearchTarget[] = [
  { kind: 'state', label: 'California', haystack: 'california ca', href: '/locations/california', types: ['storage', 'parking'] },
  // Downloaded data plus the supplied URL examples: Bakersfield has multiple
  // facilities, while Fullerton currently has one.
  FALLBACK_BAKERSFIELD,
  FALLBACK_FULLERTON,
  { kind: 'property', label: 'Storage Outlet Fullerton', haystack: 'fullerton california 92831 999 s raymond storage outlet fullerton', href: '/property-landing-page--value-tiers-test/california/fullerton/storage-outlet-fullerton-340079520', types: ['storage', 'parking'] },
];
const EDITOR_GEO_TARGETS: GeoTarget[] = [
  {
    lat: 35.355421,
    lng: -118.966436,
    target: FALLBACK_BAKERSFIELD,
    fallbackTarget: { ...FALLBACK_BAKERSFIELD, href: '/locations/california/bakersfield' },
    types: ['storage', 'parking'],
  },
  {
    lat: 33.86093,
    lng: -117.90596,
    target: FALLBACK_FULLERTON,
    fallbackTarget: { ...FALLBACK_FULLERTON, href: '/locations/california/fullerton' },
    types: ['storage', 'parking'],
  },
];

function boolProp(value: boolean | string | undefined): boolean {
  return value === true || value === 'true';
}

function editorSafeHref(path: string, inEditor?: boolean, siteId?: string): string {
  let referrerPath = '';
  try { referrerPath = document.referrer ? new URL(document.referrer).pathname : ''; } catch { /* unavailable */ }
  const prefix = window.location.pathname.match(/^(\/home\/site\/[^/]+\/)/)?.[1]
    ?? referrerPath.match(/^(\/home\/site\/[^/]+\/)/)?.[1]
    ?? (inEditor && siteId ? `/home/site/${encodeURIComponent(siteId)}/` : '/');
  return prefix + path.replace(/^\/+/, '');
}

function Chevron() {
  return (
    <svg className="hs-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function distanceSquared(latA: number, lngA: number, latB: number, lngB: number): number {
  const latitudeScale = Math.cos(((latA + latB) / 2) * Math.PI / 180);
  const lat = latA - latB;
  const lng = (lngA - lngB) * latitudeScale;
  return lat * lat + lng * lng;
}

/**
 * Duda's content panel has no Number field, so a size arrives as TEXT — "64",
 * "64px", "" or null — and `Number.isFinite("64")` is false because it does not
 * coerce. parseFloat first, then accept only a positive finite result, so a
 * blank or mistyped field falls back to the Figma size instead of emitting
 * `NaNpx` (which the browser drops, silently losing the whole declaration).
 */
function px(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? `${value}px` : '';
  // Match the WHOLE value, not a numeric prefix. `parseFloat` alone reads
  // "64garbage" as 64 and "6 4" as 6, applying a size the operator never typed
  // while this helper claims to reject mistyped input. Digits with an optional
  // decimal and an optional `px` is the entire accepted form.
  const text = String(value ?? '').trim();
  if (!/^\d*\.?\d+\s*(px)?$/i.test(text)) return '';
  const n = parseFloat(text);
  return Number.isFinite(n) && n > 0 ? `${n}px` : '';
}

/** Unfilled Duda fields arrive as null, and a space-only value is not a colour. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Only declare the custom property when there is a value; otherwise the CSS
 *  fallback in `var(--x, fallback)` is what should win. */
function cssVar(name: string, value: string): Record<string, string> {
  return value ? { [name]: value } : {};
}

export function HomepageSearch({
  layout = 'search-bar',
  searchPlaceholder = 'City, ZIP or Address',
  ctaLabel = 'Find Storage',
  storageTypes = DEFAULT_TYPES,
  showStorageType = true,
  searchUrl = '/property-landing-page--value-tiers-test',
  propertiesCollection = 'Properties',
  locationsUrl = '/locations',
  mapUrl = '/locations',
  placesBase,
  accentColor,
  cardHeading = 'Find Storage Near Me',
  promotionText = '$1 Summer Move-In\nSpecial',
  promotionColor,
  promotionFontSize,
  promotionDisclaimer = '*All new rentals are subject to a $30 Admin Fee. Other fees like coverage may apply, select a space to see price details.',
  promotionDisclaimerColor,
  promotionDisclaimerFontSize,
  inEditor,
  siteId,
}: HomepageSearchProps) {
  const editorPreview = boolProp(inEditor);
  const [q, setQ] = useState('');
  const [type, setType] = useState<NavUnitType | ''>('');
  const [targets, setTargets] = useState<SearchTarget[]>(FALLBACK_TARGETS);
  // Editor/harness has no published-site dmAPI, so use representative fixture
  // coordinates there only. Published pages never fall back to these rows.
  const [geoTargets, setGeoTargets] = useState<GeoTarget[]>(() => editorPreview ? EDITOR_GEO_TARGETS : []);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>('loading');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsAbove, setSuggestionsAbove] = useState(false);
  const [suggestionsBottom, setSuggestionsBottom] = useState(0);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeAbove, setTypeAbove] = useState(false);
  const [activeType, setActiveType] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [locationDenied, setLocationDenied] = useLocationPermission();
  const [pendingCoordinates, setPendingCoordinates] = useState<Coordinates>();
  const locationRequest = useRef(0);
  const [nearby, setNearby] = useState<{ query: string; type: string; status: 'loading' | 'ready' | 'error'; rows: SearchTarget[]; place?: string }>();
  const findRef = useRef<HTMLAnchorElement>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLFormElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const typeMenuRef = useRef<HTMLUListElement>(null);
  const typeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const instanceId = React.useId();
  const suggestionsId = `${instanceId}-cities`;
  const typeListId = `${instanceId}-types`;

  useEffect(() => {
    let cancelled = false;
    setInventoryStatus('loading');
    void fetchLocationTree('#04 homepage-search', {
      collectionName: propertiesCollection,
      basePath: searchUrl,
      cityBasePath: locationsUrl,
      readAllPages: true,
    }).then((tree) => {
      if (cancelled) return;
      if (!tree.length) {
        if (__HB_DEV_HARNESS__ && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
          setTargets(FALLBACK_TARGETS);
          setGeoTargets(EDITOR_GEO_TARGETS);
          setInventoryStatus('loaded');
          return;
        }
        setTargets([]);
        setGeoTargets([]);
        setInventoryStatus('loaded');
        return;
      }
      const mapped: SearchTarget[] = [];
      const mappedGeo: GeoTarget[] = [];
      const cityBase = locationsUrl.trim().replace(/\/+$/, '') || '/locations';
      for (const state of tree) {
        const stateTypes = [...new Set(state.cities.flatMap((city) => city.properties.flatMap((property) => property.vacantUnitTypes)))];
        mapped.push({ kind: 'state', label: state.label, haystack: `${state.label} ${state.key}`.toLowerCase(), href: state.href, types: stateTypes });
        for (const city of state.cities) {
          const cityHref = city.properties.length === 1 ? city.properties[0].href : city.href;
          const facilityTerms = city.properties.flatMap((property) => [property.label, property.address, property.street, property.zip]).join(' ');
          const cityTypes = [...new Set(city.properties.flatMap((property) => property.vacantUnitTypes))];
          const cityTarget: SearchTarget = { kind: 'city', label: city.label, haystack: `${city.label} ${state.label} ${city.key} ${facilityTerms}`.toLowerCase(), href: cityHref, types: cityTypes };
          const cityPageTarget: SearchTarget = { ...cityTarget, href: `${cityBase}/${state.key}/${city.key}` };
          mapped.push(cityTarget);
          for (const property of city.properties) {
            mapped.push({
              kind: 'property',
              label: property.label,
              haystack: [property.label, property.address, property.street, property.city, property.state, property.zip, city.label, state.label].join(' ').toLowerCase(),
              href: property.href,
              types: property.vacantUnitTypes,
            });
            if (property.lat != null && property.lng != null
              && Number.isFinite(property.lat) && property.lat >= -90 && property.lat <= 90
              && Number.isFinite(property.lng) && property.lng >= -180 && property.lng <= 180
              && (property.lat !== 0 || property.lng !== 0)) {
              mappedGeo.push({
                lat: property.lat,
                lng: property.lng,
                target: cityTarget,
                fallbackTarget: cityPageTarget,
                types: property.vacantUnitTypes,
              });
            }
          }
        }
      }
      setTargets(mapped);
      setGeoTargets(mappedGeo);
      setInventoryStatus('loaded');
    }).catch((error) => {
      if (cancelled) return;
      if (__HB_DEV_HARNESS__ && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
        setTargets(FALLBACK_TARGETS);
        setGeoTargets(EDITOR_GEO_TARGETS);
        setInventoryStatus('loaded');
        return;
      }
      console.warn('[HomepageSearch] Locations could not be loaded', error);
      setInventoryStatus('unavailable');
    });
    return () => { cancelled = true; };
  }, [propertiesCollection, searchUrl, locationsUrl]);

  const parts = storageTypes.split(',').map((s) => s.trim()).filter(Boolean);
  const typePlaceholder = parts[0] ?? 'Storage Type';
  const availableTypes = new Set(targets.flatMap((target) => target.types));
  const collectionTypeOptions = STORAGE_TYPE_OPTIONS.filter((option) => availableTypes.has(option.value));
  const typeOptions = inventoryStatus === 'loaded' ? collectionTypeOptions : STORAGE_TYPE_OPTIONS;
  const selectedTypeLabel = typeOptions.find((option) => option.value === type)?.label;
  const selectedTypeAvailable = !type || availableTypes.has(type);
  const filteredTargets = useMemo(
    () => (type ? targets.filter((target) => target.types.includes(type)) : targets),
    [targets, type],
  );

  useEffect(() => {
    if (inventoryStatus === 'loaded' && !selectedTypeAvailable) setType('');
  }, [inventoryStatus, selectedTypeAvailable]);

  // Suggestions are CITY-ONLY and therefore can never advertise a market the
  // Properties collection does not actually serve. Address/ZIP terms still find
  // the owning city because each city's haystack includes its facilities.
  const citySuggestions = useMemo(() => {
    return matchingCities(filteredTargets.filter(row => row.kind === 'city'), q);
  }, [filteredTargets, q]);
  const nearbyCurrent = nearby?.query === q.trim() && nearby.type === type ? nearby : undefined;
  const visibleSuggestions = inventoryStatus === 'loaded'
    ? (citySuggestions.length ? citySuggestions : nearbyCurrent?.status === 'ready' ? nearbyCurrent.rows : []) : [];
  const match = visibleSuggestions[activeSuggestion >= 0 ? activeSuggestion : 0];
  const showCurrentLocation = !locationDenied;
  const showLocationPanel = suggestionsOpen;
  const searching = inventoryStatus === 'loading' || (inventoryStatus === 'loaded' && q.trim().length >= 3 && !citySuggestions.length && (!nearbyCurrent || nearbyCurrent.status === 'loading'));
  const lookupError = inventoryStatus === 'unavailable' || nearbyCurrent?.status === 'error';
  useEffect(() => {
    if (showLocationPanel && activeSuggestion >= 0) {
      document.getElementById(`${instanceId}-city-${activeSuggestion}`)?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeSuggestion, instanceId, showLocationPanel]);

  useEffect(() => {
    setActiveSuggestion(-1);
    setNearby(undefined);
    const query = q.trim();
    if (!suggestionsOpen || inventoryStatus !== 'loaded' || citySuggestions.length || query.length < 3) return;
    const controller = new AbortController();
    let disposed = false;
    setNearby({ query, type, status: 'loading', rows: [] });
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (!disposed) setNearby({ query, type, status: 'error', rows: [] });
    }, 8400);
    const timer = window.setTimeout(() => {
      void (async () => {
        const sessionToken = newSessionToken();
        const predictions = await fetchPlaceSuggestions(query, { base: placesBase, types: 'geocode', sessionToken, signal: controller.signal, strict: true });
        // A fragment such as "San" must not silently resolve to the first city.
        const normalizedQuery = query.toLowerCase().replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ');
        const prediction = predictions.find(p => {
          const description = p.description.trim().toLowerCase().replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ');
          return description === normalizedQuery || description.startsWith(`${normalizedQuery},`)
            || (!query.includes(',') && p.mainText.trim().toLowerCase() === normalizedQuery);
        });
        if (!prediction) return { rows: [] as SearchTarget[], place: undefined };
        const place = await fetchPlaceDetails(prediction.placeId, { base: placesBase, sessionToken, signal: controller.signal, strict: true });
        if (!place || place.lat == null || place.lng == null || Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) throw new Error('City coordinates unavailable');
        const candidates = type ? geoTargets.filter(candidate => candidate.types.includes(type)) : geoTargets;
        return { rows: nearbyCities(candidates, place.lat, place.lng), place: place.address.city || prediction.mainText };
      })().then(result => {
        if (!disposed && !controller.signal.aborted) setNearby({ query, type, status: 'ready', ...result });
      }).catch(() => {
        if (!disposed && !controller.signal.aborted) setNearby({ query, type, status: 'error', rows: [] });
      }).finally(() => window.clearTimeout(timeout));
    }, 400);
    return () => { disposed = true; controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout); };
  }, [q, type, inventoryStatus, citySuggestions, geoTargets, suggestionsOpen, placesBase]);

  useLayoutEffect(() => {
    if (!showLocationPanel) {
      setSuggestionsAbove(false);
      return undefined;
    }

    const placePanel = () => {
      const bar = barRef.current;
      const panel = suggestionsRef.current;
      const container = panelContainerRef.current;
      if (!bar || !panel || !container) return;
      const barRect = bar.getBoundingClientRect();
      const panelHeight = panel.getBoundingClientRect().height;
      const below = window.innerHeight - barRect.bottom - 8;
      const above = barRect.top - 8;
      setSuggestionsBottom(container.getBoundingClientRect().bottom - barRect.top + 8);
      setSuggestionsAbove(panelHeight > below && above > below);
    };

    placePanel();
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [showLocationPanel, visibleSuggestions.length, q, showCurrentLocation, searching, lookupError]);

  useLayoutEffect(() => {
    if (!typeOpen) {
      setTypeAbove(false);
      return undefined;
    }

    const placeMenu = () => {
      const bar = barRef.current;
      const menu = typeMenuRef.current;
      if (!bar || !menu) return;
      const barRect = bar.getBoundingClientRect();
      const menuHeight = menu.getBoundingClientRect().height;
      const below = window.innerHeight - barRect.bottom - 8;
      const above = barRect.top - 8;
      setTypeAbove(menuHeight > below && above > below);
    };

    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [typeOpen, typeOptions.length]);

  useEffect(() => {
    if (typeOpen && activeType >= 0) typeOptionRefs.current[activeType]?.focus();
  }, [typeOpen, activeType]);

  const chooseCity = useCallback((target: SearchTarget) => {
    setQ(target.label);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  }, []);

  const cancelCurrentLocation = () => {
    locationRequest.current += 1;
    setPendingCoordinates(undefined);
    setLocating(false);
    setLocationNotice('');
  };

  // Only explicit suggestion selection navigates. Invalid destinations still
  // populate the input so Find can use its nearby-city fallback.
  const navigateToSuggestion = (target: SearchTarget) => {
    cancelCurrentLocation();
    chooseCity(target);
    let url: URL;
    try { url = new URL(target.href, window.location.origin); } catch { return; }
    if (url.origin !== window.location.origin) return;
    if (type) url.searchParams.set('sl_types', type);
    window.location.assign(editorSafeHref(url.pathname + url.search, editorPreview, siteId));
  };

  // Current Location goes to the nearest location the same way a picked
  // suggestion does. Through a ref so the deferred path below (property list
  // still loading) always calls the latest version. Typing or picking a
  // suggestion cancels a pending lookup first, so this never fires late.
  const navigateRef = useRef(navigateToSuggestion);
  navigateRef.current = navigateToSuggestion;

  const nearestCandidate = (candidates: GeoTarget[], coords: Coordinates) => candidates.reduce((best, candidate) => (
    distanceSquared(coords.latitude, coords.longitude, candidate.lat, candidate.lng)
      < distanceSquared(coords.latitude, coords.longitude, best.lat, best.lng)
      ? candidate : best
  ));

  useEffect(() => {
    if (!pendingCoordinates || inventoryStatus === 'loading') return;
    const candidates = geoTargets.filter(candidate => (!type || candidate.types.includes(type))
      && milesBetween(pendingCoordinates.latitude, pendingCoordinates.longitude, candidate.lat, candidate.lng) <= 200);
    if (!candidates.length) {
      console.warn('[HomepageSearch] Current Location: no properties with usable coordinates');
      setPendingCoordinates(undefined);
      setLocating(false);
      setLocationNotice('No locations within 200 miles of your current location.');
      return;
    }
    navigateRef.current(nearestCandidate(candidates, pendingCoordinates).target);
    setPendingCoordinates(undefined);
    setLocating(false);
  }, [pendingCoordinates, inventoryStatus, geoTargets, type]);

  const chooseCurrentLocation = () => {
    if (locating || locationDenied) return;
    setLocationNotice('');
    if (!navigator.geolocation) {
      console.warn('[HomepageSearch] Current Location: browser geolocation is unavailable');
      setLocationNotice('Your location could not be found. Please try again or enter a city.');
      return;
    }
    setLocating(true);
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request !== locationRequest.current) return;
        const current = { latitude: coords.latitude, longitude: coords.longitude };
        const candidates = geoTargets.filter(candidate => (!type || candidate.types.includes(type))
          && milesBetween(current.latitude, current.longitude, candidate.lat, candidate.lng) <= 200);
        if (candidates.length) {
          navigateRef.current(nearestCandidate(candidates, current).target);
          setLocating(false);
          return;
        }
        if (inventoryStatus === 'loading') {
          setPendingCoordinates(current);
          return;
        }
        console.warn('[HomepageSearch] Current Location: no properties with usable coordinates');
        setLocating(false);
        setLocationNotice('No locations within 200 miles of your current location.');
      },
      (error) => {
        if (request !== locationRequest.current) return;
        if (error.code === 1) setLocationDenied(true);
        else setLocationNotice('Your location could not be found. Please try again or enter a city.');
        console.warn(
          `[HomepageSearch] Current Location: geolocation failed (code ${error.code}: ${error.message || 'no browser message'})`,
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  // The Properties collection already produced the correct state/city/facility
  // target according to the one-vs-many rule. No generic results page is invented.
  const href = (() => {
    if (!match) return undefined;
    let url: URL;
    try { url = new URL(match.href, window.location.origin); } catch { return undefined; }
    if (url.origin !== window.location.origin) return undefined;
    if (type) url.searchParams.set('sl_types', type);
    return editorSafeHref(url.pathname + url.search, editorPreview, siteId);
  })();
  const mapHref = (() => {
    if (!mapUrl) return undefined;
    try {
      const url = new URL(mapUrl, window.location.origin);
      return url.origin === window.location.origin ? editorSafeHref(url.pathname + url.search, editorPreview, siteId) : undefined;
    } catch { return undefined; }
  })();

  const locationsHref = (() => {
    const locationsPath = locationsUrl.trim().replace(/\/+$/, '') || '/locations';
    return editorSafeHref(`/${locationsPath.replace(/^\/+/, '')}`, editorPreview, siteId);
  })();
  // One destination for both a click and the link's own href (modifier-click, new tab).
  const findTarget = href && (activeSuggestion >= 0 || q.trim()) ? match : undefined;
  const findHref = findTarget ? href
    // Loading and service failures are not confirmed empty results.
    : !q.trim() || (!searching && !lookupError && inventoryStatus === 'loaded') ? locationsHref
      : undefined;

  const submitSearch = () => {
    if (findTarget) navigateToSuggestion(findTarget);
    else if (findHref) window.location.assign(findHref);
    else setSuggestionsOpen(true);
  };

  const style = {
    ...cssVar('--hs-accent', text(accentColor)),
    ...cssVar('--hs-promotion-color', text(promotionColor)),
    ...cssVar('--hs-promotion-font-size', px(promotionFontSize)),
    ...cssVar('--hs-promotion-disclaimer-color', text(promotionDisclaimerColor)),
    ...cssVar('--hs-promotion-disclaimer-font-size', px(promotionDisclaimerFontSize)),
  } as React.CSSProperties;
  // `promo-card` was this layout's name before it was renamed, and a Duda
  // placement may still have it saved. Normalize rather than test both: the
  // root class is built from this value, so an un-normalized 'promo-card' would
  // emit `hs--promo-card`, which no longer has any CSS — a silently unstyled
  // search bar instead of the card the operator configured.
  // Only two layouts are real, and the value becomes a class name, so anything
  // else is normalized to the default rather than emitted. An unfilled Duda
  // field arrives as null, which would otherwise render `hs--null`.
  const resolvedLayout = layout === 'search-card' || layout === 'promo-card'
    ? 'search-card'
    : 'search-bar';
  const searchCard = resolvedLayout === 'search-card';
  const promotionLines = text(promotionText).split(/\r?\n|<br\s*\/?>/i);

  return (
    <div
      className={`hs hs--${resolvedLayout}`}
      style={style}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setSuggestionsOpen(false);
          setTypeOpen(false);
        }
      }}
    >
      <div ref={panelContainerRef} className={searchCard ? 'hs-card' : 'hs-search-layout'}>
        {searchCard && <h2 className="hs-card-heading">{cardHeading}</h2>}
        <form ref={barRef} className="hs-bar" onSubmit={(e) => { e.preventDefault(); findRef.current?.click(); }}>
        <div className="hs-field">
          <input
            className="hs-input"
            type="text"
            value={q}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showLocationPanel}
            aria-controls={suggestionsId}
            aria-activedescendant={showLocationPanel && activeSuggestion >= 0 && visibleSuggestions[activeSuggestion] ? `${instanceId}-city-${activeSuggestion}` : undefined}
            onFocus={() => { setTypeOpen(false); setSuggestionsOpen(true); }}
            onChange={(e) => { cancelCurrentLocation(); const v = e.target.value; setQ(v.charAt(0).toUpperCase() + v.slice(1)); setSuggestionsOpen(true); setActiveSuggestion(-1); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visibleSuggestions.length) {
                e.preventDefault(); setSuggestionsOpen(true); setActiveSuggestion((i) => (i + 1) % visibleSuggestions.length);
              } else if (e.key === 'ArrowUp' && visibleSuggestions.length) {
                e.preventDefault(); setSuggestionsOpen(true); setActiveSuggestion((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                submitSearch();
              } else if (e.key === 'Escape') {
                e.preventDefault(); setSuggestionsOpen(false); setActiveSuggestion(-1);
              }
            }}
          />
        </div>

        {showStorageType && (
          <div className="hs-type">
            <button
              className="hs-type-trigger"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={typeOpen}
              aria-controls={typeListId}
              onClick={() => { setSuggestionsOpen(false); setTypeOpen((open) => !open); setActiveType(-1); }}
              onKeyDown={(e) => {
                if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && typeOptions.length) {
                  e.preventDefault();
                  setSuggestionsOpen(false);
                  setTypeOpen(true);
                  setActiveType(e.key === 'ArrowDown' ? 0 : typeOptions.length - 1);
                } else if (e.key === 'Escape') {
                  setTypeOpen(false);
                }
              }}
            >
              <span className="hs-type-label">{selectedTypeLabel || typePlaceholder}</span>
              <Chevron />
            </button>
            {typeOpen && (
              <ul
                className={typeAbove ? 'hs-type-menu hs-type-menu--above' : 'hs-type-menu'}
                ref={typeMenuRef}
                id={typeListId}
                role="listbox"
                aria-label={typePlaceholder}
              >
                {typeOptions.map((option, index) => (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={type === option.value}
                      ref={(node) => { typeOptionRefs.current[index] = node; }}
                      className={index === activeType ? 'hs-type-option hs-type-option--active' : 'hs-type-option'}
                      onMouseEnter={() => setActiveType(index)}
                      onClick={() => { setType(option.value); setTypeOpen(false); setActiveType(-1); }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault(); setActiveType((index + 1) % typeOptions.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault(); setActiveType((index - 1 + typeOptions.length) % typeOptions.length);
                        } else if (e.key === 'Escape') {
                          e.preventDefault(); setTypeOpen(false);
                        }
                      }}
                    >{option.label}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <a
          ref={findRef}
          className="hs-find"
          href={findHref}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            submitSearch();
          }}
        >
          <span className="hs-find-label">{ctaLabel}</span>
          <SearchIcon className="hs-search-icon" size={searchCard ? 24 : 22} />
        </a>
        </form>

        {showLocationPanel && (
          <div
            ref={suggestionsRef}
            className={`hs-suggestions${suggestionsAbove ? ' hs-suggestions--above' : ''}${!searching && visibleSuggestions.length === 0 ? ' hs-suggestions--empty' : ''}`}
            style={suggestionsAbove ? ({ '--hs-suggestions-bottom': `${suggestionsBottom}px` } as React.CSSProperties) : undefined}
          >
          {locationNotice && <div className="hs-search-status">{locationNotice}</div>}
          {!q.trim() && (
            <>
              {showCurrentLocation && (
              <div>
                <button
                  className="hs-current-location"
                  type="button"
                  disabled={locating}
                  onPointerDown={(e) => {
                    // Safari can report null relatedTarget when tapping this
                    // button. Keep input focus so blur cannot remove the menu
                    // before the subsequent click requests geolocation.
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={chooseCurrentLocation}
                >
                  <MapPinSolidIcon size={24} />
                  <span>Current Location</span>
                </button>
              </div>
              )}
            </>
          )}
          {inventoryStatus === 'loaded' && !q.trim() && (
            <div className="hs-history-head">Our Locations ({citySuggestions.length})</div>
          )}
          {!!q.trim() && !citySuggestions.length && nearbyCurrent?.status === 'ready' && visibleSuggestions.length > 0 && (
            <div className="hs-history-head">{visibleSuggestions.length} cities near {nearbyCurrent.place}</div>
          )}
          {searching ? <div className="hs-search-status">Searching…</div>
            : lookupError ? <div className="hs-search-status">Search is temporarily unavailable. Please try again.</div>
              : visibleSuggestions.length === 0 && <div className="hs-search-status hs-search-empty">
                <MapPinIcon size={18} />
                <span>No Facilities Found</span>
              </div>}
          {!searching && visibleSuggestions.length === 0 && (
            <div>
              {mapHref ? <a className="hs-map-link" href={mapHref}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m8 8-5 2v11l5-2 8 2 5-2V8l-3 1M8 14v5m8-5v7" />
                  <path d="M17 6c0 4-5 8-5 8S7 10 7 6a5 5 0 0 1 10 0Z" />
                  <circle cx="12" cy="6" r="1.5" />
                </svg>
                <span>View Map</span>
              </a>
                : <button className="hs-suggestion" type="button" onClick={() => {
                  if (openFindStorage()) setSuggestionsOpen(false);
                  else setQ('');
                }}>Browse Locations</button>}
            </div>
          )}
          <ul className="hs-city-options" id={suggestionsId} role="listbox" aria-label="Storage locations">
          {visibleSuggestions.map((city, index) => (
            <li key={`${city.label}-${city.href}`} role="presentation">
              <button
                id={`${instanceId}-city-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                className={`hs-suggestion${index === activeSuggestion ? ' hs-suggestion--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => navigateToSuggestion(city)}
              >
                <span>{city.label}</span>
                {city.distanceMiles != null && <span className="hs-distance">{Math.round(city.distanceMiles)} miles</span>}
              </button>
            </li>
          ))}
          </ul>
          </div>
        )}
        <span className="hs-results-announcement" role="status" aria-live="polite" aria-atomic="true">
          {showLocationPanel ? searching ? 'Searching locations' : lookupError ? 'Search temporarily unavailable' : `${visibleSuggestions.length} cities found` : ''}
        </span>

        {searchCard && (
          <div className="hs-promotion">
            <p className="hs-promotion-title">
              {promotionLines.map((line, index) => (
                <span
                  className={promotionLines.length > 1 && index === promotionLines.length - 1
                    ? 'hs-promotion-final-line'
                    : undefined}
                  key={`${index}-${line}`}
                >
                  {line || '\u00a0'}
                </span>
              ))}
            </p>
            {promotionDisclaimer && <p className="hs-promotion-disclaimer">{promotionDisclaimer}</p>}
          </div>
        )}
      </div>

    </div>
  );
}
