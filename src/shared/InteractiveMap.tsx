// ---------------------------------------------------------------------------
// A draggable, zoomable map of one location.
//
// Renders the keyless `output=embed` iframe FIRST and upgrades to a real map
// once the JS API is available. That order matters: the iframe needs no key and
// already pans on desktop, so a site with no key configured, a blocked script
// or a referrer-rejected key keeps exactly what it has today rather than losing
// its map. Nothing here can leave the card empty.
//
// The upgrade buys one thing the iframe cannot do: ONE-FINGER PAN ON MOBILE.
// Inside an iframe a single finger scrolls the page and two are needed to move
// the map — Google's behaviour, unreachable from our CSS.
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, fetchMapsKey, type GMap } from './googleMaps';
import { DEFAULT_PLACES_BASE } from './placesApi';
import './InteractiveMap.css';

export interface InteractiveMapProps {
  lat: number;
  lng: number;
  /** Accessible name, e.g. "Map of Storage Outlet - Bellflower". */
  title: string;
  /**
   * Proxy base that serves the Maps key from /api/maps/config.
   *
   * The key is NOT a prop: the JS API authenticates from the page so it cannot
   * be hidden, but it need not be hardcoded into the bundle, the Duda JS tab or
   * the harness. One place to configure, one place to rotate.
   */
  proxyBase?: string;
  zoom?: number;
  className?: string;
}

const DEFAULT_ZOOM = 15;
/** Google's own limits — clamping here stops the buttons queueing dead zooms. */
const MIN_ZOOM = 3;
const MAX_ZOOM = 20;

export function InteractiveMap({
  lat, lng, title, proxyBase, zoom = DEFAULT_ZOOM, className,
}: InteractiveMapProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GMap | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let dead = false;

    void fetchMapsKey(proxyBase || DEFAULT_PLACES_BASE)
      .then((key) => (key ? loadGoogleMaps(key) : null))
      .then((api) => {
      if (dead || !api || !holder.current) return;
      const center = { lat, lng };
      const map = new api.Map(holder.current, {
        center,
        zoom,
        /*
         * THE POINT OF THE WHOLE CHANGE. 'greedy' makes one finger pan the map
         * instead of scrolling the page, which is what an iframe cannot do.
         * The trade is that a one-finger drag starting on the map no longer
         * scrolls past it — acceptable for a card-sized map with page either
         * side of it, and it is what "grab and move around" asks for.
         */
        gestureHandling: 'greedy',
        zoomControl: false,        // ours, so they match the card
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // Points of interest stay: a storage unit's neighbours are useful
        // context, and hiding them makes the map look broken rather than clean.
      });
      new api.Marker({ position: center, map, title });
      mapRef.current = map;
      if (!dead) setLive(true);
    });

    return () => { dead = true; };
  }, [proxyBase, lat, lng, zoom, title]);

  // Re-centre without rebuilding when the bound property changes on a dynamic
  // page — a fresh Map instance would flash and re-download tiles.
  useEffect(() => { mapRef.current?.panTo({ lat, lng }); }, [lat, lng]);

  const nudge = (by: number) => {
    const m = mapRef.current;
    if (!m) return;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (m.getZoom() ?? zoom) + by));
    m.setZoom(next);
  };

  return (
    <div className={`im-wrap${className ? ` ${className}` : ''}`}>
      {/* Kept mounted until the real map is ready, so there is never a blank
          box between the two. */}
      {!live && (
        <iframe
          className="im-frame"
          title={title}
          src={`https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      {/* Always mounted and sized: google.maps.Map measures the element it is
          given, so it cannot be display:none at construction. Idle it is
          pointer-transparent, and it only claims the application role once
          there is actually a map to interact with. */}
      <div
        ref={holder}
        className={`im-canvas${live ? '' : ' im-canvas--idle'}`}
        aria-label={live ? title : undefined}
        role={live ? 'application' : undefined}
        aria-hidden={live ? undefined : true}
      />

      {live && (
        <div className="im-zoom">
          <button type="button" className="im-zoom-btn" onClick={() => nudge(1)} aria-label="Zoom in">+</button>
          <button type="button" className="im-zoom-btn" onClick={() => nudge(-1)} aria-label="Zoom out">−</button>
        </div>
      )}
    </div>
  );
}
