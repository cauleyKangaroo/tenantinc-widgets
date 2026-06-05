import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { DudaInitParams } from './types';

/**
 * Wraps a React component as a Duda external app, returning the { init, clean }
 * pair that renderExternalApp expects.
 *
 * Why this exists — the Duda lifecycle gotcha:
 * When the site editor changes a content-panel field, Duda re-runs the widget
 * and (because renderExternalApp's keepSubtree defaults to false) WIPES the DOM
 * subtree inside `container` before calling init() again. A React root created
 * directly on `container` would then hold a fiber tree out of sync with the
 * now-empty DOM, so root.render() paints nothing and never recovers.
 *
 * To stay robust we mount into our OWN child node and recreate the root
 * whenever that node has been detached/wiped or the container itself changed.
 * Every widget gets this behaviour for free by building on createWidget.
 */
export function createWidget<TProps extends object>(Component: React.ComponentType<TProps>) {
  let root: Root | null = null;
  let mountEl: HTMLElement | null = null;
  let rootContainer: HTMLElement | null = null;

  function init({ container, props }: DudaInitParams<TProps>): void {
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
    // createElement can't resolve its overloads against an unconstrained
    // generic component; the public signature above keeps call sites type-safe,
    // so we only cast this internal render bridge.
    root.render(React.createElement(Component as React.ComponentType<unknown>, props));
  }

  function clean(): void {
    root?.unmount();
    root = null;
    mountEl = null;
    rootContainer = null;
  }

  return { init, clean };
}
