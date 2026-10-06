// Rental flow (#99) states that cannot be reproduced on demand in the harness.
//
// Built from the widget's REAL components — UnavailableStep and OrderRail from
// the rental flow, DefaultCard from #05 — so what is shown here is what the
// flow will render once wired, not a lookalike. Data is the rental flow's own
// harness preview set plus three hand-made similar spaces.

import React from 'react';
import {
  UnavailableStep, RentalErrorStep, PREVIEW_PROPERTY, PREVIEW_SELECTION, PREVIEW_QUOTE,
} from '../../../widget-rental-flow-2step/RentalFlow2Step';
import { OrderRail } from '../../../widget-rental-flow-2step/OrderRail';
import { DefaultCard } from '../../../widget-space-list/components/DefaultView';
import { DEMO_UNITS } from '../../../widget-space-list/data';
import type { Unit, WidgetConfig } from '../../../widget-space-list/types';
import '../../../widget-space-list/SpaceList.css';
import type { Flow } from '../../types';
import './rentalFlow.css';
import dimetric5x5 from './dimetric-5x5.png';

/** #05's display config at its defaults, with urgency on as the frame shows. */
const CARD_CONFIG: WidgetConfig = {
  showInstorePrice: true,
  instorePriceLabel: 'IN-STORE',
  instorePriceMode: 'percentOfWeb',
  showJunkFeeDisclaimer: false,
  junkFeeCopy: '',
  showUrgencyMessage: true,
  urgencyThreshold: 5,
  sortBy: 'sizeAsc',
  categoryOrdering: 'spaces',
  showUnavailableUnits: false,
  enableWaitlist: false,
  callOnLimitedAvailability: false,
  ctaButtonCopy: 'Select',
  limitedAvailabilityCopy: '',
  startingAtLabel: 'Starting at',
  instorePriceAmount: 0,
  enablePromoLogic: false,
  contactPhone: '',
  facilityName: '',
  enableValueTiers: false,
  // Static screen: Select goes nowhere.
  rentalPageUrl: '#',
};

const SIMILAR: Unit[] = ["5' x 5'", "5' x 6'", "5' x 9'"].map((dimensions, i) => ({
  ...DEMO_UNITS[0],
  id: `similar-${i}`,
  dimensions,
  subtype: 'Climate Controlled',
  features: ['24 Hour Access', 'Near Entrances', 'Electronic Lock', '10’ Ceiling'],
  inStorePrice: 174.5,
  startingPrice: 184.5,
  adminFee: 20,
  promo: 'Short Promotion Title',
  vacantCount: 1,
  // Cards draw only `mediaImages` (see unitImage.ts). The frame's own render.
  mediaImages: [dimetric5x5],
}));

/* The preview property plus the confirmation frame's (12447-90822) hours —
   the rental flow's own preview set has none, and the card hides empty ones. */
const CONFIRM_PROPERTY = {
  ...PREVIEW_PROPERTY,
  officeHours: ['Mon-Sat: 8:00 AM - 5:00 PM', 'Sun: 10:00 AM - 3:00 PM'],
  gateHours: ['Mon-Sun: 6:00 AM - 10:00 PM'],
};

/* SIMULATED. The flow has no lead call yet, and a static screen must never
   file a real lead — so this resolves after a beat, as a request would, and
   sends nothing anywhere. */
const simulatedLead = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 600); });

function SpaceUnavailable() {
  return (
    <div className="ss-rf">
      <div className="rf-wrapper">
        <div className="rf-layout">
          <div className="rf-main">
            <UnavailableStep
              submitLead={simulatedLead}
              property={CONFIRM_PROPERTY}
              spaceLabel="5’ x 7’ Climate Controlled"
              similar={(
                /* No .sl-listing-area: its container would shadow .rf-ua-similar's,
                   which is what the card's sizing is measured against here. */
                <div className="sl-wrapper ss-rf-cards">
                  <div className="sl-dv-rows">
                    {SIMILAR.map((u) => <DefaultCard key={u.id} unit={u} config={CARD_CONFIG} />)}
                  </div>
                </div>
              )}
            />
            <p className="ss-rf-note">
              Static screen — Contact me and Send us a Message are simulated; nothing is sent.
            </p>
          </div>
          <OrderRail property={PREVIEW_PROPERTY} selection={PREVIEW_SELECTION} quote={PREVIEW_QUOTE} />
        </div>
      </div>
    </div>
  );
}

function SomethingWentWrong() {
  return (
    <div className="ss-rf">
      <div className="rf-wrapper">
        <div className="rf-layout">
          <div className="rf-main">
            {/* The frame's number; the live card will dial the property's own. */}
            <RentalErrorStep phone="8884749387" />
          </div>
          <OrderRail property={PREVIEW_PROPERTY} selection={PREVIEW_SELECTION} quote={PREVIEW_QUOTE} />
        </div>
      </div>
    </div>
  );
}

export const rentalFlow: Flow = {
  id: 'rental-flow',
  title: 'Rental flow (#99)',
  description:
    'States of the rental flow that cannot be reproduced on demand. Built from the widget’s real components with preview data.',
  screens: [
    {
      id: 'space-unavailable',
      title: 'Space no longer available',
      note: 'Availability check failed after the shopper chose the space — Figma 12453-39451',
      Component: SpaceUnavailable,
    },
    {
      id: 'something-went-wrong',
      title: 'Something went wrong',
      note: 'Completing the rental failed — call the facility. Figma 12454-41003',
      Component: SomethingWentWrong,
    },
  ],
};
