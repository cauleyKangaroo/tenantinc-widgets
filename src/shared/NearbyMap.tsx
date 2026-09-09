import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadGoogleMaps, fetchMapsKey, type GMap } from './googleMaps';
import { DEFAULT_PLACES_BASE } from './placesApi';

// Nearby map: price pins overlaid on a Google map. Pins are positioned by
// projecting each point's lat/lng to pixels via Web Mercator at the map's
// centre and zoom, so they sit where they belong on the tiles beneath.
//
// TWO BACKGROUNDS, AND THE OVERLAY MATH IS SHARED
//
// Without a Maps key it is the keyless `output=embed` iframe, frozen at a
// computed fit-zoom and pointer-events:none — panning it would drift the pins
// out of alignment, and inside an iframe we cannot know it moved. That is the
// ORIGINAL behaviour and it is still exactly what a keyless site gets.
//
// With a key it upgrades to a real google.maps.Map that the visitor can drag
// and zoom, and the same projection re-runs against the map's LIVE centre and
// zoom on every move, so the pins track the tiles instead of drifting. Web
// Mercator is Google's own projection, which is why one set of maths serves
// both — the static case already proved it lines up.
//
// The pins stay OUR React elements in both modes rather than becoming
// google.maps.Markers: they carry the Figma styling, the click popup and the
// `renderPin` render-prop that #08 depends on, none of which survives being
// handed to Google.

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  /** Pin label, e.g. "$54". Omitted → a plain dot. */
  label?: string;
  /** Property name, shown in the click popup. */
  name?: string;
  /** Extra popup details. */
  address?: string;
  distance?: string;
  active?: boolean;
}

/** A point with its projected pixel position inside the map box. */
export type PositionedPoint = MapPoint & { left: number; top: number };

interface NearbyMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  height?: number | string;
  className?: string;
  /**
   * Draw your own bubble instead of the built-in price pin. The projection,
   * iframe and resize handling stay here; only the marker's look changes.
   *
   * Exists because the pins are inline-styled (so a consumer's CSS can't reach
   * them) and #08's Figma bubbles differ from #07's. Omitted → the original pin,
   * byte-for-byte, so #05 and #07 are untouched.
   */
  renderPin?: (point: PositionedPoint) => React.ReactNode;
  /**
   * The dark dot at the map's centre — "you are here". Pass false when the centre
   * is only a computed midpoint (e.g. the average of the pins) rather than a real
   * place: a marker there tells the viewer something untrue.
   */
  showCenterMarker?: boolean;
  /**
   * The same switch, inverted. Both exist because #08 and the nav's map arrived
   * at it independently and each has live call sites; renaming either would break
   * the other's. `showCenterMarker={false}` and `hideCenterMarker` are equivalent
   * — either one hides the dot (see the render below).
   */
  hideCenterMarker?: boolean;
  /**
   * Proxy base serving the Maps key from /api/maps/config. Omitted → the shared
   * default. No key, a blocked script or a rejected referrer all resolve to the
   * keyless iframe, so a site without one is exactly where it was.
   */
  proxyBase?: string;
  /**
   * Opt IN to the draggable, zoomable map. Default false — every existing
   * caller keeps the frozen embed it was written against.
   *
   * Opt-in rather than opt-out because this component has three live callers
   * (#05's nearby section, #08's map page, the nav's mega-menu) and the last
   * two draw their pins through `renderPin`, sized and placed against a map
   * that cannot move. Flipping all three at once on a shared default would
   * change two widgets nobody asked about.
   */
  interactive?: boolean;
}

const TILE = 256;

/** Normalized (0..1) Web Mercator world coordinates. */
function worldXY(lat: number, lng: number): { x: number; y: number } {
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  const x = (lng + 180) / 360;
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return { x, y };
}

/** Largest integer zoom at which every point fits inside the padded viewport. */
function fitZoom(center: { lat: number; lng: number }, points: MapPoint[], w: number, h: number): number {
  if (!points.length || w === 0) return 12;
  const c = worldXY(center.lat, center.lng);
  const pad = 72; // keep pins off the very edge
  for (let z = 16; z >= 1; z--) {
    const scale = TILE * 2 ** z;
    const ok = points.every((p) => {
      const wp = worldXY(p.lat, p.lng);
      return Math.abs((wp.x - c.x) * scale) <= (w - pad) / 2
        && Math.abs((wp.y - c.y) * scale) <= (h - pad) / 2;
    });
    if (ok) return z;
  }
  return 1;
}

export function NearbyMap({
  center,
  points,
  height = 317,
  className,
  renderPin,
  showCenterMarker = true,
  hideCenterMarker,
  proxyBase,
  interactive = false,
}: NearbyMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  /** The real map is up; the iframe is gone and `view` drives the projection. */
  const [live, setLive] = useState(false);
  /**
   * The map's live centre and zoom, mirrored into React so the pins reproject.
   * Null until the map reports one — until then the computed fit below is the
   * truth, which is also the whole of the keyless path.
   */
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  /**
   * The visitor has grabbed the map. Auto-fitting after that would yank the
   * view back while they are reading it — pins arrive asynchronously, so
   * without this the map would jump under them seconds after they moved it.
   */
  const userMoved = useRef(false);
  const [width, setWidth] = useState(0);
  // Measured, not the `height` prop: that may be a CSS string ('100%') when the
  // map fills a flex row, and the projection below needs real pixels.
  const [boxHeight, setBoxHeight] = useState(typeof height === 'number' ? height : 0);
  const [openId, setOpenId] = useState<string | null>(null);

  // Track the container box so the projection matches the rendered iframe.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    setBoxHeight(el.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
      setBoxHeight(entries[0].contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** The zoom that fits every point — the static view, and the map's start. */
  const fitted = fitZoom(center, points, width, boxHeight);

  /*
   * Project against the LIVE map once there is one, else the computed fit.
   * This single swap is what makes the pins follow a dragged map: everything
   * below is unchanged arithmetic, fed a different centre and zoom.
   */
  const zoom = view ? view.zoom : fitted;
  const projCenter = view ? { lat: view.lat, lng: view.lng } : center;
  const scale = TILE * 2 ** zoom;
  const c = worldXY(projCenter.lat, projCenter.lng);

  // Classic Maps embed centers on ll at the given zoom without dropping a pin.
  const src = `https://maps.google.com/maps?ll=${center.lat},${center.lng}&z=${fitted}&output=embed`;

  /*
   * Construction inputs, in a ref so they can be current without being effect
   * dependencies — the map is built ONCE and then steered, never rebuilt.
   */
  const initRef = useRef({ center, points, width, boxHeight });
  initRef.current = { center, points, width, boxHeight };

  useEffect(() => {
    if (!interactive) return undefined;
    let dead = false;

    void fetchMapsKey(proxyBase || DEFAULT_PLACES_BASE)
      .then((key) => (key ? loadGoogleMaps(key) : null))
      .then((api) => {
        // `mapRef.current` guards the second run of React 18 StrictMode.
        if (dead || !api || !holder.current || mapRef.current) return;
        const { center: ctr, points: pts, width: w, boxHeight: h } = initRef.current;

        const map = new api.Map(holder.current, {
          center: ctr,
          zoom: fitZoom(ctr, pts, w, h),
          // One finger pans, as on #03's map, instead of scrolling the page.
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // Google's own zoom buttons here, unlike #03: this map already
          // carries price pins and a popup, and hand-placed controls would
          // sooner or later land on top of one.
          zoomControl: true,
        });

        /*
         * Mirror the map's centre and zoom into React on every movement. This
         * is the whole mechanism: `view` feeds the projection, so the pins are
         * re-laid-out against the tiles on each frame of a drag rather than
         * sliding out of alignment.
         */
        const sync = () => {
          const cc = map.getCenter();
          const cz = map.getZoom();
          if (!cc || cz == null || dead) return;
          setView({ lat: cc.lat(), lng: cc.lng(), zoom: cz });
        };
        map.addListener('bounds_changed', sync);
        map.addListener('dragstart', () => { userMoved.current = true; });

        mapRef.current = map;
        sync();
        setLive(true);
      });

    return () => { dead = true; };
  }, [interactive, proxyBase]);

  /*
   * Follow the caller's centre WHENEVER IT CHANGES, dragged or not.
   *
   * A new `center` is the parent saying "show this", not a stale default — #08
   * shifts it every time a popup opens so the bubble and its card sit in the
   * middle together. Suppressing that after a drag would leave popups opening
   * off the edge of the map, so this deliberately ignores `userMoved`; the
   * primitive deps mean an unchanged centre re-rendered is not a change.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !live) return;
    map.panTo({ lat: center.lat, lng: center.lng });
  }, [live, center.lat, center.lng]);

  /*
   * Re-fit the ZOOM as the data lands: points arrive from a later call than the
   * card, so the map is built before it knows what it has to show. This one
   * DOES stop at the first drag — re-zooming someone who has settled on a view
   * is the jump `userMoved` exists to prevent.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !live || userMoved.current || !width || !boxHeight) return;
    map.setZoom(fitted);
  }, [live, fitted, width, boxHeight]);

  const positioned = points.map((p) => {
    const wp = worldXY(p.lat, p.lng);
    return { ...p, left: width / 2 + (wp.x - c.x) * scale, top: boxHeight / 2 + (wp.y - c.y) * scale };
  });

  const open = positioned.find((p) => p.id === openId) ?? null;

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', height, borderRadius: 16, overflow: 'hidden' }}
      onClick={() => setOpenId(null)}
    >
      {/* Frozen background. Kept mounted until the real map has painted, so
          there is never a blank box between the two — and it is the ONLY
          background when no key is configured. */}
      {!live && (
        <iframe
          title="Nearby properties map"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
        />
      )}

      {/* The live map. Always mounted and sized — google.maps.Map measures the
          element it is handed, so it cannot be display:none at construction —
          but pointer-transparent until it exists, or an empty div would sit on
          top of the iframe swallowing every gesture. */}
      <div
        ref={holder}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: live ? 'auto' : 'none',
        }}
        aria-hidden={live ? undefined : true}
      />

      {/*
        The overlay. pointer-events:none once the map is live so a drag started
        anywhere between the pins reaches the map underneath; each interactive
        child turns them back on for itself (pointer-events inherits). Frozen,
        it stays 'auto' exactly as before — the iframe below cannot use them.
      */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        pointerEvents: live ? 'none' : 'auto',
      }}>

      {/* Reference marker (viewer / current property) at the map centre. */}
      {/* Either switch hides it; the dot only shows when neither says otherwise. */}
      {showCenterMarker && !hideCenterMarker && (
        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%', background: '#101318',
          border: '3px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      )}

      {/* Price pins — clickable in both modes. The span is static and
          zero-sized, so the absolutely-positioned pin inside it still lays out
          against the overlay; it exists only to hand the pin back its pointer
          events, which it inherits. */}
      {width > 0 && renderPin && positioned.map((p) => (
        <span key={p.id} style={{ pointerEvents: 'auto' }}>{renderPin(p)}</span>
      ))}

      {width > 0 && !renderPin && positioned.map((p) => {
        const activeLook = p.active || p.id === openId;
        return (
          <button
            key={p.id}
            type="button"
            title={p.name}
            onClick={(e) => { e.stopPropagation(); setOpenId((cur) => (cur === p.id ? null : p.id)); }}
            style={{
              position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -100%)',
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              pointerEvents: 'auto',
              padding: p.label ? '4px 9px' : 0,
              width: p.label ? 'auto' : 14,
              height: p.label ? 'auto' : 14,
              borderRadius: p.label ? 14 : '50%',
              background: activeLook ? '#101318' : '#fff',
              color: activeLook ? '#fff' : '#101318',
              border: '2px solid #101318',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              fontFamily: 'inherit', lineHeight: 1.2,
            }}
          >
            {p.label}
          </button>
        );
      })}

      {/* Info popup for the selected pin. */}
      {width > 0 && open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: Math.min(Math.max(open.left, 110), Math.max(width - 110, 110)),
            top: open.top - 44,
            transform: 'translate(-50%, -100%)',
            width: 210, maxWidth: '80%',
            background: '#fff', borderRadius: 12, padding: '12px 14px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.22)', border: '1px solid #e6e9ee',
            textAlign: 'left', zIndex: 2, pointerEvents: 'auto',
          }}
        >
          {open.name && (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#101318' }}>{open.name}</p>
          )}
          {open.distance && (
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--color_1, #f45f30)' }}>{open.distance}</p>
          )}
          {open.address && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#55606b', lineHeight: 1.4 }}>{open.address}</p>
          )}
          {open.label && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#101318' }}>
              Starting at <strong>{open.label}</strong>
            </p>
          )}
          {/* Little pointer tail toward the pin. */}
          <span style={{
            position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%) rotate(45deg)',
            width: 12, height: 12, background: '#fff', borderRight: '1px solid #e6e9ee', borderBottom: '1px solid #e6e9ee',
          }} />
        </div>
      )}

      </div>
    </div>
  );
}
