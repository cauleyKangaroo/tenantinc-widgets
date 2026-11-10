// ===========================================================================
// Spacelist-Ordering — the Widget Builder's external settings panel, as React.
//
// This is NOT a Duda page widget. It is the app behind the Widget Builder's
// "Embed your own external widget settings": Duda iframes the emitted shell
// (dist/spacelist-ordering-settings.html) every time the widget is added or
// edited, appending the instance on the query string —
//   ?siteId=…&elementId=…&widgetId=…&page=…&locale=…&version=…
// (https://developer.duda.co/docs/iframed-configuration). There is NO
// postMessage/data.config bridge for this input type, so the panel talks to
// the tenant-proxy instead; the shell forwards Duda's params here as props.
//
// THE DATA, all through the tenant-proxy (branch feat/spacelist-settings):
//   GET  /api/spacelist/rows      — the property roster: the site's own
//        `PropertiesInternal` rows, the same ones the dynamic property pages
//        are built from. Each row also carries its `spaceGroupId` (the public
//        "Website Group") — the second id the groups call needs.
//   GET  /api/spacelist/groups?propertyId&spaceGroupId — the property's space
//        groups, LIVE: the proxy reads the site's `login_api_base` site text
//        from the Duda content library (the thing this iframe cannot do) and
//        forwards to that deployment's hb passthrough, which holds the site's
//        storage key. Groups carry no id upstream — the distinct NAME is the
//        identity, so names are what the order holds.
//   GET/POST /api/spacelist/settings — persistence ON THE PROPERTY'S OWN ROW:
//        Save PATCHes the picked property's PropertiesInternal row, writing
//        {"groupOrder": [names…]} as JSON into its `config` column (the proxy
//        adds the column when absent). The dynamic property page binds that
//        same row, so the widget reads its arrangement with the row it
//        already has — no extra collection, no extra read.
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
interface RosterItem { id: string; name: string; spaceGroupId: string; pagePath: string }
/** A space group as the proxy reduces it: no upstream id, the NAME is the identity. */
interface SpaceGroup { name: string; tiers: number }

type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

/**
 * The property whose dynamic page this panel was opened on, best-effort.
 *
 * Duda appends `page` to the iframe URL ("the same as the page URL"), so on a
 * dynamic property page it is expected to name the row's path. Matched against
 * each roster row's own page path — the whole path first, then its unique tail
 * segment ("storage-outlet-chino-340079518"), so a site base path like
 * /storage-units/ cannot spoil the match. A roster of one needs no match at
 * all. No match leaves the dropdown unselected — the editor can always pick
 * (or switch to) any property by hand.
 */
function autoSelect(items: RosterItem[], page: string): string {
  if (items.length === 1) return items[0].id;
  const p = page.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!p) return '';
  for (const item of items) {
    if (!item.pagePath) continue;
    const tail = item.pagePath.split('/').pop() ?? '';
    if (p === item.pagePath || p.endsWith(`/${item.pagePath}`) || (tail && (p === tail || p.endsWith(`/${tail}`)))) {
      return item.id;
    }
  }
  return '';
}

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
            return {
              id,
              name: plainText(fields.name).trim() || id,
              // The curated "Website Group" id — see @shared/internalProperties.
              spaceGroupId: plainText(fields.spaceGroupId).trim(),
              // The row's dynamic-page path (`state/city/property-name-<id>`),
              // for matching the page this panel was opened on. Duda keeps it
              // at ROW level (`page_item_url`); the slug column is the backup.
              pagePath: (plainText((row as Record<string, unknown>).page_item_url).trim()
                || plainText(fields.slug).trim()).replace(/^\/+|\/+$/g, '').toLowerCase(),
            };
          })
          .filter((r): r is RosterItem => r !== null)
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));
        setRoster({ status: 'ready', data: items });
        setSelectedId((already) => already || autoSelect(items, page));
      })
      .catch((err: Error) => { if (!cancelled) setRoster({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [siteId, page]);

  const rosterItems = roster.status === 'ready' ? roster.data : [];
  const selected = rosterItems.find((p) => p.id === selectedId);

  /* ── Saved arrangements, read back on load ──────────────────────────────
     GET /settings maps property id → the parsed `config` JSON off its row.
     Failing soft here only costs the restored state. ── */
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!siteId) return undefined;
    let cancelled = false;
    fetch(`${PROXY_BASE}/api/spacelist/settings?siteId=${encodeURIComponent(siteId)}`, { headers: PROXY_HEADERS })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ properties?: Record<string, { groupOrder?: unknown }> }>;
      })
      .then((json) => {
        if (cancelled || !json.properties) return;
        const saved: Record<string, string[]> = {};
        for (const [pid, cfg] of Object.entries(json.properties)) {
          if (Array.isArray(cfg?.groupOrder)) saved[pid] = cfg.groupOrder.map(String);
        }
        // Local arrangements the editor already made this session win.
        setGroupOrders((prev) => ({ ...saved, ...prev }));
      })
      .catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.warn('[spacelist-settings] saved settings read failed:', err.message);
      });
    return () => { cancelled = true; };
  }, [siteId]);

  /* ── The picked property's space groups, live via the proxy ────────────── */
  const [groups, setGroups] = useState<Loadable<SpaceGroup[]> | null>(null);
  const groupsCache = useRef(new Map<string, Promise<SpaceGroup[]>>());
  useEffect(() => {
    if (!selected) { setGroups(null); return undefined; }
    if (!selected.spaceGroupId) {
      setGroups({
        status: 'error',
        message: `the ${selected.name} row in PropertiesInternal has no spaceGroupId — fill that column in first`,
      });
      return undefined;
    }
    let cancelled = false;
    setGroups({ status: 'loading' });
    const key = `${selected.id}|${selected.spaceGroupId}`;
    const cached = groupsCache.current.get(key)
      ?? fetch(
        `${PROXY_BASE}/api/spacelist/groups?siteId=${encodeURIComponent(siteId)}`
        + `&propertyId=${encodeURIComponent(selected.id)}&spaceGroupId=${encodeURIComponent(selected.spaceGroupId)}`,
        { headers: PROXY_HEADERS },
      ).then(async (res) => {
        const json = await res.json().catch(() => undefined) as
          { ok?: boolean; groups?: SpaceGroup[]; error?: { message?: string } } | undefined;
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
        return json.groups ?? [];
      });
    groupsCache.current.set(key, cached);
    cached
      .then((list) => { if (!cancelled) setGroups({ status: 'ready', data: list }); })
      .catch((err: Error) => {
        if (cancelled) return;
        groupsCache.current.delete(key); // a failure must not be cached forever
        setGroups({ status: 'error', message: err.message });
      });
    return () => { cancelled = true; };
  }, [selected, siteId]);

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
   * Per-property GROUP arrangement — group NAMES, the only identity upstream
   * provides. The saved order SORTS the live list rather than replacing it:
   * names it does not mention sink to the end (new groups appear rather than
   * vanish) and names the property no longer has are ignored by the join.
   */
  const groupList = groups?.status === 'ready' ? groups.data : [];
  const groupOrder = useMemo(() => {
    const base = groupList.map((g) => g.name);
    const saved = selectedId ? groupOrders[selectedId] : undefined;
    if (!saved?.length) return base;
    const rank = new Map(saved.map((name, i) => [name, i]));
    return [...base].sort((a, b) => (rank.get(a) ?? saved.length) - (rank.get(b) ?? saved.length));
  }, [groupList, selectedId, groupOrders]);
  const orderedGroups = useMemo(
    () => groupOrder.map((name) => groupList.find((g) => g.name === name)).filter((g): g is SpaceGroup => !!g),
    [groupOrder, groupList],
  );
  const moveOverGroup = (overName: string) => {
    const from = dragId.current;
    if (!from || from === overName || !selectedId) return;
    const pid = selectedId;
    setGroupOrders((prev) => ({ ...prev, [pid]: reorder(prev[pid] ?? groupOrder, from, overName) }));
  };

  /* ── Save — PATCHes the picked property's PropertiesInternal row:
       config = {"groupOrder": [names…]} as JSON. ── */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const onSave = () => {
    if (!selectedId || saveState === 'saving') return;
    const payload = { propertyId: selectedId, order: orderedGroups.map((g) => g.name) };
    // eslint-disable-next-line no-console
    console.log('[spacelist-settings] SAVE', { siteId, propertyName: selected?.name, ...payload });
    setSaveState('saving');
    setSaveError('');
    fetch(`${PROXY_BASE}/api/spacelist/settings?siteId=${encodeURIComponent(siteId)}`, {
      method: 'POST',
      headers: { ...PROXY_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => undefined) as
          { ok?: boolean; config?: unknown; error?: { message?: string } } | undefined;
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

  const groupRows = (sortable: boolean) => (
    !selectedId ? <div className="sos-state">Pick a property to see its space groups.</div>
      : !groups || groups.status !== 'ready' ? (groups && stateLine(groups, 'space groups'))
        : !groups.data.length ? <div className="sos-state">This property has no space groups.</div>
          : (
            <div className="sos-rows">
              {(sortable ? orderedGroups : groups.data).map((g) => (
                <div
                  className={`sos-row${sortable ? ' sos-row--draggable' : ''}${draggingId === g.name ? ' sos-row--dragging' : ''}`}
                  key={g.name}
                  {...(sortable ? dragProps(g.name, moveOverGroup) : {})}
                >
                  {sortable && <span className="sos-grip" aria-hidden="true">⠿</span>}
                  <div className="sos-name">
                    {g.name}
                    <small>{g.tiers} tier{g.tiers === 1 ? '' : 's'}</small>
                  </div>
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
            <p className="sos-sub">
              The picked property’s groups, live from Hummingbird through the site’s own
              hb proxy (the row’s <code>spaceGroupId</code> names its public “Website Group”).
            </p>
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
              The widget sits on the dynamic property page, so pick the property first,
              then drag its groups into order. Save writes the order as JSON into the
              property’s own <code>config</code> column on <code>PropertiesInternal</code>.
            </p>
            {propertyPicker('sos-property')}
            {groupRows(true)}
            <div className="sos-actions">
              {saveState === 'error' && (
                <span className="sos-state sos-state--error" role="alert">Save failed: {saveError}</span>
              )}
              {saveState === 'saved' && <span className="sos-saved" role="status">Saved ✓</span>}
              <button
                type="button"
                className="sos-save"
                disabled={!selectedId || groups?.status !== 'ready' || saveState === 'saving'}
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
