import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Hero } from './Hero';
import type { DudaInitParams, HeroProps } from '@shared/types';

// When the site editor changes a content-panel field, Duda re-runs the widget
// and (because renderExternalApp's keepSubtree defaults to false) wipes the
// DOM subtree inside `container` before calling init() again. A React root
// created directly on `container` would then have a fiber tree out of sync
// with the now-empty DOM, so root.render() paints nothing and never recovers.
//
// To stay robust we mount into our OWN child node and recreate the root
// whenever that node has been detached/wiped or the container itself changed.
let root: Root | null = null;
let mountEl: HTMLElement | null = null;
let rootContainer: HTMLElement | null = null;

export function init({ container, props }: DudaInitParams<HeroProps>): void {
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
  root.render(<Hero {...props} />);
}

export function clean(): void {
  root?.unmount();
  root = null;
  mountEl = null;
  rootContainer = null;
}
