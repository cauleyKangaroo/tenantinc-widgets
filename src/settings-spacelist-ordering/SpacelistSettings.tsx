// ===========================================================================
// Spacelist-Ordering — the Widget Builder's external settings panel, as React.
//
// This is NOT a Duda page widget. It is the app behind the Widget Builder's
// "Embed your own external widget settings": Duda iframes a hosted shell page
// (spacelist-ordering-settings.html, repo root) every time the widget is added
// or edited, appending the instance on the query string —
//   ?siteId=…&elementId=…&widgetId=…&page=…&locale=…&version=…
// (https://developer.duda.co/docs/iframed-configuration). There is NO
// postMessage/data.config bridge for this input type: Duda recommends storing
// settings keyed by elementId + siteId in YOUR system, and the widget's page
// JS receives the same data.elementId/data.siteId to read them back — the
// accordionConfig pattern. The shell forwards those params here as props, the
// same way the Duda JS tab forwards data.config to a page widget.
//
// WHO SUPPLIES THE PROPERTY LIST — the `PropertiesInternal` collection.
//   The widget sits on the DYNAMIC property page, so the panel cannot know
//   which property a visit will render; the editor picks one here first, and
//   the pick list is the site's own curated roster — the same rows the dynamic
//   pages are built from. `dmAPI` does not exist in this iframe (published
//   pages only) and Duda's REST read needs Partner auth, so the read goes
//   through collection-read.php (repo root, deployed next to accordion-sync.php
//   and sharing its credentials file). By default that proxy is looked up NEXT
//   TO the shell page; the `collections` prop overrides. The collection is
//   NATIVE: text cells arrive `<p class="rteBlock">…</p>`-wrapped and JSON
//   cells as text, so rows go through the same plainText/boundJson treatment
//   @shared/internalProperties applies on published pages.
//
// WHERE THE COUNTS COME FROM — live, per the picked property.
//   `PropertiesInternal.id` IS the Hummingbird property id (the join key every
//   widget uses), so the picked row's storage types come from the live API:
//     hb-proxy (the real one, matching the client bundles): prop `hb` is the
//       site-text `login_api_base`; calls go to
//       {hb}/api/hb/{v1|v2}/{path}?…&siteId={siteId} — the proxy resolves the
//       site's company/application/key server-side, so no secret ever reaches
//       this public page. siteId rides as a query param rather than the
//       X-Duda-Site-Id header to keep the GETs preflight-free (verified
//       against hb.routes.ts and its GET allowlist).
//     direct edge (dev preview only): `apiKey` + `companyId` call
//       edge.tenant.dev the way the bundles' config.json fallback used to.
//       The baked bundle key has been rotated, so this needs a key by hand.
//   When the live read cannot answer for the picked id, the row's own
//   `unit_type_counts` column stands in (synced, so possibly stale — the badge
//   says which source is showing). When the collection read fails, the live
//   property list stands in for the roster. Each source covers the other.
//
// Three tabs mirror the Hummingbird hierarchy:
//   Company        — the company's space-type catalogue (what it CAN sell)
//   Property Group — the picked property's space groups; "Website Group" is
//                    badged — it is the public unit list (see @shared/spaceGroups)
//   Property       — the picked property's storage types with total/vacant
//                    counts, display names joined from the catalogue by
//                    unit_type_id
//
// The Save bar is rendered but disabled: persistence (a write-proxy upserting
// a collection row per `{siteId}_{elementId}`) is the next step.
// ===========================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plainText, str } from '@shared/dudaCollections';
import { boundJson } from '@shared/propertyBinding';
import './SpacelistSettings.css';

export interface SpacelistSettingsProps {
  /** The hb-proxy origin — the `login_api_base` site text. */
  hb?: string;
  /** The collection read-proxy (collection-read.php). Default: next to the shell. */
  collections?: string;
  /** Duda's iframe params, forwarded by the shell. */
  siteId?: string;
  elementId?: string;
  widgetId?: string;
  page?: string;
  locale?: string;
  /** Direct-edge preview creds (dev only — see header). */
  base?: string;
  appId?: string;
  apiKey?: string;
  companyId?: string;
}

interface UnitTypeCount { unit_type?: string; total_count?: number; vacant_count?: number; unit_type_id?: string }
interface CatalogueType { unit_type_id?: string; id?: string; unit_type_name?: string; display_name?: string; have_coverage?: number }
interface SpaceGroup { id?: string; name?: string }
/** One pick-list entry, whichever source produced it. */
interface RosterItem { id: string; name: string; counts?: UnitTypeCount[] }

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

/** "commercial_storage" → "Commercial Storage" (catalogue display_name wins). */
function prettyType(raw: unknown): string {
  return String(raw ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'group', label: 'Property Group' },
  { key: 'property', label: 'Property' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function SpacelistSettings({
  hb = '', collections = '', siteId = '', elementId = '', page = '',
  base = 'https://edge.tenant.dev/api/v3',
  appId = 'appbc35600a675841eea5893df84231789e',
  apiKey = '', companyId = '',
}: SpacelistSettingsProps) {
  const hbBase = hb.trim().replace(/\/+$/, '');
  const mode: 'hb' | 'direct' | '' = hbBase && siteId ? 'hb' : (apiKey && companyId ? 'direct' : '');
  const setupMsg = !hbBase
    ? 'Not configured: append ?hb=<login_api_base> to the embed URL in the Widget Builder '
      + '(the same site-text value the widgets use). For a standalone preview, '
      + '?apiKey=…&companyId=… calls the edge API directly.'
    : 'Waiting for Duda: this page needs the siteId Duda appends to the iframe URL. '
      + 'Open it from the widget editing panel, or add &siteId=<site> by hand to preview.';

  /** The collection read-proxy URL — explicit prop, else next to the shell page. */
  const collectionsUrl = useMemo(() => {
    const explicit = collections.trim();
    if (explicit) return explicit;
    try { return new URL('collection-read.php', window.location.href).toString(); } catch { return ''; }
  }, [collections]);

  /**
   * One live-API call either way, same envelope back:
   *   hb     → {hb}/api/hb/{v}/{path}?…&siteId={siteId}   (key stays server-side)
   *   direct → {base}/applications/{appId}/{v}/companies/{co}/{path} + key headers
   * The gateway's body comes back verbatim from the proxy, so both unwrap the
   * same: applicationData.<appId>[0] — by FIRST key, because in hb mode this
   * page has no reason to know the site's application id.
   */
  const api = useCallback(async (version: 'v1' | 'v2', path: string): Promise<unknown> => {
    if (!mode) throw new Error(setupMsg);
    let url: string;
    const headers: Record<string, string> = {};
    if (mode === 'hb') {
      url = `${hbBase}/api/hb/${version}/${path}${path.includes('?') ? '&' : '?'}siteId=${encodeURIComponent(siteId)}`;
    } else {
      url = `${base}/applications/${appId}/${version}/companies/${companyId}/${path}`;
      headers['x-storageapi-date'] = String(Math.floor(Date.now() / 1000));
      headers['x-storageapi-key'] = apiKey;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { applicationData?: Record<string, Array<{ status?: number; msg?: string; data?: unknown }>> };
    const apps = json?.applicationData;
    const firstKey = apps && Object.keys(apps)[0];
    const inner = firstKey ? apps[firstKey]?.[0] : undefined;
    if (!inner || (inner.status && inner.status !== 200)) {
      throw new Error(`API status ${inner?.status}${inner?.msg ? ` — ${inner.msg}` : ''}`);
    }
    return inner.data;
    // setupMsg varies only with the same inputs that decide `mode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hbBase, siteId, base, appId, apiKey, companyId]);

  const [tab, setTab] = useState<TabKey>('company');
  /** The live API's property list — the source of LIVE counts, and the roster fallback. */
  const [liveProps, setLiveProps] = useState<Loadable<RosterItem[]>>({ status: 'loading' });
  /** The `PropertiesInternal` roster — what the dropdown prefers. */
  const [internal, setInternal] = useState<Loadable<RosterItem[]>>({ status: 'loading' });
  const [catalogue, setCatalogue] = useState<Loadable<CatalogueType[]>>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState<Loadable<SpaceGroup[]> | null>(null);
  const groupsCache = useRef(new Map<string, Promise<SpaceGroup[]>>());

  // The two live company-wide reads, once per creds change.
  useEffect(() => {
    let cancelled = false;
    setLiveProps({ status: 'loading' });
    setCatalogue({ status: 'loading' });
    groupsCache.current.clear();
    api('v1', 'properties?unit_type_counts=true')
      .then((d) => {
        if (cancelled) return;
        const rows = ((d as { properties?: Array<Record<string, unknown>> })?.properties ?? []);
        const items: RosterItem[] = rows
          .filter((p) => typeof p?.id === 'string' && p.id)
          .map((p) => ({
            id: p.id as string,
            name: str(p.name) || (p.id as string),
            counts: Array.isArray(p.unit_type_counts) ? p.unit_type_counts as UnitTypeCount[] : undefined,
          }));
        setLiveProps({ status: 'ready', data: items });
      })
      .catch((err: Error) => { if (!cancelled) setLiveProps({ status: 'error', message: err.message }); });
    // This endpoint's `data` is an ARRAY, unlike the object every other read returns.
    api('v2', 'space-management/space-types')
      .then((d) => { if (!cancelled) setCatalogue({ status: 'ready', data: Array.isArray(d) ? d as CatalogueType[] : [] }); })
      .catch((err: Error) => { if (!cancelled) setCatalogue({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [api]);

  /*
   * The `PropertiesInternal` roster, via collection-read.php.
   *
   * Rows come back as Duda hands them over — fields nested under `data` with a
   * row-level id — and this is a NATIVE collection, so the same treatment
   * @shared/internalProperties applies on published pages happens here: the
   * COLUMN id (plainText-stripped) must win over Duda's own row id, names lose
   * their rteBlock wrapper, and `unit_type_counts` parses from JSON text. A row
   * without a column id cannot be joined to anything and is skipped.
   */
  useEffect(() => {
    if (!collectionsUrl || !siteId) {
      setInternal({ status: 'error', message: 'collection read needs the siteId Duda appends to the iframe URL' });
      return undefined;
    }
    let cancelled = false;
    setInternal({ status: 'loading' });
    const url = `${collectionsUrl}${collectionsUrl.includes('?') ? '&' : '?'}collection=PropertiesInternal&siteId=${encodeURIComponent(siteId)}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ rows?: Array<Record<string, unknown>> }>;
      })
      .then((json) => {
        if (cancelled) return;
        const items: RosterItem[] = (json.rows ?? [])
          .map((row): RosterItem | null => {
            const fields = (row && typeof row.data === 'object' && row.data ? row.data : row) as Record<string, unknown>;
            const id = plainText(fields.id).trim();
            if (!id) return null;
            const counts = Array.isArray(fields.unit_type_counts)
              ? fields.unit_type_counts as UnitTypeCount[]
              : boundJson<UnitTypeCount[]>(plainText(fields.unit_type_counts)) ?? undefined;
            return { id, name: plainText(fields.name).trim() || id, counts };
          })
          .filter((r): r is RosterItem => r !== null)
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
        setInternal({ status: 'ready', data: items });
      })
      .catch((err: Error) => { if (!cancelled) setInternal({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [collectionsUrl, siteId]);

  // The picked property's space groups — cached per property, stale replies dropped.
  useEffect(() => {
    if (!selectedId) { setGroups(null); return undefined; }
    let cancelled = false;
    setGroups({ status: 'loading' });
    const cached = groupsCache.current.get(selectedId)
      ?? api('v2', `properties/${encodeURIComponent(selectedId)}/space-groups`)
        .then((d) => ((d as { spaceGroups?: SpaceGroup[] })?.spaceGroups ?? []));
    groupsCache.current.set(selectedId, cached);
    cached
      .then((list) => { if (!cancelled) setGroups({ status: 'ready', data: list }); })
      .catch((err: Error) => {
        if (cancelled) return;
        groupsCache.current.delete(selectedId); // a failure must not be cached forever
        setGroups({ status: 'error', message: err.message });
      });
    return () => { cancelled = true; };
  }, [selectedId, api]);

  /*
   * THE pick list: the collection roster when it answered with rows, else the
   * live list. Loading only while the preferred source could still improve the
   * answer; both failed ⇒ one combined error.
   */
  const roster: Loadable<RosterItem[]> & { source?: 'collection' | 'live' } = useMemo(() => {
    if (internal.status === 'ready' && internal.data.length) return { ...internal, source: 'collection' as const };
    if (internal.status === 'loading') return { status: 'loading' as const };
    if (liveProps.status === 'ready') return { ...liveProps, source: 'live' as const };
    if (liveProps.status === 'loading') return { status: 'loading' as const };
    return {
      status: 'error' as const,
      message: internal.status === 'ready'
        ? `the PropertiesInternal collection is empty, and the live list failed too (${liveProps.message})`
        : `${internal.message}; live list: ${liveProps.message}`,
    };
  }, [internal, liveProps]);
  const rosterItems = roster.status === 'ready' ? roster.data : [];

  // One property on the roster (or a future per-page binding): preselect it.
  useEffect(() => {
    if (!selectedId && roster.status === 'ready' && rosterItems.length === 1) setSelectedId(rosterItems[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.status]);

  /** Live counts by property id — what the Property tab prefers. */
  const liveCounts = useMemo(() => {
    const out = new Map<string, UnitTypeCount[]>();
    if (liveProps.status === 'ready') {
      for (const p of liveProps.data) if (p.counts?.length) out.set(p.id, p.counts);
    }
    return out;
  }, [liveProps]);

  const selected = rosterItems.find((p) => p.id === selectedId);
  const displayById = useMemo(() => {
    const out = new Map<string, string>();
    if (catalogue.status === 'ready') {
      for (const t of catalogue.data) {
        const id = t.unit_type_id ?? t.id;
        if (id && t.display_name) out.set(id, t.display_name);
      }
    }
    return out;
  }, [catalogue]);

  const stateLine = (l: { status: 'loading' } | { status: 'error'; message: string }, what: string) => (
    l.status === 'loading'
      ? <div className="sos-state"><span className="sos-spin" aria-hidden="true" />Loading {what}…</div>
      : <div className="sos-state sos-state--error" role="alert">Could not load {what}: {l.message}</div>
  );

  const propertyPicker = (idPrefix: string) => (
    <div className="sos-picker">
      <label htmlFor={`${idPrefix}-prop`}>
        Property
        {roster.status === 'ready' && roster.source && (
          <em className="sos-src">{roster.source === 'collection' ? 'from PropertiesInternal' : 'from the live API'}</em>
        )}
      </label>
      <select
        id={`${idPrefix}-prop`}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={roster.status !== 'ready'}
      >
        <option value="">
          {roster.status === 'ready' ? '— choose a property —'
            : roster.status === 'loading' ? 'Loading properties…'
              : 'Properties unavailable'}
        </option>
        {rosterItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {roster.status === 'error' && (
        <div className="sos-state sos-state--error" role="alert">Could not load properties: {roster.message}</div>
      )}
    </div>
  );

  return (
    <div className="sos-wrap">
      <header className="sos-hd">
        <h1>Space List Ordering</h1>
        <p className="sos-inst">
          {siteId
            ? `Instance ${siteId}_${elementId}${page ? ` · page: ${page}` : ''}`
            : 'Not inside Duda — design preview (no siteId/elementId in the URL).'}
        </p>
      </header>

      <div className="sos-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className="sos-tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Company</h2>
            <p className="sos-sub">The company every request on this site is scoped to.</p>
            {roster.status !== 'ready' ? stateLine(roster, 'the company') : (
              <div className="sos-rows">
                <div className="sos-row">
                  <div className="sos-name">
                    {mode === 'hb' ? `Company of site ${siteId}` : mode === 'direct' ? `Company ${companyId}` : `Site ${siteId}`}
                    <small>{rosterItems.length} propert{rosterItems.length === 1 ? 'y' : 'ies'} on this site</small>
                  </div>
                  <span className="sos-badge">
                    {roster.source === 'collection' ? 'roster: PropertiesInternal' : 'roster: live API'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="sos-card">
            <h2>Space type catalogue</h2>
            <p className="sos-sub">Every space type this company can sell. Which of these a property actually offers is on the Property tab.</p>
            {catalogue.status !== 'ready' ? stateLine(catalogue, 'the space-type catalogue')
              : !catalogue.data.length ? <div className="sos-state">This company has no space types configured.</div>
                : (
                  <div className="sos-rows">
                    {catalogue.data.map((t, i) => (
                      <div className="sos-row" key={t.unit_type_id ?? t.id ?? i}>
                        <div className="sos-name">
                          {t.display_name || prettyType(t.unit_type_name)}
                          <small>{t.unit_type_name ?? ''}</small>
                        </div>
                        {t.have_coverage === 1 && <span className="sos-badge">coverage</span>}
                      </div>
                    ))}
                  </div>
                )}
          </div>
        </section>
      )}

      {tab === 'group' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Space groups</h2>
            <p className="sos-sub">Each property sells its units through one of several groups — only the “Website Group” is the public list.</p>
            {propertyPicker('sos-group')}
            {!selectedId ? <div className="sos-state">Pick a property to see its groups.</div>
              : !groups || groups.status !== 'ready' ? (groups && stateLine(groups, 'space groups'))
                : !groups.data.length ? <div className="sos-state">This property has no space groups.</div>
                  : (
                    <div className="sos-rows">
                      {groups.data.map((g, i) => (
                        <div className="sos-row" key={g.id ?? i}>
                          <div className="sos-name">{g.name || g.id}</div>
                          {/website/i.test(g.name ?? '') && <span className="sos-badge sos-badge--public">public unit list</span>}
                        </div>
                      ))}
                    </div>
                  )}
          </div>
        </section>
      )}

      {tab === 'property' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Storage types at this property</h2>
            <p className="sos-sub">
              The widget sits on the dynamic property page, so pick the property first —
              its storage types load live from Hummingbird by the collection row’s id.
            </p>
            {propertyPicker('sos-property')}
            {!selectedId ? (
              roster.status !== 'error' && <div className="sos-state">Pick a property to see its storage types.</div>
            ) : !selected ? (
              <div className="sos-state sos-state--error" role="alert">Property not found in the roster.</div>
            ) : (() => {
              /* Live counts for the picked id first; the collection row's own
                 (synced) unit_type_counts only when the live read cannot answer
                 for it — and the badge says which one is showing. */
              const live = liveCounts.get(selectedId);
              const counts = live ?? selected.counts ?? [];
              if (!counts.length) {
                return liveProps.status === 'loading'
                  ? <div className="sos-state"><span className="sos-spin" aria-hidden="true" />Loading storage types…</div>
                  : (
                    <div className="sos-state">
                      No storage types found for this property
                      {liveProps.status === 'error' ? ` — the live read failed (${liveProps.message}) and the collection row carries no unit_type_counts.` : '.'}
                    </div>
                  );
              }
              return (
                <>
                  <p className="sos-count-line">
                    <b>{counts.length}</b> storage type{counts.length === 1 ? '' : 's'} at <b>{selected.name}</b>
                    {' '}<span className={`sos-badge${live ? ' sos-badge--public' : ''}`}>{live ? 'live' : 'from the collection (synced)'}</span>
                  </p>
                  <div className="sos-rows">
                    {counts.map((c, i) => (
                      <div className="sos-row" key={c.unit_type_id ?? i}>
                        <div className="sos-name">
                          {(c.unit_type_id && displayById.get(c.unit_type_id)) || prettyType(c.unit_type)}
                          <small>{c.unit_type ?? ''}</small>
                        </div>
                        <div className="sos-stat"><b>{c.total_count ?? '—'}</b><span>units</span></div>
                        <div className="sos-stat"><b>{c.vacant_count ?? '—'}</b><span>vacant</span></div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      <div className="sos-savebar">
        <span className="sos-note">Settings persistence comes next — this build is the design + live data.</span>
        <button type="button" disabled>Save</button>
      </div>
    </div>
  );
}
