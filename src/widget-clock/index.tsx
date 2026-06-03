import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Clock } from './Clock';
import type { DudaInitParams, ClockProps } from '@shared/types';

let root: Root | null = null;

export function init({ container, props }: DudaInitParams<ClockProps>): void {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<Clock {...props} />);
}

export function clean(): void {
  root?.unmount();
  root = null;
}
