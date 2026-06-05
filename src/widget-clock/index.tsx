import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Clock } from './Clock';
import type { DudaInitParams, ClockProps } from '@shared/types';

// See widget-hero/index.tsx for why we mount into our own child node and
// recreate the root when Duda detaches/wipes it on a content-panel update.
let root: Root | null = null;
let mountEl: HTMLElement | null = null;
let rootContainer: HTMLElement | null = null;

export function init({ container, props }: DudaInitParams<ClockProps>): void {
  const detached = !mountEl || mountEl.parentNode !== container;
  if (root && (detached || container !== rootContainer)) {
    root.unmount();
    root = null;
    mountEl = null;
  }
  if (!root) {
    mountEl = document.createElement('div');
    container.appendChild(mountEl);
    root = createRoot(mountEl);
    rootContainer = container;
  }
  root.render(<Clock {...props} />);
}

export function clean(): void {
  root?.unmount();
  root = null;
  mountEl = null;
  rootContainer = null;
}
