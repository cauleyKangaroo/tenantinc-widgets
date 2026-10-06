// ===========================================================================
// Static screens — a viewer for hand-built, data-free flows.
//
// NOT A DUDA WIDGET. Flows are developed here first so other devs can see the
// intended screens (and lift their markup) before they are wired to real data
// inside a widget. Never added to a Duda page.
//
// Add a flow in flows/index.ts. The selected flow + screen are kept in the URL
// (?flow=…&screen=…) next to the harness's own ?page=, so a link opens the
// exact screen.
// ===========================================================================

import React, { useEffect, useState } from 'react';
import { FLOWS } from './flows';
import type { Flow } from './types';
import './StaticScreens.css';

function readParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function writeParams(flow: string, screen: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('flow', flow);
    url.searchParams.set('screen', screen);
    window.history.replaceState(null, '', url);
  } catch {
    // Not fatal — the selection just won't survive a refresh.
  }
}

function findFlow(id: string | null): Flow | undefined {
  return FLOWS.find((f) => f.id === id) ?? FLOWS[0];
}

export function StaticScreens() {
  const [flowId, setFlowId] = useState(() => findFlow(readParam('flow'))?.id ?? '');
  const flow = findFlow(flowId);
  const [screenId, setScreenId] = useState(() => {
    const wanted = readParam('screen');
    return flow?.screens.find((s) => s.id === wanted)?.id ?? flow?.screens[0]?.id ?? '';
  });

  useEffect(() => {
    if (flow && screenId) writeParams(flow.id, screenId);
  }, [flow, screenId]);

  if (!flow) {
    return (
      <div className="ss">
        <p className="ss__empty">
          No flows yet. Add one in <code>src/static-screens/flows/index.ts</code>.
        </p>
      </div>
    );
  }

  const index = Math.max(0, flow.screens.findIndex((s) => s.id === screenId));
  const screen = flow.screens[index];

  const selectFlow = (id: string) => {
    const next = findFlow(id)!;
    setFlowId(next.id);
    setScreenId(next.screens[0]?.id ?? '');
  };
  const step = (delta: number) => {
    const next = flow.screens[index + delta];
    if (next) setScreenId(next.id);
  };

  return (
    <div className="ss">
      <div className="ss__bar">
        <label className="ss__flow">
          <span>Flow</span>
          <select value={flow.id} onChange={(e) => selectFlow(e.target.value)}>
            {FLOWS.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
        </label>

        <ol className="ss__steps">
          {flow.screens.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={'ss__step' + (s.id === screen?.id ? ' is-active' : '')}
                onClick={() => setScreenId(s.id)}
              >
                <span className="ss__step-num">{i + 1}</span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>

        <div className="ss__nav">
          <button type="button" onClick={() => step(-1)} disabled={index === 0}>← Prev</button>
          <button type="button" onClick={() => step(1)} disabled={index >= flow.screens.length - 1}>Next →</button>
        </div>
      </div>

      {flow.description && <p className="ss__desc">{flow.description}</p>}

      {screen ? (
        <section className="ss__frame">
          <header className="ss__frame-head">
            <strong>{index + 1}. {screen.title}</strong>
            {screen.note && <span>{screen.note}</span>}
          </header>
          <div className="ss__canvas">
            <screen.Component />
          </div>
        </section>
      ) : (
        <p className="ss__empty">This flow has no screens yet.</p>
      )}
    </div>
  );
}
