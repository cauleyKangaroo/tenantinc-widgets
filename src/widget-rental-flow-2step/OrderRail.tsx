import React, { useEffect, useState } from 'react';
import { PROPERTY_IMAGES } from '@shared/demoImages';
import { fetchPropertyHeroImage } from '@shared/propertyImages';
import { MoneyBreakdown, SummaryRail } from '@shared/ui';
import type { PropertyInfo, SelectionContext, MoveInQuote } from './api';

// ---------------------------------------------------------------------------
// Order-summary rail (right side of every flow screen). Thin wrapper over the
// shared <SummaryRail> — the SAME card the value-tiers page renders — feeding
// it the live selection + real move-in quote. Facility facts + selection are
// LIVE; the money breakdown is REAL when a unit resolves (GET
// /units/{id}/lease-set-up). No made-up figures: without a quote the rail says
// exactly why in one sentence. Facility photo is still a demo asset.
// ---------------------------------------------------------------------------

// NO-DEMO-MONEY policy (Raymond, 2026-08-03): the rail never shows made-up
// figures. Without a resolved quote it says exactly why in one sentence.
function railMoneyNote(hasSelection: boolean, failed: boolean): string {
  if (failed) {
    return 'We’re experiencing technical difficulties retrieving live pricing. '
      + 'Please try again in a few minutes — your final costs are always confirmed before you pay.';
  }
  return hasSelection
    ? 'Calculating your move-in cost… Your final costs are always confirmed before you pay.'
    : 'Select a space to see your move-in cost.';
}

export function OrderRail({
  property,
  selection,
  quote,
  unitLabel,
  changeSpaceUrl,
  quoteFailed = false,
  quoteAssumesToday = false,
  estimate = false,
}: {
  property?: PropertyInfo;
  selection?: SelectionContext;
  quote?: MoveInQuote;
  /** Unit number shown BEFORE the size, e.g. "#111 | 5’ x 7’". SummaryRail
   *  composes `size | tierName`, so when this is set the unit leads and the size
   *  moves into the trailing slot. */
  unitLabel?: string;
  changeSpaceUrl?: string;
  /** Quote pipeline failed — show the technical-difficulty note, never fakes. */
  quoteFailed?: boolean;
  /** Selected move-in date is in the FUTURE — the gateway quote engine
   *  ignores move_in_date (verified), so totals are for a today move-in
   *  and must say so (review finding #6). */
  quoteAssumesToday?: boolean;
  /** No money moved (reservation hold): the reserve endpoint re-prices
   *  server-side and does not echo the final breakdown, so the shown total is
   *  an ESTIMATE, not a confirmed charge. Labels it accordingly. */
  estimate?: boolean;
}) {
  const phone = property?.phone
    ? property.phone.replace(/^1?(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
    : undefined;

  // The selected property's own hero photo. Until it lands (and on any site
  // without the collection) the rail keeps the demo image it has always shown,
  // so the card never renders with an empty frame.
  const [hero, setHero] = useState('');
  useEffect(() => {
    const id = property?.id;
    setHero('');
    if (!id) return undefined;
    let cancelled = false;
    fetchPropertyHeroImage(id)
      .then((url) => { if (!cancelled) setHero(url); })
      .catch(() => { /* no collection — the demo image stands in */ });
    return () => { cancelled = true; };
  }, [property?.id]);
  const showStrike = selection?.inStore != null && selection?.online != null
    && selection.inStore > selection.online;

  return (
    <SummaryRail
      imageUrl={hero || PROPERTY_IMAGES[0]}
      name={property?.name}
      address={property?.address}
      phone={phone}
      size={unitLabel ?? (selection ? selection.size.replace(/'/g, '’') : '')}
      tierName={unitLabel ? selection?.size.replace(/'/g, '’') : undefined}
      summary={selection?.features?.[0]}
      amenities={selection?.features?.slice(1)}
      changeSpaceUrl={changeSpaceUrl}
      standardPrice={
        showStrike ? selection!.inStore
          : selection?.online ?? undefined
      }
      promoPrice={showStrike ? selection!.online : undefined}
      priceLabels={{ standard: 'IN-STORE', promo: 'ONLINE' }}
      promo={selection?.promo}
    >
      <div className="ts-card-breakdown">
        {quote ? (
          <>
            {/* No unitNumber: MoneyBreakdown renders it as a "Unit #be23fl" row,
                which repeats what the card's own header already says and shows
                the raw id rather than the space number. Dropped at the call
                site rather than in the component — #14 passes it too and keeps
                the row. */}
            <MoneyBreakdown
              totalDue={quote.totalDue}
              totalTax={quote.totalTax}
              lines={quote.lines}
              showTotal={false}
            />
            <div className="ts-bd-row ts-bd-row--total">
              <span className="ts-bd-total-label">{estimate ? 'Estimated Move-In Total:' : 'Total Cost to Move-In:'}</span>
              <span className="ts-bd-total-amt">${quote.totalDue.toFixed(2)}</span>
            </div>
            {estimate ? (
              <p className="ts-bd-note">
                Estimate only — no payment was taken for this reservation. Your
                exact move-in total is confirmed when you complete your rental.
              </p>
            ) : quoteAssumesToday && (
              <p className="ts-bd-note">
                Shown for a move-in today — your exact prorated total for the
                selected date is confirmed before you pay.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="ts-bd-note">{railMoneyNote(!!selection, quoteFailed)}</p>
            <div className="ts-bd-row ts-bd-row--total">
              <span className="ts-bd-total-label">Total Cost to Move-In:</span>
              <span className="ts-bd-total-amt">—</span>
            </div>
          </>
        )}
      </div>
    </SummaryRail>
  );
}
