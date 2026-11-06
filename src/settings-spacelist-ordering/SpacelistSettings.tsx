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
// WHERE THE DATA COMES FROM — two modes, picked by the props:
//   hb-proxy (the real one, matching the client bundles): prop `hb` is the
//     site-text `login_api_base`. Calls go to
//       {hb}/api/hb/{v1|v2}/{path}?…&siteId={siteId}
//     — the proxy resolves the site's company/application/key server-side, so
//     no secret ever reaches this public page. siteId rides as a query param
//     rather than the X-Duda-Site-Id header to keep the GETs preflight-free;
//     the proxy strips it before forwarding (verified against hb.routes.ts
//     and its GET allowlist).
//   direct edge (dev preview only): `apiKey` + `companyId` call edge.tenant.dev
//     the way the bundles' config.json fallback used to. The baked bundle key
//     has been rotated, so this mode needs a key supplied by hand.
//
// Three tabs mirror the Hummingbird hierarchy:
//   Company        — the company's space-type catalogue (what it CAN sell)
//   Property Group — the picked property's space groups; "Website Group" is
//                    badged — it is the public unit list (see @shared/spaceGroups)
//   Property       — the picked property's storage types with total/vacant
//                    counts (unit_type_counts), display names joined from the
//                    catalogue by unit_type_id
//
// The Save bar is rendered but disabled: persistence (a write-proxy upserting
// a collection row per `{siteId}_{elementId}`) is the next step.
// ===========================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './SpacelistSettings.css';

export interface SpacelistSettingsProps {
  /** The hb-proxy origin — the `login_api_base` site text. */
  hb?: string;
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
interface PropertyRow { id: string; name?: string; unit_type_counts?: UnitTypeCount[] }
interface CatalogueType { unit_type_id?: string; id?: string; unit_type_name?: string; display_name?: string; have_coverage?: number }
interface SpaceGroup { id?: string; name?: string }

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
  hb = '', siteId = '', elementId = '', page = '',
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

  /**
   * One call either way, same envelope back:
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
  const [properties, setProperties] = useState<Loadable<PropertyRow[]>>({ status: 'loading' });
  const [catalogue, setCatalogue] = useState<Loadable<CatalogueType[]>>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState('');
  const [groups, setGroups] = useState<Loadable<SpaceGroup[]> | null>(null);
  const groupsCache = useRef(new Map<string, Promise<SpaceGroup[]>>());

  // The two company-wide reads, once per creds change.
  useEffect(() => {
    let cancelled = false;
    setProperties({ status: 'loading' });
    setCatalogue({ status: 'loading' });
    groupsCache.current.clear();
    api('v1', 'properties?unit_type_counts=true')
      .then((d) => {
        if (cancelled) return;
        const list = ((d as { properties?: PropertyRow[] })?.properties ?? []).filter((p) => p && p.id);
        setProperties({ status: 'ready', data: list });
        // One property on the account (or a future per-page binding): preselect it.
        if (list.length === 1) setSelectedId(list[0].id);
      })
      .catch((err: Error) => { if (!cancelled) setProperties({ status: 'error', message: err.message }); });
    // This endpoint's `data` is an ARRAY, unlike the object every other read returns.
    api('v2', 'space-management/space-types')
      .then((d) => { if (!cancelled) setCatalogue({ status: 'ready', data: Array.isArray(d) ? d as CatalogueType[] : [] }); })
      .catch((err: Error) => { if (!cancelled) setCatalogue({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [api]);

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

  const props_ = properties.status === 'ready' ? properties.data : [];
  const selected = props_.find((p) => p.id === selectedId);
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
      <label htmlFor={`${idPrefix}-prop`}>Property</label>
      <select
        id={`${idPrefix}-prop`}
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={properties.status !== 'ready'}
      >
        <option value="">
          {properties.status === 'ready' ? '— choose a property —'
            : properties.status === 'loading' ? 'Loading properties…'
              : 'Properties unavailable'}
        </option>
        {props_.map((p) => <option key={p.id} value={p.id}>{p.name || p.id}</option>)}
      </select>
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
            {properties.status !== 'ready' ? stateLine(properties, 'the company') : (
              <div className="sos-rows">
                <div className="sos-row">
                  <div className="sos-name">
                    {mode === 'hb' ? `Company of site ${siteId}` : `Company ${companyId}`}
                    <small>{props_.length} propert{props_.length === 1 ? 'y' : 'ies'} on this account</small>
                  </div>
                  <span className="sos-badge">{mode === 'hb' ? 'resolved by the proxy' : 'direct edge (preview)'}</span>
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
            <p className="sos-sub">What the selected property offers, live from Hummingbird — the dynamic property page renders one of these rows per type.</p>
            {propertyPicker('sos-property')}
            {!selectedId ? (
              properties.status === 'error'
                ? stateLine(properties, 'properties')
                : <div className="sos-state">Pick a property to see its storage types.</div>
            ) : !selected ? (
              <div className="sos-state sos-state--error" role="alert">Property not found in the company list.</div>
            ) : (() => {
              const counts = Array.isArray(selected.unit_type_counts) ? selected.unit_type_counts : [];
              if (!counts.length) return <div className="sos-state">No unit-type counts for this property — the API returned none.</div>;
              return (
                <>
                  <p className="sos-count-line">
                    <b>{counts.length}</b> storage type{counts.length === 1 ? '' : 's'} at <b>{selected.name || selected.id}</b>
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
