import React, { useEffect, useMemo, useRef, useState } from 'react';
import './HomepageSearch.css';
import { fetchLocationTree } from '@shared/propertyNav';

export interface HomepageSearchProps {
  /** Operator-selectable presentation. `search-bar` is the original horizontal
   *  control; `promo-card` is the white Figma promotional card. */
  layout?: 'search-bar' | 'promo-card';
  /** Placeholder for the location input (Figma: "City, ZIP or Address"). */
  searchPlaceholder?: string;
  /** Find button label (desktop Figma: "Find Storage"). */
  ctaLabel?: string;
  /** Comma-separated Storage Type options. The FIRST entry is the unselected
   *  placeholder (e.g. "Storage Type"); the rest are real options. */
  storageTypes?: string;
  /** Show the Storage Type dropdown at all. */
  showStorageType?: boolean;
  /** Dynamic facility-page base path, before the property's full slug. */
  searchUrl?: string;
  /** Duda external collection containing property slugs and addresses. */
  propertiesCollection?: string;
  /** "See our N Locations" link target, e.g. "/locations". */
  locationsUrl?: string;
  /** Number shown in the locations link. */
  locationsCount?: number;
  /** Locations link text; "{n}" is replaced with locationsCount. */
  locationsLabel?: string;
  /** Accent (button + locations bar). Defaults to the theme's --color_2, then red. */
  accentColor?: string;
  /** Layout-2 card heading. */
  cardHeading?: string;
  /** Layout-2 accent promotion copy; wraps naturally to the available width. */
  promotionText?: string;
  /** Layout-2 final promotion line, rendered in black. */
  promotionSuffix?: string;
  /** Layout-2 legal/disclosure copy below the promotion. */
  promotionDisclaimer?: string;
  /** Recent resolved city searches kept on this device (0 disables, max 5). */
  historyLimit?: number;
  inEditor?: boolean;
  siteId?: string;
}

const DEFAULT_TYPES = 'Storage Type,Climate Controlled,Drive-Up,Indoor,Outdoor,Vehicle & RV';

interface SearchTarget { kind: 'state' | 'city' | 'property'; label: string; haystack: string; href: string; }
interface RecentSearch { label: string; href: string; savedAt: number; }
const HISTORY_KEY = 'ti.homepageSearch.recentCities';
const HISTORY_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const FALLBACK_TARGETS: SearchTarget[] = [
  { kind: 'state', label: 'California', haystack: 'california ca', href: '/locations/california' },
  // Downloaded data plus the supplied URL examples: Bakersfield has multiple
  // facilities, while Fullerton currently has one.
  { kind: 'city', label: 'Bakersfield', haystack: 'bakersfield california 93307 101 mt vernon', href: '/locations/california/bakersfield' },
  { kind: 'city', label: 'Fullerton', haystack: 'fullerton california 92831 999 s raymond storage outlet fullerton', href: '/property-landing-page--value-tiers-test/california/fullerton/storage-outlet-fullerton-340079520' },
  { kind: 'property', label: 'Storage Outlet Fullerton', haystack: 'fullerton california 92831 999 s raymond storage outlet fullerton', href: '/property-landing-page--value-tiers-test/california/fullerton/storage-outlet-fullerton-340079520' },
];

function editorSafeHref(path: string, inEditor?: boolean, siteId?: string): string {
  let referrerPath = '';
  try { referrerPath = document.referrer ? new URL(document.referrer).pathname : ''; } catch { /* unavailable */ }
  const prefix = window.location.pathname.match(/^(\/home\/site\/[^/]+\/)/)?.[1]
    ?? referrerPath.match(/^(\/home\/site\/[^/]+\/)/)?.[1]
    ?? (inEditor && siteId ? `/home/site/${encodeURIComponent(siteId)}/` : '/');
  return prefix + path.replace(/^\/+/, '');
}

function SearchIcon() {
  return (
    <svg className="hs-search-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg className="hs-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  locationsCount = 29,
  locationsLabel = 'See our {n} Locations',
  accentColor,
  cardHeading = 'Find Storage Near Me',
  promotionText = '$1 Summer Move-In',
  promotionSuffix = 'Special',
  promotionDisclaimer = '*All new rentals are subject to a $30 Admin Fee. Other fees like coverage may apply, select a space to see price details.',
  historyLimit = 5,
  inEditor,
  siteId,
}: HomepageSearchProps) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<SearchTarget>();
  const [targets, setTargets] = useState<SearchTarget[]>(FALLBACK_TARGETS);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
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
  const suggestionsId = 'hs-city-suggestions';

  useEffect(() => {
    let cancelled = false;
    void fetchLocationTree('#04 homepage-search', {
      collectionName: propertiesCollection,
      basePath: searchUrl,
      cityBasePath: locationsUrl,
    }).then((tree) => {
      if (cancelled) return;
      if (!tree.length) return;
      const mapped: SearchTarget[] = [];
      for (const state of tree) {
        mapped.push({ kind: 'state', label: state.label, haystack: `${state.label} ${state.key}`.toLowerCase(), href: state.href });
        for (const city of state.cities) {
          const cityHref = city.properties.length === 1 ? city.properties[0].href : city.href;
          const facilityTerms = city.properties.flatMap((property) => [property.label, property.address, property.street, property.zip]).join(' ');
          mapped.push({ kind: 'city', label: city.label, haystack: `${city.label} ${state.label} ${city.key} ${facilityTerms}`.toLowerCase(), href: cityHref });
          for (const property of city.properties) {
            mapped.push({
              kind: 'property',
              label: property.label,
              haystack: [property.label, property.address, property.street, property.city, property.state, property.zip, city.label, state.label].join(' ').toLowerCase(),
              href: property.href,
            });
          }
        }
      }
      setTargets(mapped);
    });
    return () => { cancelled = true; };
  }, [propertiesCollection, searchUrl, locationsUrl]);

  const parts = storageTypes.split(',').map((s) => s.trim()).filter(Boolean);
  const typePlaceholder = parts[0] ?? 'Storage Type';
  const typeOptions = parts.slice(1);

  const match = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return undefined;
    if (selectedTarget?.label.toLowerCase() === needle) return selectedTarget;
    // Exact state/city/facility names first. Address/ZIP and partial searches
    // then prefer a property over a broader city/state result.
    return targets.find((row) => row.label.toLowerCase() === needle)
      ?? targets.find((row) => row.kind === 'property' && row.haystack.includes(needle))
      ?? targets.find((row) => row.kind === 'city' && row.haystack.includes(needle))
      ?? targets.find((row) => row.haystack.includes(needle));
  }, [targets, q, selectedTarget]);

  // Suggestions are CITY-ONLY and therefore can never advertise a market the
  // Properties collection does not actually serve. Address/ZIP terms still find
  // the owning city because each city's haystack includes its facilities.
  const citySuggestions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return targets
      .filter((row) => row.kind === 'city' && row.haystack.includes(needle))
      .sort((a, b) => {
        const ae = a.label.toLowerCase() === needle ? -1 : 0;
        const be = b.label.toLowerCase() === needle ? -1 : 0;
        return ae - be || a.label.localeCompare(b.label);
      })
      .slice(0, 8);
  }, [targets, q]);

  const visibleSuggestions: SearchTarget[] = q.trim()
    ? citySuggestions
    : recent.slice(0, safeHistoryLimit).map((item) => ({ kind: 'city', label: item.label, haystack: item.label.toLowerCase(), href: item.href }));

  const remember = (target: SearchTarget) => {
    if (!safeHistoryLimit) return;
    const next = [
      { label: target.label, href: target.href, savedAt: Date.now() },
      ...recent.filter((item) => item.href !== target.href),
    ].slice(0, safeHistoryLimit);
    setRecent(next);
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const clearHistory = () => {
    setRecent([]);
    try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* storage unavailable */ }
  };

  const chooseCity = (target: SearchTarget) => {
    setQ(target.label);
    setSelectedTarget(target);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  };

  // The Properties collection already produced the correct state/city/facility
  // target according to the one-vs-many rule. No generic results page is invented.
  const href = (() => {
    if (!match) return undefined;
    let url: URL;
    try { url = new URL(match.href, window.location.origin); } catch { return undefined; }
    if (url.origin !== window.location.origin) return undefined;
    if (type) url.searchParams.set('type', type);
    return editorSafeHref(url.pathname + url.search, inEditor, siteId);
  })();

  const locationsHref = (() => {
    try {
      const url = new URL(locationsUrl, window.location.origin);
      return url.origin === window.location.origin
        ? editorSafeHref(url.pathname + url.search, inEditor, siteId)
        : undefined;
    } catch { return undefined; }
  })();

  const style = accentColor ? ({ ['--hs-accent']: accentColor } as React.CSSProperties) : undefined;
  const locationsText = locationsLabel.replace('{n}', String(locationsCount));
  const promoCard = layout === 'promo-card';

  return (
    <div
      className={`hs hs--${layout}`}
      style={style}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSuggestionsOpen(false); }}
    >
      <div className={promoCard ? 'hs-card' : 'hs-search-layout'}>
        {promoCard && <h2 className="hs-card-heading">{cardHeading}</h2>}
        <form className="hs-bar" onSubmit={(e) => { e.preventDefault(); if (href) findRef.current?.click(); }}>
        <div className="hs-field">
          <input
            className="hs-input"
            type="text"
            value={q}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && visibleSuggestions.length > 0}
            aria-controls={suggestionsId}
            aria-activedescendant={activeSuggestion >= 0 ? `hs-city-option-${activeSuggestion}` : undefined}
            onFocus={() => setSuggestionsOpen(true)}
            onChange={(e) => { setQ(e.target.value); setSelectedTarget(undefined); setSuggestionsOpen(true); setActiveSuggestion(-1); }}
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
          <label className="hs-type">
            <span className="hs-type-label">{type || typePlaceholder}</span>
            <Chevron />
            <select
              className="hs-select"
              value={type}
              aria-label={typePlaceholder}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">{typePlaceholder}</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        )}

        <a
          ref={findRef}
          className="hs-find"
          href={href ?? undefined}
          aria-disabled={!href}
          onClick={(e) => { if (!href) e.preventDefault(); else if (match) remember(match.kind === 'property'
            ? (targets.find((target) => target.kind === 'city' && target.haystack.includes(match.label.toLowerCase())) ?? match)
            : match); }}
        >
          <span className="hs-find-label">{ctaLabel}</span>
          <SearchIcon />
        </a>
        </form>

        {suggestionsOpen && visibleSuggestions.length > 0 && (
          <ul className="hs-suggestions" id={suggestionsId} role="listbox" aria-label="Cities we serve">
          {!q.trim() && <li className="hs-history-head" role="presentation"><span>Recent searches</span><button type="button" onClick={clearHistory}>Clear</button></li>}
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
                <span>{city.label}</span><span className="hs-suggestion-state">{q.trim() ? 'City we serve' : 'Recent'}</span>
              </button>
            </li>
          ))}
          </ul>
        )}

        {q.trim() && !match && !citySuggestions.length && <p className="hs-error" role="status">No matching city, ZIP, or address found.</p>}

        {promoCard && (
          <div className="hs-promotion">
            <p className="hs-promotion-title"><span>{promotionText}</span><strong>{promotionSuffix}</strong></p>
            {promotionDisclaimer && <p className="hs-promotion-disclaimer">{promotionDisclaimer}</p>}
          </div>
        )}
      </div>

      {locationsHref && (
        <a className="hs-locations" href={locationsHref}>{locationsText}</a>
      )}
    </div>
  );
}
