// ===========================================================================
// Spacelist-Ordering — the Widget Builder's external settings panel, as React.
//
// This is NOT a Duda page widget. It is the app behind the Widget Builder's
// "Embed your own external widget settings": Duda iframes the emitted shell
// (dist/spacelist-ordering-settings.html) every time the widget is added or
// edited, appending the instance on the query string —
//   ?siteId=…&elementId=…&widgetId=…&page=…&locale=…&version=…
// (https://developer.duda.co/docs/iframed-configuration). There is NO
// postMessage/data.config bridge for this input type: settings are stored in
// our backend keyed by elementId + siteId — Duda's own recommendation — and
// the widget's page JS receives the same data.elementId/data.siteId to read
// them back. The shell forwards those params here as props.
//
// DATA — the tenant-proxy (branch feat/spacelist-settings):
//   GET {PROXY}/api/spacelist/rows?siteId=…
//     The property roster: the site's own `PropertiesInternal` rows, the same
//     ones the dynamic property pages are built from. The panel cannot read
//     them itself (no dmAPI outside a published page; Duda's REST read needs
//     credentials), so the proxy reads them with its Duda creds.
//   GET {PROXY}/api/hb/v2/properties/{pid}/space-groups?siteId=…
//     The picked property's space groups, live from Hummingbird — the proxy
//     resolves the site's company/application/key server-side.
//   POST {PROXY}/api/spacelist/settings   ← Save; NOT wired yet. The button
//     console.logs its exact payload for now, so the save shape can be agreed
//     on before anything writes.
//
// The property is picked FIRST because the widget sits on the DYNAMIC property
// page: the panel cannot know which property a visit will render, so the
// arrangement is per property.
// ===========================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { plainText } from '@shared/dudaCollections';
import './SpacelistSettings.css';

/*
 * TEMPORARY — local testing only. The tenant-proxy runs on the developer's
 * machine behind an ngrok free tunnel, so the base is hardcoded here and the
 * bypass header is sent on every call (without it ngrok answers a browser
 * fetch with its warning interstitial instead of JSON; the proxy's CORS
 * allow-list includes the header). Replace with the deployed proxy origin —
 * or a prop — before this leaves testing.
 */
const PROXY_BASE = 'https://5e17-202-53-80-238.ngrok-free.app';
const PROXY_HEADERS: Record<string, string> = { 'ngrok-skip-browser-warning': '1' };

export interface SpacelistSettingsProps {
  /** Duda's iframe params, forwarded by the shell. */
  siteId?: string;
  elementId?: string;
  widgetId?: string;
  page?: string;
  locale?: string;
}

interface DemoType { id: string; label: string; key: string; coverage?: boolean }
interface RosterItem { id: string; name: string }
interface SpaceGroup { id: string; name: string }

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

/* ── Company-tab DEMO catalogue — still static; the live company data comes
     later, with Save. Kept drag-sortable as the design reference. ── */
const CATALOGUE: DemoType[] = [
  { id: 'T1', label: 'Storage', key: 'storage', coverage: true },
  { id: 'T2', label: 'Parking', key: 'parking' },
  { id: 'T3', label: 'Commercial', key: 'commercial_storage' },
  { id: 'T4', label: 'Wine Storage', key: 'wine' },
];

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'group', label: 'Property Group' },
  { key: 'property', label: 'Property' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function SpacelistSettings({ siteId = '', elementId = '', page = '' }: SpacelistSettingsProps) {
  const [tab, setTab] = useState<TabKey>('company');
  const [selectedId, setSelectedId] = useState('');

  /* ── The property roster, from PropertiesInternal via the proxy ────────── */
  const [roster, setRoster] = useState<Loadable<RosterItem[]>>({ status: 'loading' });
  useEffect(() => {
    if (!siteId) {
      setRoster({ status: 'error', message: 'no siteId — open this from the Duda widget panel (or add ?siteId=… to the URL)' });
      return undefined;
    }
    let cancelled = false;
    setRoster({ status: 'loading' });
    fetch(`${PROXY_BASE}/api/spacelist/rows?siteId=${encodeURIComponent(siteId)}`, { headers: PROXY_HEADERS })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ rows?: Array<Record<string, unknown>> }>;
      })
      .then((json) => {
        if (cancelled) return;
        // Rows come as Duda stores them (fields under `data`, row-level id) and
        // the collection is NATIVE, so text cells can arrive rteBlock-wrapped —
        // plainText strips that. The COLUMN id is the Hummingbird property id;
        // a row without one cannot be joined to anything and is skipped.
        const items = (json.rows ?? [])
          .map((row): RosterItem | null => {
            const fields = (row && typeof row.data === 'object' && row.data ? row.data : row) as Record<string, unknown>;
            const id = plainText(fields.id).trim();
            if (!id) return null;
            return { id, name: plainText(fields.name).trim() || id };
          })
          .filter((r): r is RosterItem => r !== null)
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
        setRoster({ status: 'ready', data: items });
        if (items.length === 1) setSelectedId(items[0].id);
      })
      .catch((err: Error) => { if (!cancelled) setRoster({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [siteId]);

  /* ── The picked property's space groups, live via the hb passthrough ───── */
  const [groups, setGroups] = useState<Loadable<SpaceGroup[]> | null>(null);
  const groupsCache = useRef(new Map<string, Promise<SpaceGroup[]>>());
  const fetchGroups = useCallback((pid: string): Promise<SpaceGroup[]> => {
    const url = `${PROXY_BASE}/api/hb/v2/properties/${encodeURIComponent(pid)}/space-groups?siteId=${encodeURIComponent(siteId)}`;
    return fetch(url, { headers: PROXY_HEADERS })
      .then(async (res) => {
        const json = await res.json().catch(() => undefined) as
          { applicationData?: Record<string, Array<{ status?: number; msg?: string; data?: { spaceGroups?: Array<{ id?: string; name?: string }> } }>> } | undefined;
        // The gateway's envelope comes back verbatim; unwrap by FIRST key — the
        // panel has no reason to know the site's application id.
        const apps = json?.applicationData;
        const firstKey = apps && Object.keys(apps)[0];
        const inner = firstKey ? apps[firstKey]?.[0] : undefined;
        if (!res.ok || !inner || (inner.status && inner.status !== 200)) {
          throw new Error(`API status ${inner?.status ?? res.status}${inner?.msg ? ` — ${inner.msg}` : ''}`);
        }
        return (inner.data?.spaceGroups ?? [])
          .map((g) => ({ id: String(g.id ?? ''), name: String(g.name ?? '') }))
          .filter((g) => g.id);
      });
  }, [siteId]);

  useEffect(() => {
    if (!selectedId) { setGroups(null); return undefined; }
    let cancelled = false;
    setGroups({ status: 'loading' });
    const cached = groupsCache.current.get(selectedId) ?? fetchGroups(selectedId);
    groupsCache.current.set(selectedId, cached);
    cached
      .then((list) => { if (!cancelled) setGroups({ status: 'ready', data: list }); })
      .catch((err: Error) => {
        if (cancelled) return;
        groupsCache.current.delete(selectedId); // a failure must not be cached forever
        setGroups({ status: 'error', message: err.message });
      });
    return () => { cancelled = true; };
  }, [selectedId, fetchGroups]);

  /* ── Drag-to-arrange (shared by the catalogue and the groups list) ─────── */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const reorder = (order: string[], from: string, overId: string): string[] => {
    const fromIdx = order.indexOf(from);
    const overIdx = order.indexOf(overId);
    if (fromIdx < 0 || overIdx < 0 || fromIdx === overIdx) return order;
    const next = [...order];
    next.splice(fromIdx, 1);
    next.splice(overIdx, 0, from);
    return next;
  };
  const dragProps = (id: string, onOver: (overId: string) => void) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      dragId.current = id;
      setDraggingId(id);
      // Firefox refuses to start a drag with no data attached.
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move' as const;
    },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); onOver(id); },
    onDrop: (e: React.DragEvent) => e.preventDefault(),
    onDragEnd: () => { dragId.current = null; setDraggingId(null); },
  });

  /* Demo catalogue order (Company tab). */
  const [typeOrder, setTypeOrder] = useState<string[]>(() => CATALOGUE.map((t) => t.id));
  const orderedCatalogue = useMemo(
    () => typeOrder.map((id) => CATALOGUE.find((t) => t.id === id)).filter((t): t is DemoType => !!t),
    [typeOrder],
  );
  const moveOverCatalogue = (overId: string) => {
    const from = dragId.current;
    if (!from || from === overId) return;
    setTypeOrder((order) => reorder(order, from, overId));
  };

  /*
   * Per-property GROUP arrangement — seeded from the API's order when the
   * groups land, independent after. `{ propertyId, order }` is what Save will
   * persist; for now the button console.logs exactly that payload.
   */
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>({});
  const groupList = groups?.status === 'ready' ? groups.data : [];
  const groupOrder = (selectedId && groupOrders[selectedId]) || groupList.map((g) => g.id);
  const orderedGroups = useMemo(
    () => groupOrder.map((id) => groupList.find((g) => g.id === id)).filter((g): g is SpaceGroup => !!g),
    [groupOrder, groupList],
  );
  const moveOverGroup = (overId: string) => {
    const from = dragId.current;
    if (!from || from === overId || !selectedId) return;
    const pid = selectedId;
    const seed = groupList.map((g) => g.id);
    setGroupOrders((prev) => ({ ...prev, [pid]: reorder(prev[pid] ?? seed, from, overId) }));
  };

  const rosterItems = roster.status === 'ready' ? roster.data : [];
  const selected = rosterItems.find((p) => p.id === selectedId);

  const onSave = () => {
    const payload = {
      siteId,
      elementId,
      instanceKey: `${siteId}_${elementId}`,
      propertyId: selectedId,
      propertyName: selected?.name,
      order: orderedGroups.map((g) => g.id),
      groups: orderedGroups.map((g) => ({ id: g.id, name: g.name })),
    };
    // eslint-disable-next-line no-console
    console.log('[spacelist-settings] SAVE', payload);
  };

  const stateLine = (l: { status: 'loading' } | { status: 'error'; message: string }, what: string) => (
    l.status === 'loading'
      ? <div className="sos-state"><span className="sos-spin" aria-hidden="true" />Loading {what}…</div>
      : <div className="sos-state sos-state--error" role="alert">Could not load {what}: {l.message}</div>
  );

  const propertyPicker = (idPrefix: string) => (
    <div className="sos-picker">
      <label htmlFor={`${idPrefix}-prop`}>
        Property
        <em className="sos-src">from PropertiesInternal</em>
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

  const groupRows = (sortable: boolean) => (
    !selectedId ? <div className="sos-state">Pick a property to see its space groups.</div>
      : !groups || groups.status !== 'ready' ? (groups && stateLine(groups, 'space groups'))
        : !groups.data.length ? <div className="sos-state">This property has no space groups.</div>
          : (
            <div className="sos-rows">
              {(sortable ? orderedGroups : groups.data).map((g) => (
                <div
                  className={`sos-row${sortable ? ' sos-row--draggable' : ''}${draggingId === g.id ? ' sos-row--dragging' : ''}`}
                  key={g.id}
                  {...(sortable ? dragProps(g.id, moveOverGroup) : {})}
                >
                  {sortable && <span className="sos-grip" aria-hidden="true">⠿</span>}
                  <div className="sos-name">{g.name || g.id}</div>
                  {/website/i.test(g.name) && <span className="sos-badge sos-badge--public">public unit list</span>}
                </div>
              ))}
            </div>
          )
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
            <h2>Space type catalogue</h2>
            <p className="sos-sub">
              Every space type this company can sell — drag to arrange them.
              (Demo data until the company read is wired.)
            </p>
            <div className="sos-rows">
              {orderedCatalogue.map((t) => (
                <div
                  className={`sos-row sos-row--draggable${draggingId === t.id ? ' sos-row--dragging' : ''}`}
                  key={t.id}
                  {...dragProps(t.id, moveOverCatalogue)}
                >
                  <span className="sos-grip" aria-hidden="true">⠿</span>
                  <div className="sos-name">
                    {t.label}
                    <small>{t.key}</small>
                  </div>
                  {t.coverage && <span className="sos-badge">coverage</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'group' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Space groups</h2>
            <p className="sos-sub">Each property sells its units through one of several groups — only the “Website Group” is the public list.</p>
            {propertyPicker('sos-group')}
            {groupRows(false)}
          </div>
        </section>
      )}

      {tab === 'property' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Space groups at this property</h2>
            <p className="sos-sub">
              The widget sits on the dynamic property page, so pick the property first —
              these are its space groups, live from Hummingbird. Drag to arrange them.
            </p>
            {propertyPicker('sos-property')}
            {groupRows(true)}
            <div className="sos-actions">
              <button
                type="button"
                className="sos-save"
                disabled={!selectedId || groups?.status !== 'ready'}
                onClick={onSave}
              >
                Save
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
