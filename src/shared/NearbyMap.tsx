import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Self-contained nearby map: a keyless Google `output=embed` iframe as the
// (non-interactive) background — same approach as the property-info map — with
// price pins overlaid on top. Pins are positioned by projecting each point's
// lat/lng to pixels via Web Mercator at the map's zoom, so they align with the
// embed. The iframe is pointer-events:none so panning can't drift the overlay.
//
// No external scripts, no API key → safe inside the AMD bundle / Duda CSP.

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
}: NearbyMapProps) {
  const ref = useRef<HTMLDivElement>(null);
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

  const zoom = fitZoom(center, points, width, boxHeight);
  const scale = TILE * 2 ** zoom;
  const c = worldXY(center.lat, center.lng);

  // Classic Maps embed centers on ll at the given zoom without dropping a pin.
  const src = `https://maps.google.com/maps?ll=${center.lat},${center.lng}&z=${zoom}&output=embed`;

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
      <iframe
        title="Nearby properties map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
      />

      {/* Reference marker (viewer / current property) at the map centre. */}
      {/* Either switch hides it; the dot only shows when neither says otherwise. */}
      {showCenterMarker && !hideCenterMarker && (
        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%', background: '#101318',
          border: '3px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      )}

      {/* Price pins — clickable (the iframe below is pointer-events:none). */}
      {width > 0 && renderPin && positioned.map((p) => (
        <React.Fragment key={p.id}>{renderPin(p)}</React.Fragment>
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
            textAlign: 'left', zIndex: 2,
          }}
        >
          {open.name && (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#101318' }}>{open.name}</p>
          )}
          {open.distance && (
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#509e2f' }}>{open.distance}</p>
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
  );
}
