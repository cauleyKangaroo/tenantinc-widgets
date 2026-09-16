// ===========================================================================
// Widget #22 — Locations Banner
//
// A full-width 85px bar with one line of centred text: "See our 103 Locations".
//
// The MESSAGE is the operator's, written in the Duda content menu, and the
// number is substituted into it wherever they put a `{num}` token — so the same
// widget renders "See Our {num} Locations", "see {num} more", or anything else
// they want, without a code change. The count is the number of rows in the
// `PropertiesInternal` collection.
//
// ── WHY THE COUNT IS NOT `readCollection(...).length` ──────────────────────
// Duda's `pageSize` is 100. This site has more locations than that (103 at the
// time of writing), so a single `.get()` would report 100 for ever. The count
// therefore goes through `countCollectionRows`, which walks `page` and tells us
// whether it managed to see the whole collection. See its doc comment — the
// page request is the one part of this not yet confirmed against a live site,
// and it is built so that being wrong under-counts loudly instead of
// double-counting silently.
//
// ── WHAT SHOWS WHEN THE COUNT IS UNKNOWN ───────────────────────────────────
// `window.dmAPI` is PUBLISHED-SITE ONLY — it does not exist in the Duda editor
// or the dev harness, so there is no collection to count there. Rather than
// print a wrong number:
//
//   • in the editor / harness, the token is filled with DEMO_COUNT purely so
//     the operator can see their sentence laid out. It is a placeholder and is
//     read from nothing;
//   • on a published page where the collection is missing or empty, the token
//     is REMOVED and the sentence closes up — "See Our Locations" reads
//     perfectly well, where "See Our 0 Locations" would be a bug on a banner.
//
// There is no `config.json` here, unlike most widgets in this set: this one
// makes no API call. It reads one collection, which needs no credentials, so
// there is nothing for a config to hold.
//
// Every class is `lb-`: widgets share a page, so a class name is global and a
// borrowed one is a collision, not a shared rule (see #18's note on `.sl-`).
// ===========================================================================

import { useEffect, useState } from 'react';
import './LocationsBanner.css';
import { countCollectionRows, hasCollectionsApi } from '@shared/dudaCollections';
import { INTERNAL_PROPERTIES_COLLECTION } from '@shared/internalProperties';
import { boundText } from '@shared/propertyBinding';

/**
 * Shown when the message is left blank — the same sentence as the content
 * menu's own Default Value, so a widget dropped on a page with nothing typed
 * into it still renders the intended banner rather than an empty bar.
 */
const DEFAULT_MESSAGE = 'See Our {num} Locations';

/**
 * Stand-in count for the Duda editor and the dev harness, where `dmAPI` — and
 * therefore the collection — does not exist. NOT read from anywhere: it exists
 * so an operator writing their sentence can see it laid out with a number in
 * it. A published page always counts the real collection.
 */
const DEMO_COUNT = 103;

/**
 * The token, as the operator types it.
 *
 * Case-insensitive and tolerant of inner spaces (`{ num }`), because this is
 * hand-typed into a text field and a capitalised `{Num}` failing silently would
 * leave the token printed on a live banner. Global, so a message may use it
 * more than once.
 */
const NUM_TOKEN = /\{\s*num\s*\}/gi;

export interface LocationsBannerProps {
  /**
   * The banner sentence, from the content menu's `bannerMessage` field.
   *
   * Named `propertyHeader` because that is the key the Duda JS tab forwards it
   * under (`propertyHeader: data.config.bannerMessage`), matching #18's own
   * authored-heading prop. `bannerMessage` is accepted as an alias so the JS tab
   * can pass the field under its own name instead, without a rebuild.
   */
  propertyHeader?: string;
  /** Alias for `propertyHeader` — see above. */
  bannerMessage?: string;
  /**
   * Pin the number instead of counting the collection.
   *
   * The escape hatch for the case the count cannot be trusted: a collection
   * that has outgrown what one read can reach and whose extra pages will not
   * come back (see `countCollectionRows`). Left empty — the normal case — the
   * collection is counted.
   */
  locationCount?: string | number;
  /**
   * Collection to count. Defaults to `PropertiesInternal`; here so a site that
   * named its collection differently does not need a rebuild. Case-sensitive —
   * it is the lookup key.
   */
  collectionName?: string;
}

/**
 * `undefined` — still counting. `null` — counted, and there is no number to
 * show. A number — that many rows.
 *
 * The three are deliberately distinct: without the first, the banner would
 * paint its token-stripped sentence and then visibly rewrite itself a moment
 * later when the count landed.
 */
type Count = number | null | undefined;

export function LocationsBanner({
  propertyHeader,
  bannerMessage,
  locationCount,
  collectionName,
}: LocationsBannerProps) {
  const message = boundText(propertyHeader) || boundText(bannerMessage) || DEFAULT_MESSAGE;
  const collection = boundText(collectionName) || INTERNAL_PROPERTIES_COLLECTION;

  /* An operator-pinned number wins outright and skips the read entirely. Parsed
     rather than trusted: the content menu hands over text, so "103" arrives as
     a string, and anything that is not a positive number falls through to the
     collection instead of rendering NaN. */
  const pinned = (() => {
    const raw = typeof locationCount === 'number' ? locationCount : parseInt(boundText(locationCount), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  })();

  const [count, setCount] = useState<Count>(pinned ?? undefined);

  useEffect(() => {
    if (pinned !== null) { setCount(pinned); return undefined; }

    let cancelled = false;
    void countCollectionRows(collection).then(({ count: n, exact }) => {
      if (cancelled) return;
      if (n > 0) {
        if (!exact) {
          console.warn(
            `[#22 locations-banner] counted ${n} row(s) in "${collection}" but could not reach the whole collection — the banner may under-report. Set the Location Count field to pin it.`,
          );
        }
        setCount(n);
        return;
      }

      /* Nothing counted. WHY decides what to show, and the check has to happen
         HERE rather than before the read: `dmAPI` is injected by the published
         page's own scripts and an external app can mount first, so asking on
         mount is a race that would show demo data on a real site. By now
         `countCollectionRows` has waited its full budget for the API, so this
         answer is settled — no API means the editor or the harness, where a
         demo number is the point; an API but no rows means a published page
         whose collection is missing or empty, where any number would be a lie. */
      setCount(hasCollectionsApi() ? null : DEMO_COUNT);
    });
    return () => { cancelled = true; };
  }, [collection, pinned]);

  /* Thousands separator: collections run to 1000 rows, and "1,024" is how a
     number that size is read in a sentence. */
  const text = count === null || count === undefined
    // No number: drop the token and tidy the double space it leaves, so the
    // sentence closes up instead of printing "{num}" or a zero.
    ? message.replace(NUM_TOKEN, '').replace(/\s{2,}/g, ' ').trim()
    : message.replace(NUM_TOKEN, count.toLocaleString('en-US'));

  return (
    <div className="lb-banner">
      {/* The bar is its full height from the first paint, and the text is only
          hidden — not absent — while the count resolves, so Duda measures 85px
          once and nothing moves or rewrites itself when the number lands. */}
      <span className="lb-text" style={count === undefined ? { visibility: 'hidden' } : undefined}>
        {text}
      </span>
    </div>
  );
}
