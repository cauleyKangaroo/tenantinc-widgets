// ===========================================================================
// The operator's saved section ordering — the `config` column on the
// property's own `PropertiesInternal` row, written by the Widget Builder
// settings panel (settings-spacelist-ordering):
//
//   { "groupOrder": ["storage","parking","wine",…],     // section (type) keys
//     "sizeOrder":  ["extra_small","small",…] }          // bands within storage
//
// Present, it outranks the content panel's categoryOrdering radio and the
// sortBy band direction; absent, the widget behaves exactly as before.
//
// TWO WAYS IT REACHES THE WIDGET:
//   1. The collection row, read client-side (`fetchOrderConfig`) — published
//      pages, where dmAPI exists. Fails soft to null everywhere else.
//   2. A postMessage broadcast (`orderConfigFromMessage`) — the Duda EDITOR,
//      where dmAPI is undefined and nothing could be re-read: the settings
//      panel announces each save to every frame, and the widget applies it
//      live, so the editor sees the new order without publishing or leaving
//      the editor. The payload is validated structurally and can only ever
//      change ordering, so no origin pinning is required — the panel's origin
//      is ours but the message crosses Duda's editor frames, whose origins we
//      do not control.
// ===========================================================================

import { str, plainText } from '@shared/dudaCollections';
import { boundJson } from '@shared/propertyBinding';
import { readInternalProperties } from '@shared/internalProperties';

export interface SpacelistOrderConfig {
  groupOrder?: string[];
  sizeOrder?: string[];
}

/** The broadcast's `type` — shared contract with settings-spacelist-ordering. */
export const ORDER_CONFIG_MESSAGE_TYPE = 'ti.spacelist.orderConfig';

const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.length && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined;

/**
 * The `config` cell's value → a usable order config, or null.
 *
 * The collection is NATIVE, so the cell can arrive rteBlock-wrapped and the
 * JSON as text — plainText + boundJson is the same treatment every other
 * column of this collection gets. Null for anything that does not carry at
 * least one order: a malformed cell must never outrank the default behaviour.
 */
export function parseOrderConfig(raw: unknown): SpacelistOrderConfig | null {
  const parsed = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : boundJson<Record<string, unknown>>(plainText(raw));
  if (!parsed || typeof parsed !== 'object') return null;
  const groupOrder = strings(parsed.groupOrder);
  const sizeOrder = strings(parsed.sizeOrder);
  if (!groupOrder && !sizeOrder) return null;
  return { ...(groupOrder ? { groupOrder } : {}), ...(sizeOrder ? { sizeOrder } : {}) };
}

/**
 * The saved ordering for one property, from its collection row. Null when
 * there is no dmAPI (the Duda editor, the dev harness), no row, or no usable
 * config — the widget then keeps its current behaviour.
 */
export async function fetchOrderConfig(propertyId: string): Promise<SpacelistOrderConfig | null> {
  const wanted = propertyId.trim();
  if (!wanted) return null;
  try {
    const row = (await readInternalProperties())
      .find((r) => str(r.id).trim() === wanted);
    if (!row) return null;
    return parseOrderConfig(row.config);
  } catch {
    return null;
  }
}

/**
 * A settings-panel broadcast → `{ propertyId, config }`, or null for anything
 * that is not exactly that message. Structural validation is the whole gate —
 * see the module comment.
 */
export function orderConfigFromMessage(
  data: unknown,
): { propertyId: string; config: SpacelistOrderConfig } | null {
  if (!data || typeof data !== 'object') return null;
  const m = data as Record<string, unknown>;
  if (m.type !== ORDER_CONFIG_MESSAGE_TYPE) return null;
  if (typeof m.propertyId !== 'string' || !m.propertyId.trim()) return null;
  const config = parseOrderConfig(m.config);
  if (!config) return null;
  return { propertyId: m.propertyId.trim(), config };
}
