import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Hero } from './Hero';
import type { DudaInitParams, HeroProps } from '@shared/types';

// Module-scoped root — lets clean() unmount without needing a container argument.
// If Duda calls init() again (e.g. editor content panel changed), we reuse the
// existing root and re-render with the new props rather than creating a second root.
let root: Root | null = null;
let rootContainer: HTMLElement | null = null;

export function init({ container, props }: DudaInitParams<HeroProps>): void {
  if (root && container !== rootContainer) {
    root.unmount();
    root = null;
  }
  if (!root) {
    root = createRoot(container);
    rootContainer = container;
  }
  root.render(<Hero {...props} />);
}

export function clean(): void {
  root?.unmount();
  root = null;
  rootContainer = null;
}
