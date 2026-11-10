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
// WHAT IS LIVE vs STATIC right now:
//   LIVE — the property roster (GET {PROXY}/api/spacelist/rows: the site's
//     own `PropertiesInternal` rows, the same ones the dynamic property pages
//     are built from), and PERSISTENCE: Save writes the picked property's
//     group order to the `spacelistConfig` collection
//     (POST {PROXY}/api/spacelist/settings, one row per instanceKey +
//     propertyId), and the panel reads every saved arrangement back on load
//     (GET …/settings).
//   STATIC — the space-group list itself (and the Company tab's catalogue):
//     the live hb read is parked until the proxy has a storage key the
//     gateway accepts; the list below is demo data shaped like the real
//     /space-groups answer. The ORDER the editor arranges is what persists,
//     so swapping the list for the live one later changes no save shape.
//
// The property is picked FIRST because the widget sits on the DYNAMIC property
// page: the panel cannot know which property a visit will render, so the
// arrangement is per property.
// ===========================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { plainText } from '@shared/dudaCollections';
import './SpacelistSettings.css';

/*
 * TEMPORARY — local testing only. The tenant-proxy runs on the developer's
 * machine behind ngrok; this is the account's STATIC domain, so it survives
 * tunnel restarts. The bypass header is sent on every call (without it ngrok
 * answers a browser fetch with its warning interstitial instead of JSON; the
 * proxy's CORS allow-list includes the header). Replace with the deployed
 * proxy origin — or a prop — before this leaves testing.
 */
const PROXY_BASE = 'https://included-shepherd-above.ngrok-free.app';
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

/* ── STATIC space groups — demo data shaped like the live /space-groups
     answer (names from real portfolios; see @shared/spaceGroups). The ids are
     stable slugs so a saved order survives reloads; they are replaced by the
     real group ids when the live read returns. ── */
const GROUPS: SpaceGroup[] = [
  { id: 'website-group', name: 'Website Group' },
  { id: 'inside-units', name: 'INSIDE UNITS' },
  { id: 'high-ceilings', name: 'HIGH CEILINGS' },
  { id: 'close-to-entrance', name: 'Closet to Office/ Entrance' },
  { id: 'trade-show-group', name: 'Trade Show Group' },
];

/* ── Company-tab DEMO catalogue — still static; kept as the design reference. ── */
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

  /* ── Saved arrangements, read back on load ──────────────────────────────
     GET /api/spacelist/settings answers every row this instance has saved:
     `config.properties` maps propertyId → its order. Failing soft here only
     costs the restored state — the editor can still arrange and save. ── */
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!siteId || !elementId) return undefined;
    let cancelled = false;
    fetch(
      `${PROXY_BASE}/api/spacelist/settings?siteId=${encodeURIComponent(siteId)}&elementId=${encodeURIComponent(elementId)}`,
      { headers: PROXY_HEADERS },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ config?: { properties?: Record<string, string[]> } | null }>;
      })
      .then((json) => {
        if (cancelled || !json.config?.properties) return;
        setGroupOrders((prev) => ({ ...json.config!.properties, ...prev }));
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.warn('[spacelist-settings] saved settings read failed:', err.message);
      });
    return () => { cancelled = true; };
  }, [siteId, elementId]);

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
   * Per-property GROUP arrangement — the saved order when there is one, else
   * the list's own order. A saved order only SORTS the known groups: ids it
   * does not mention sink to the end (new groups appear rather than vanish),
   * and ids the list no longer has are ignored by the join below.
   */
  const groupOrder = useMemo(() => {
    const saved = selectedId ? groupOrders[selectedId] : undefined;
    const base = GROUPS.map((g) => g.id);
    if (!saved?.length) return base;
    const rank = new Map(saved.map((id, i) => [id, i]));
    return [...base].sort((a, b) => (rank.get(a) ?? saved.length) - (rank.get(b) ?? saved.length));
  }, [selectedId, groupOrders]);
  const orderedGroups = useMemo(
    () => groupOrder.map((id) => GROUPS.find((g) => g.id === id)).filter((g): g is SpaceGroup => !!g),
    [groupOrder],
  );
  const moveOverGroup = (overId: string) => {
    const from = dragId.current;
    if (!from || from === overId || !selectedId) return;
    const pid = selectedId;
    setGroupOrders((prev) => ({ ...prev, [pid]: reorder(prev[pid] ?? groupOrder, from, overId) }));
  };

  const rosterItems = roster.status === 'ready' ? roster.data : [];
  const selected = rosterItems.find((p) => p.id === selectedId);

  /* ── Save — writes THIS property's arrangement to the spacelistConfig
       collection (one row per instanceKey + propertyId; other properties'
       rows are untouched by design, see the proxy route). ── */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const onSave = () => {
    if (!selectedId || saveState === 'saving') return;
    const payload = {
      elementId,
      orders: [{ propertyId: selectedId, order: orderedGroups.map((g) => g.id) }],
    };
    // eslint-disable-next-line no-console
    console.log('[spacelist-settings] SAVE', { siteId, instanceKey: `${siteId}_${elementId}`, propertyName: selected?.name, ...payload });
    setSaveState('saving');
    setSaveError('');
    fetch(`${PROXY_BASE}/api/spacelist/settings?siteId=${encodeURIComponent(siteId)}`, {
      method: 'POST',
      headers: { ...PROXY_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => undefined) as
          { ok?: boolean; created?: number; updated?: number; error?: { message?: string } } | undefined;
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
        // eslint-disable-next-line no-console
        console.log('[spacelist-settings] SAVED', json);
        setSaveState('saved');
        window.setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error('[spacelist-settings] save failed:', err.message);
        setSaveState('error');
        setSaveError(err.message);
      });
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
            <p className="sos-sub">
              Each property sells its units through one of several groups — only the
              “Website Group” is the public list. (Demo data until the live read is wired.)
            </p>
            <div className="sos-rows">
              {GROUPS.map((g) => (
                <div className="sos-row" key={g.id}>
                  <div className="sos-name">{g.name}</div>
                  {/website/i.test(g.name) && <span className="sos-badge sos-badge--public">public unit list</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'property' && (
        <section className="sos-panel" role="tabpanel">
          <div className="sos-card">
            <h2>Space groups at this property</h2>
            <p className="sos-sub">
              The widget sits on the dynamic property page, so pick the property first,
              then drag its groups into order. Save writes THIS property’s order to the
              site’s <code>spacelistConfig</code> collection. (Group names are demo data
              until the live read is wired — the saved order is real.)
            </p>
            {propertyPicker('sos-property')}
            {!selectedId ? (
              roster.status === 'loading'
                ? stateLine(roster, 'properties')
                : roster.status === 'ready'
                  ? <div className="sos-state">Pick a property to arrange its space groups.</div>
                  : null
            ) : (
              <div className="sos-rows">
                {orderedGroups.map((g) => (
                  <div
                    className={`sos-row sos-row--draggable${draggingId === g.id ? ' sos-row--dragging' : ''}`}
                    key={g.id}
                    {...dragProps(g.id, moveOverGroup)}
                  >
                    <span className="sos-grip" aria-hidden="true">⠿</span>
                    <div className="sos-name">{g.name}</div>
                    {/website/i.test(g.name) && <span className="sos-badge sos-badge--public">public unit list</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="sos-actions">
              {saveState === 'error' && (
                <span className="sos-state sos-state--error" role="alert">Save failed: {saveError}</span>
              )}
              {saveState === 'saved' && <span className="sos-saved" role="status">Saved ✓</span>}
              <button
                type="button"
                className="sos-save"
                disabled={!selectedId || saveState === 'saving'}
                onClick={onSave}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
