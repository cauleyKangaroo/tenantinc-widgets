// ===========================================================================
// HARNESS-ONLY sample tiers, for viewing the layouts when a property's live
// offers carry no value tiers. Never on a customer site, stopped twice:
//
//   1. `__HB_DEV_HARNESS__` is a BUILD-TIME constant (webpack DefinePlugin):
//      `false` under `npm run build`. Each function below then folds to its
//      first `return`, and everything after it — the fixture, the quote, the
//      banner text — is dead code the minifier drops. It is not in the shipped
//      bundle at all, the same guarantee as @shared/devBypass.
//   2. Even in a development build it only answers on a local host.
//
// Real tiers always win: the widget asks for this only when live data has none.
//
// To confirm 1 after a build:
//     grep -c "harness-sample" dist/widget-tier-selection.js   → must print 0
// ===========================================================================

import React from 'react';
import { mapOffersToTiers, type MoveInQuote } from './api';

/** Substituted by webpack.DefinePlugin. See webpack.config.js. */
declare const __HB_DEV_HARNESS__: boolean;

type SampleOffers = Parameters<typeof mapOffersToTiers>[0];

function onLocalHost(): boolean {
  try {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1'
      || h === '[::1]' || h === '' || h.endsWith('.local');
  } catch {
    return false;
  }
}

/** Good / Better / Best for one size, through the same mapping live offers use. */
export function harnessSampleTiers(size?: string): ReturnType<typeof mapOffersToTiers> {
  if (!__HB_DEV_HARNESS__) return undefined;
  if (!onLocalHost()) return undefined;
  const offers: SampleOffers = [
    {
      type: 'good', label: 'Good', availability: 'available',
      unitId: 'harness-sample-good', price: 89,
      amenities: [{ name: 'Drive Up', value: 'Yes' }, { name: '24 Hour Access', value: 'Yes' }],
      promotions: [],
    },
    {
      type: 'better', label: 'Better', availability: 'available',
      unitId: 'harness-sample-better', price: 109, promoRate: 54.5,
      amenities: [
        { name: 'Climate Controlled', value: 'Yes' },
        { name: 'Drive Up', value: 'Yes' },
        { name: '24 Hour Access', value: 'Yes' },
      ],
      promotions: [{ id: 'harness-sample-promo', name: '50% Off First Month' }],
    },
    {
      type: 'best', label: 'Best', availability: 'available',
      unitId: 'harness-sample-best', price: 139,
      amenities: [
        { name: 'Climate Controlled', value: 'Yes' },
        { name: 'Drive Up', value: 'Yes' },
        { name: '24 Hour Access', value: 'Yes' },
        { name: 'Near Entrances', value: 'Yes' },
      ],
      promotions: [],
    },
  ];
  return mapOffersToTiers(offers, size || "10' x 10'");
}

/** A move-in quote for a sample unit, so Option 1's order summary fills in
 *  without asking the API about units that do not exist. */
export function harnessSampleQuote(unitId: string, rent: number): MoveInQuote | undefined {
  if (!__HB_DEV_HARNESS__) return undefined;
  if (!unitId.startsWith('harness-sample-')) return undefined;
  const admin = 29;
  const protection = 12;
  return {
    unitId,
    unitNumber: 'S-101',
    totalDue: rent + admin + protection,
    totalTax: 0,
    lines: [
      { name: 'Rent', cost: rent },
      { name: 'Admin Fee', cost: admin },
      { name: 'Protection', cost: protection },
    ],
  };
}

/** Says plainly, on the widget itself, that these are not real prices. */
export function HarnessSampleBanner(): React.ReactElement | null {
  if (!__HB_DEV_HARNESS__) return null;
  return (
    <div
      role="note"
      style={{
        margin: '0 0 12px', padding: '8px 12px', borderRadius: 6,
        background: '#fff4e5', color: '#7a4b00', border: '1px dashed #f0a020',
        font: '600 13px/1.4 ui-monospace, Menlo, monospace',
      }}
    >
      Harness sample data — this property&rsquo;s live offers have no value tiers. Not real pricing.
    </div>
  );
}
