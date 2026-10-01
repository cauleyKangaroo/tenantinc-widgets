import type React from 'react';

/** One frame of a flow — a static, hand-built screen with no live data. */
export interface Screen {
  /** URL-safe, unique within its flow. Ends up in `?screen=`. */
  id: string;
  title: string;
  /** Optional one-liner shown above the screen: what state it depicts. */
  note?: string;
  Component: React.ComponentType;
}

/** An ordered set of screens that together describe one journey. */
export interface Flow {
  /** URL-safe, unique across flows. Ends up in `?flow=`. */
  id: string;
  title: string;
  description?: string;
  screens: Screen[];
}
