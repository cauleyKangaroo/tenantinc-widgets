// ===========================================================================
// Address field with Google-backed suggestions (via the Kangaroo proxy).
//
// A normal text input first and an autocomplete second: everything still works
// typed by hand if the proxy is down, rate-limited, or the shopper simply
// ignores the list. Picking a suggestion is a shortcut, never the only route.
// ===========================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPlaceDetails, fetchPlaceSuggestions, newSessionToken,
  type PlaceDetails, type PlacePrediction,
} from './placesApi';
import './AddressAutocomplete.css';

/** After the shopper stops typing. One request per pause, not per keystroke —
 *  every request costs money and 120/min is the proxy's per-IP ceiling. */
const DEBOUNCE_MS = 300;

export function AddressAutocomplete({
  value, onChange, onPick, base, country, disabled, children,
}: {
  value: string;
  onChange: (v: string) => void;
  /** A suggestion was chosen — city, state, zip and coordinates arrive here. */
  onPick?: (place: PlaceDetails) => void;
  /** Proxy base URL; defaults to the shared sandbox host. */
  base?: string;
  country?: string;
  disabled?: boolean;
  /** The field itself. Rendered by the caller so this works with any input. */
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  // One token per lookup, reused across the typing and the closing details
  // call, then replaced. See the note in placesApi.
  const tokenRef = useRef<string>(newSessionToken());
  // The value we last PICKED. Re-querying it would reopen the list on the very
  // text the shopper just chose.
  const pickedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (disabled) return undefined;
    if (pickedRef.current !== null && pickedRef.current === value) return undefined;
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      void fetchPlaceSuggestions(value, {
        base, country, sessionToken: tokenRef.current, signal: ctrl.signal,
      }).then((list) => {
        if (ctrl.signal.aborted) return;
        setItems(list);
        setActive(-1);
        setOpen(list.length > 0);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, base, country, disabled]);

  // Close on an outside click, like any other menu.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = useCallback(async (p: PlacePrediction) => {
    setOpen(false);
    setItems([]);
    // Show the street line immediately; the rest of the address follows when
    // details resolves. Waiting would leave the field looking unresponsive.
    pickedRef.current = p.mainText;
    onChange(p.mainText);
    const place = await fetchPlaceDetails(p.placeId, { base, sessionToken: tokenRef.current });
    // The session is spent whether or not it answered.
    tokenRef.current = newSessionToken();
    if (!place) return;
    // Prefer the fuller street from details ("Mount Vernon" over "Mt Vernon").
    if (place.address.street) {
      pickedRef.current = place.address.street;
      onChange(place.address.street);
    }
    onPick?.(place);
  }, [base, onChange, onPick]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); void choose(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="hb-addr" ref={wrapRef} onKeyDown={onKeyDown}>
      {children}
      {open && items.length > 0 && (
        <ul className="hb-addr-menu" role="listbox" aria-label="Address suggestions">
          {items.map((p, i) => (
            <li key={p.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`hb-addr-opt${i === active ? ' hb-addr-opt--active' : ''}`}
                // mousedown, not click: the input's blur would close the list
                // before a click ever landed.
                onMouseDown={(e) => { e.preventDefault(); void choose(p); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="hb-addr-main">{p.mainText}</span>
                <span className="hb-addr-sub">{p.secondaryText}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
