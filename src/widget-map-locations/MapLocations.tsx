// ===========================================================================
// Widget #08 — Map Locations (city page)
//
// A map of the company's facilities beside a list of them, for a CITY landing
// page: "here's every Storelocal in Irvine".
//
// Data comes from the same place as #07: the Duda `Properties` collection when
// it's available, falling back to the keyed REST call — see @shared/propertiesSource.
// Unlike #07 this one has no "current property": it isn't measuring distance from
// anywhere, it's listing a city, so nothing is excluded and no geolocation is asked
// for.
//
// SCOPE NOTE: built against the widget conventions and the data we already have,
// not a Figma frame — the visual treatment is a sensible first pass and expected
// to change once the design lands.
// ===========================================================================

import React, { useEffect, useState } from 'react';
import './MapLocations.css';
import cfg from './config.json';
import {
  fetchProperties,
  extractNearbyProperties,
  type NearbyBaseProperty,
} from '@shared/nearbyProperties';
import { NearbyMap, type MapPoint } from '@shared/NearbyMap';
import { Shimmer } from '@shared/Shimmer';

// ---------------------------------------------------------------------------
// Demo data — dev harness / Duda editor only, where there's no dmAPI and the
// keyed call may not answer. Never shown before the real data lands (see the
// `loading` flag): it's the EMPTY-result fallback, not a placeholder.
// ---------------------------------------------------------------------------

const DEMO_LOCATIONS: NearbyBaseProperty[] = [
  { id: 'd1', name: 'Storelocal Irvine — Barranca', lat: 33.6846, lng: -117.8265, address: '2192 Barranca Pkwy, Irvine, CA 92606', city: 'Irvine', state: 'CA', phone: '(949) 555-0142' },
  { id: 'd2', name: 'Storelocal Irvine — Jamboree', lat: 33.6725, lng: -117.8312, address: '17942 Jamboree Rd, Irvine, CA 92614', city: 'Irvine', state: 'CA', phone: '(949) 555-0177' },
  { id: 'd3', name: 'Storelocal Irvine — Sand Canyon', lat: 33.6931, lng: -117.7621, address: '15 Sand Canyon Ave, Irvine, CA 92618', city: 'Irvine', state: 'CA', phone: '(949) 555-0198' },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function MapPinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MapLocationsProps {
  heading?: string;
  subheading?: string;
  /**
   * Show only facilities in this city. Bind it to `Properties > Address.city` on a
   * dynamic city page, or type it in. Blank = every facility the company has.
   * Matched case-insensitively against the property's own city field, not the
   * formatted address string.
   */
  city?: string;
  /** Map height in px. Default 420. */
  mapHeight?: number | string;
  /** Copy for each location's link. */
  ctaLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapLocations({
  heading = 'Our Locations',
  subheading = 'Find a storage facility near you.',
  city = '',
  mapHeight = 420,
  ctaLabel = 'View facility',
}: MapLocationsProps) {
  // null = still loading; [] = loaded with nothing to show.
  const [live, setLive] = useState<NearbyBaseProperty[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // No requirePropertyId: a city page wants EVERY property, so there's no single
    // id to trust the collection against.
    fetchProperties(cfg)
      .then((raw) => {
        if (!cancelled) setLive(extractNearbyProperties(raw, cfg.appId));
      })
      .catch((err) => {
        console.error('[MapLocations] fetchProperties error:', err);
        if (!cancelled) setLive([]);
      });
    return () => { cancelled = true; };
  }, []);

  const loading = live === null;
  const all = live && live.length ? live : DEMO_LOCATIONS;

  const wanted = city.trim().toLowerCase();
  const locations = wanted
    ? all.filter((p) => (p.city ?? '').trim().toLowerCase() === wanted)
    : all;

  const points: MapPoint[] = locations.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    name: p.name,
    address: p.address,
    active: p.id === activeId,
  }));

  // Centre on the first location — every pin is in one city, so that's close
  // enough without averaging coordinates.
  const center = locations.length ? { lat: locations[0].lat, lng: locations[0].lng } : null;

  const headingBlock = (
    <div className="ml-heading-block">
      <div className="ml-title">{heading}</div>
      {subheading && <p className="ml-subtitle">{subheading}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="ml-wrapper">
        {headingBlock}
        <div className="ml-row">
          <Shimmer h={mapHeight} r={16} />
          <div className="ml-list">
            {[0, 1, 2].map((i) => (
              <div className="ml-card" key={i}>
                <Shimmer w="70%" h={22} mb={10} />
                <Shimmer w="90%" h={15} mb={8} />
                <Shimmer w={140} h={15} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div className="ml-wrapper">
        {headingBlock}
        <p className="ml-empty">
          {wanted ? `No facilities found in ${city}.` : 'No facilities found.'}
        </p>
      </div>
    );
  }

  return (
    // --ml-map-h lets the list's scroll height follow mapHeight (see the CSS).
    // A custom property rather than an inline max-height, so the mobile rule
    // (max-height: none) can still win.
    <div className="ml-wrapper" style={{ ['--ml-map-h' as string]: `${Number(mapHeight) || 420}px` }}>
      {headingBlock}

      <div className="ml-row">
        <div className="ml-map">
          {center && <NearbyMap center={center} points={points} height={Number(mapHeight) || 420} />}
        </div>

        <div className="ml-list">
          {locations.map((p) => (
            <div
              key={p.id}
              className={`ml-card${p.id === activeId ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveId(p.id)}
              onMouseLeave={() => setActiveId(null)}
            >
              <p className="ml-card-name">{p.name}</p>
              {p.address && (
                <a
                  className="ml-card-row"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPinIcon />
                  <span>{p.address}</span>
                </a>
              )}
              {p.phone && (
                <a className="ml-card-row" href={`tel:${p.phone.replace(/[^0-9+]/g, '')}`}>
                  <PhoneIcon />
                  <span>{p.phone}</span>
                </a>
              )}
              <a className="ml-card-cta" href="#">{ctaLabel}</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
