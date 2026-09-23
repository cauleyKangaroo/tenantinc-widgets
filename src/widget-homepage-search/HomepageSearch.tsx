import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './HomepageSearch.css';
import { fetchLocationTree, type NavUnitType } from '@shared/propertyNav';
import { MapPinSolidIcon, SearchIcon } from '@shared/ui/icons';
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
  /** Recent resolved city searches kept on this device (0 disables, max 5). */
  historyLimit?: number;
  inEditor?: boolean | string;
  siteId?: string;
}

const DEFAULT_TYPES = 'Storage Type,Self Storage,Parking';

interface SearchTarget { kind: 'state' | 'city' | 'property'; label: string; haystack: string; href: string; types: NavUnitType[]; }
interface GeoTarget { lat: number; lng: number; target: SearchTarget; fallbackTarget: SearchTarget; types: NavUnitType[]; }
interface StorageTypeOption { value: NavUnitType; label: string; }
interface RecentSearch { label: string; href: string; savedAt: number; }
interface Coordinates { latitude: number; longitude: number; }
type InventoryStatus = 'loading' | 'loaded' | 'unavailable';
const STORAGE_TYPE_OPTIONS: StorageTypeOption[] = [
  { value: 'storage', label: 'Self Storage' },
  { value: 'parking', label: 'Parking' },
];
const HISTORY_KEY = 'ti.homepageSearch.recentCities';
const HISTORY_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
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
  accentColor,
  cardHeading = 'Find Storage Near Me',
  promotionText = '$1 Summer Move-In\nSpecial',
  promotionColor,
  promotionFontSize,
  promotionDisclaimer = '*All new rentals are subject to a $30 Admin Fee. Other fees like coverage may apply, select a space to see price details.',
  promotionDisclaimerColor,
  promotionDisclaimerFontSize,
  historyLimit = 5,
  inEditor,
  siteId,
}: HomepageSearchProps) {
  const editorPreview = boolProp(inEditor);
  const [q, setQ] = useState('');
  const [type, setType] = useState<NavUnitType | ''>('');
  const [selectedTarget, setSelectedTarget] = useState<SearchTarget>();
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
  const [pendingCoordinates, setPendingCoordinates] = useState<Coordinates>();
  const [resolvingCity, setResolvingCity] = useState(false);
  const safeHistoryLimit = Math.max(0, Math.min(5, Math.floor(historyLimit)));
  const [recent, setRecent] = useState<RecentSearch[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]') as Partial<RecentSearch>[];
      const cutoff = Date.now() - HISTORY_MAX_AGE;
      return Array.isArray(parsed) ? parsed.filter((x): x is RecentSearch =>
        typeof x.label === 'string' && typeof x.href === 'string' && typeof x.savedAt === 'number' && x.savedAt >= cutoff,
      ).slice(0, 5) : [];
    } catch { return []; }
  });
  const findRef = useRef<HTMLAnchorElement>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLFormElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const typeMenuRef = useRef<HTMLUListElement>(null);
  const typeOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suggestionsId = 'hs-city-suggestions';
  const typeListId = 'hs-storage-types';

  useEffect(() => {
    let cancelled = false;
    setInventoryStatus('loading');
    void fetchLocationTree('#04 homepage-search', {
      collectionName: propertiesCollection,
      basePath: searchUrl,
      cityBasePath: locationsUrl,
    }).then((tree) => {
      if (cancelled) return;
      if (!tree.length) {
        setInventoryStatus('unavailable');
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

  const match = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return undefined;
    if (selectedTarget?.label.toLowerCase() === needle && (!type || selectedTarget.types.includes(type))) return selectedTarget;
    // Exact state/city/facility names first. Address/ZIP and partial searches
    // then prefer a property over a broader city/state result.
    return filteredTargets.find((row) => row.label.toLowerCase() === needle)
      ?? filteredTargets.find((row) => row.kind === 'property' && row.haystack.includes(needle))
      ?? filteredTargets.find((row) => row.kind === 'city' && row.haystack.includes(needle))
      ?? filteredTargets.find((row) => row.haystack.includes(needle));
  }, [filteredTargets, q, selectedTarget, type]);

  // Suggestions are CITY-ONLY and therefore can never advertise a market the
  // Properties collection does not actually serve. Address/ZIP terms still find
  // the owning city because each city's haystack includes its facilities.
  const citySuggestions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return filteredTargets
      .filter((row) => row.kind === 'city' && row.haystack.includes(needle))
      .sort((a, b) => {
        const ae = a.label.toLowerCase() === needle ? -1 : 0;
        const be = b.label.toLowerCase() === needle ? -1 : 0;
        return ae - be || a.label.localeCompare(b.label);
      })
      .slice(0, 8);
  }, [filteredTargets, q]);

  const visibleSuggestions: SearchTarget[] = q.trim()
    ? citySuggestions
    : recent.slice(0, safeHistoryLimit).flatMap((item) => {
        const target = targets.find((row) => row.kind === 'city' && row.href === item.href)
          ?? geoTargets.find((row) => row.fallbackTarget.href === item.href)?.fallbackTarget;
        return target && (!type || target.types.includes(type)) ? [{ ...target, label: item.label }] : [];
      });
  const showLocationPanel = suggestionsOpen && (!q.trim() || visibleSuggestions.length > 0);

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
  }, [showLocationPanel, visibleSuggestions.length, q]);

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

  const remember = (target: SearchTarget) => {
    if (!safeHistoryLimit) return;
    const next = [
      { label: target.label, href: target.href, savedAt: Date.now() },
      ...recent.filter((item) => item.href !== target.href),
    ].slice(0, safeHistoryLimit);
    setRecent(next);
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const chooseCity = (target: SearchTarget) => {
    setQ(target.label);
    setSelectedTarget(target);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  };

  const nearestCandidate = (candidates: GeoTarget[], coords: Coordinates) => candidates.reduce((best, candidate) => (
    distanceSquared(coords.latitude, coords.longitude, candidate.lat, candidate.lng)
      < distanceSquared(coords.latitude, coords.longitude, best.lat, best.lng)
      ? candidate : best
  ));

  useEffect(() => {
    if (!pendingCoordinates || inventoryStatus === 'loading') return;
    const candidates = type ? geoTargets.filter((candidate) => candidate.types.includes(type)) : geoTargets;
    if (!candidates.length) {
      console.warn('[HomepageSearch] Current Location: no properties with usable coordinates');
      setPendingCoordinates(undefined);
      setLocating(false);
      return;
    }
    chooseCity(nearestCandidate(candidates, pendingCoordinates).target);
    setPendingCoordinates(undefined);
    setLocating(false);
  }, [pendingCoordinates, inventoryStatus, geoTargets, type]);

  const chooseCurrentLocation = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      console.warn('[HomepageSearch] Current Location: browser geolocation is unavailable');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = { latitude: coords.latitude, longitude: coords.longitude };
        const candidates = type ? geoTargets.filter((candidate) => candidate.types.includes(type)) : geoTargets;
        if (candidates.length) {
          chooseCity(nearestCandidate(candidates, current).target);
          setLocating(false);
          return;
        }
        if (inventoryStatus === 'loading') {
          setPendingCoordinates(current);
          return;
        }
        console.warn('[HomepageSearch] Current Location: no properties with usable coordinates');
        setLocating(false);
      },
      (error) => {
        console.warn(
          `[HomepageSearch] Current Location: geolocation failed (code ${error.code}: ${error.message || 'no browser message'})`,
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const navigateToNearbyCity = async () => {
    const query = q.trim();
    if (!query) {
      if (!openFindStorage()) console.warn('[HomepageSearch] Find Storage: no navigation bar answered the open request');
      return;
    }
    if (resolvingCity) return;
    setResolvingCity(true);
    try {
      const sessionToken = newSessionToken();
      const predictions = await fetchPlaceSuggestions(query, { types: '(cities)', sessionToken });
      const exact = predictions.find((p) => p.mainText.trim().toLowerCase() === query.toLowerCase()) ?? predictions[0];
      if (!exact) {
        if (!openFindStorage()) console.warn('[HomepageSearch] No city match and no navigation bar answered the open request');
        return;
      }
      const place = await fetchPlaceDetails(exact.placeId, { sessionToken });
      if (!place || place.lat == null || place.lng == null) {
        if (!openFindStorage()) console.warn('[HomepageSearch] City details were incomplete and no navigation bar answered the open request');
        return;
      }
      const candidates = type ? geoTargets.filter((candidate) => candidate.types.includes(type)) : geoTargets;
      if (!candidates.length) {
        if (!openFindStorage()) console.warn('[HomepageSearch] No geocoded properties and no navigation bar answered the open request');
        return;
      }
      const nearest = candidates.reduce((best, candidate) => (
        distanceSquared(place.lat!, place.lng!, candidate.lat, candidate.lng)
          < distanceSquared(place.lat!, place.lng!, best.lat, best.lng)
          ? candidate : best
      ));
      const destination = nearest.fallbackTarget;
      const url = new URL(destination.href, window.location.origin);
      if (type) url.searchParams.set('sl_types', type);
      remember({
        ...destination,
        label: place.address.city || exact.mainText || query,
        href: destination.href,
      });
      window.location.assign(editorSafeHref(url.pathname + url.search, editorPreview, siteId));
    } finally {
      setResolvingCity(false);
    }
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
  const promotionLines = text(promotionText).split(/\r?\n/);

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
            aria-activedescendant={activeSuggestion >= 0 ? `hs-city-option-${activeSuggestion}` : undefined}
            onFocus={() => { setTypeOpen(false); setSuggestionsOpen(true); }}
            onChange={(e) => { const v = e.target.value; setQ(v.charAt(0).toUpperCase() + v.slice(1)); setSelectedTarget(undefined); setSuggestionsOpen(true); setActiveSuggestion(-1); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visibleSuggestions.length) {
                e.preventDefault(); setSuggestionsOpen(true); setActiveSuggestion((i) => (i + 1) % visibleSuggestions.length);
              } else if (e.key === 'ArrowUp' && visibleSuggestions.length) {
                e.preventDefault(); setSuggestionsOpen(true); setActiveSuggestion((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1));
              } else if (e.key === 'Enter' && suggestionsOpen && activeSuggestion >= 0) {
                e.preventDefault(); chooseCity(visibleSuggestions[activeSuggestion]);
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
                      onClick={() => { setType(option.value); setSelectedTarget(undefined); setTypeOpen(false); setActiveType(-1); }}
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
          href={href ?? undefined}
          onClick={(e) => {
            if (!href) {
              e.preventDefault();
              void navigateToNearbyCity();
              return;
            }
            if (match) remember(match.kind === 'property'
              ? (filteredTargets.find((target) => target.kind === 'city' && target.haystack.includes(match.label.toLowerCase())) ?? match)
              : match);
          }}
        >
          <span className="hs-find-label">{ctaLabel}</span>
          <SearchIcon className="hs-search-icon" size={searchCard ? 24 : 22} />
        </a>
        </form>

        {showLocationPanel && (
          <ul
            ref={suggestionsRef}
            className={`hs-suggestions${suggestionsAbove ? ' hs-suggestions--above' : ''}`}
            id={suggestionsId}
            role="listbox"
            aria-label="Storage locations"
            style={suggestionsAbove ? ({ '--hs-suggestions-bottom': `${suggestionsBottom}px` } as React.CSSProperties) : undefined}
          >
          {!q.trim() && (
            <>
              <li role="presentation">
                <button className="hs-current-location" type="button" disabled={locating} onClick={chooseCurrentLocation}>
                  <MapPinSolidIcon size={24} />
                  <span>Current Location</span>
                </button>
              </li>
              {visibleSuggestions.length > 0 && (
                <li className="hs-history-head" role="presentation">Search History</li>
              )}
            </>
          )}
          {visibleSuggestions.map((city, index) => (
            <li key={`${city.label}-${city.href}`} role="presentation">
              <button
                id={`hs-city-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                className={`hs-suggestion${index === activeSuggestion ? ' hs-suggestion--active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseCity(city)}
              >
                <span>{city.label}</span>
              </button>
            </li>
          ))}
          </ul>
        )}

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
