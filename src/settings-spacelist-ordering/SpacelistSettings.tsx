// ===========================================================================
// Spacelist-Ordering — the Widget Builder's external settings panel, as React.
//
// This is NOT a Duda page widget. It is the app behind the Widget Builder's
// "Embed your own external widget settings": Duda iframes the emitted shell
// (dist/spacelist-ordering-settings.html) every time the widget is added or
// edited, appending the instance on the query string —
//   ?siteId=…&elementId=…&widgetId=…&page=…&locale=…&version=…
// (https://developer.duda.co/docs/iframed-configuration). There is NO
// postMessage/data.config bridge for this input type: Duda recommends storing
// settings keyed by elementId + siteId in YOUR system, and the widget's page
// JS receives the same data.elementId/data.siteId to read them back. The shell
// forwards those params here as props, the same way the Duda JS tab forwards
// data.config to a page widget.
//
// STATIC BUILD — deliberately no network calls.
//
// Every list below is bundled DEMO data, so the panel can be mounted in the
// Widget Builder and tested as pure design before any backend exists. The
// live version is specified and was built once (commit f325d81d): property
// roster from the `PropertiesInternal` collection via a tenant-proxy
// collection read, live counts/catalogue/groups via the hb passthrough
// ({hb}/api/hb/{v}/{path}?siteId=…). It comes back once the proxy endpoints
// are in place — the component's shape (tabs, picker, rows) is the contract
// and does not change.
//
// Three tabs mirror the Hummingbird hierarchy:
//   Company        — the company's space-type catalogue (what it CAN sell)
//   Property Group — the picked property's space groups; "Website Group" is
//                    badged — it is the public unit list (see @shared/spaceGroups)
//   Property       — the picked property's storage types with total/vacant
//                    counts. The property is picked FIRST because the widget
//                    sits on the DYNAMIC property page: the panel cannot know
//                    which property a visit will render, so configuration is
//                    per property.
//
// The Save bar is rendered but disabled: persistence (a tenant-proxy upsert
// into a collection row per `{siteId}_{elementId}` + propertyId) comes with
// the live wiring.
// ===========================================================================

import React, { useMemo, useState } from 'react';
import './SpacelistSettings.css';

export interface SpacelistSettingsProps {
  /** Duda's iframe params, forwarded by the shell. */
  siteId?: string;
  elementId?: string;
  widgetId?: string;
  page?: string;
  locale?: string;
}

interface DemoType { id: string; label: string; key: string; coverage?: boolean }
interface DemoCount { typeId: string; total: number; vacant: number }
interface DemoProperty { id: string; name: string; counts: DemoCount[]; groups: string[] }

/* ── DEMO DATA — shaped like the live API answers (space-management/space-types,
     properties?unit_type_counts=true, properties/{id}/space-groups), with the
     group names taken from real portfolios (see @shared/spaceGroups). ── */
const CATALOGUE: DemoType[] = [
  { id: 'T1', label: 'Storage', key: 'storage', coverage: true },
  { id: 'T2', label: 'Parking', key: 'parking' },
  { id: 'T3', label: 'Commercial', key: 'commercial_storage' },
  { id: 'T4', label: 'Wine Storage', key: 'wine' },
];

const PROPERTIES: DemoProperty[] = [
  {
    id: 'P1', name: 'Apex Storage',
    counts: [
      { typeId: 'T1', total: 120, vacant: 14 },
      { typeId: 'T2', total: 30, vacant: 3 },
      { typeId: 'T3', total: 8, vacant: 0 },
    ],
    groups: ['INSIDE UNITS', 'HIGH CEILINGS', 'Closet to Office/ Entrance', 'Website Group'],
  },
  {
    id: 'P2', name: 'Storage Outlet - Chino',
    counts: [
      { typeId: 'T1', total: 50, vacant: 5 },
      { typeId: 'T4', total: 12, vacant: 2 },
    ],
    groups: ['Website Group', 'Trade Show Group', 'Rev Management Groups'],
  },
  {
    id: 'P3', name: 'Storage Outlet - Bellflower',
    counts: [
      { typeId: 'T1', total: 210, vacant: 22 },
      { typeId: 'T2', total: 18, vacant: 1 },
      { typeId: 'T3', total: 6, vacant: 2 },
      { typeId: 'T4', total: 4, vacant: 0 },
    ],
    groups: ['Website Group', 'Close/Closer/Closest to Entrance'],
  },
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
  const selected = PROPERTIES.find((p) => p.id === selectedId);
  const typeById = useMemo(() => new Map(CATALOGUE.map((t) => [t.id, t])), []);

  const propertyPicker = (idPrefix: string) => (
    <div className="sos-picker">
      <label htmlFor={`${idPrefix}-prop`}>
        Property
        <em className="sos-src">demo data</em>
      </label>
      <select id={`${idPrefix}-prop`} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <option value="">— choose a property —</option>
        {PROPERTIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <div className="sos-rows">
              <div className="sos-row">
                <div className="sos-name">
                  {siteId ? `Company of site ${siteId}` : 'Demo Storage Co.'}
                  <small>{PROPERTIES.length} properties on this site</small>
                </div>
                <span className="sos-badge">demo data</span>
              </div>
            </div>
          </div>
          <div className="sos-card">
            <h2>Space type catalogue</h2>
            <p className="sos-sub">Every space type this company can sell. Which of these a property actually offers is on the Property tab.</p>
            <div className="sos-rows">
              {CATALOGUE.map((t) => (
                <div className="sos-row" key={t.id}>
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
            {!selected ? <div className="sos-state">Pick a property to see its groups.</div> : (
              <div className="sos-rows">
                {selected.groups.map((name) => (
                  <div className="sos-row" key={name}>
                    <div className="sos-name">{name}</div>
                    {/website/i.test(name) && <span className="sos-badge sos-badge--public">public unit list</span>}
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
              these are the storage types it offers.
            </p>
            {propertyPicker('sos-property')}
            {!selected ? <div className="sos-state">Pick a property to see its storage types.</div> : (
              <>
                <p className="sos-count-line">
                  <b>{selected.counts.length}</b> storage type{selected.counts.length === 1 ? '' : 's'} at <b>{selected.name}</b>
                  {' '}<span className="sos-badge">demo data</span>
                </p>
                <div className="sos-rows">
                  {selected.counts.map((c) => {
                    const t = typeById.get(c.typeId);
                    return (
                      <div className="sos-row" key={c.typeId}>
                        <div className="sos-name">
                          {t?.label ?? c.typeId}
                          <small>{t?.key ?? ''}</small>
                        </div>
                        <div className="sos-stat"><b>{c.total}</b><span>units</span></div>
                        <div className="sos-stat"><b>{c.vacant}</b><span>vacant</span></div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="sos-savebar">
        <span className="sos-note">Static build for design testing — live data and Save come with the proxy endpoints.</span>
        <button type="button" disabled>Save</button>
      </div>
    </div>
  );
}
