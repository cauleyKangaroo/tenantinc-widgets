// ===========================================================================
// Living styleguide for @shared/ui — every field type, every state, every
// button variant, rendered from the real components.
//
// NOT A DUDA WIDGET. It exists so a dev can see what they are getting before
// they build with it, and so the shared components are compiled and exercised
// rather than sitting as untested library code. Never added to a Duda page.
//
// Mirrors the Figma frames it was built from:
//   forms   8753-47700 — Text Entry / Search / Calendar / Masked Fields
//   buttons 9215-57188 — CTA / Secondary / Black & White
// ===========================================================================

import React, { useState } from 'react';
import { FormField, Button } from '@shared/ui';
import './Showcase.css';

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="uik-col">
      <h3 className="uik-col__title">{title}</h3>
      {children}
    </div>
  );
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="uik-state">
      <p className="uik-state__label">{label}</p>
      {children}
    </div>
  );
}

export function Showcase() {
  const [email, setEmail] = useState('roland@tenantinc.com');
  const [badEmail, setBadEmail] = useState('rolandtenantinc.com');
  const [emptyEmail, setEmptyEmail] = useState('');
  const [search, setSearch] = useState('435 Woodland Drive, Laguna Beac..');
  const [emptySearch, setEmptySearch] = useState('');
  const [moveIn, setMoveIn] = useState('2026-09-02');
  const [dob, setDob] = useState('01/10/1987');
  const [badDob, setBadDob] = useState('01/10/2065');
  const [partialDob, setPartialDob] = useState('01/10/');
  const [account, setAccount] = useState('4676382928272');
  const [emptyAccount, setEmptyAccount] = useState('');

  return (
    <div className="uik">
      <section>
        <h2 className="uik__heading">Form fields</h2>
        <p className="uik__note">
          Resting and focus states are real CSS — click into any field to see the
          border darken and the label float. Success and error are set by the caller.
        </p>

        <div className="uik-grid">
          <Column title="Text Entry">
            <State label="Empty (required)">
              <FormField label="Email" type="email" required value={emptyEmail} onChange={setEmptyEmail} />
            </State>
            <State label="Success">
              <FormField label="Email" type="email" required value={email} onChange={setEmail} state="success" />
            </State>
            <State label="Error / validation">
              <FormField
                label="Email" type="email" required value={badEmail} onChange={setBadEmail}
                error="Enter a valid email address"
              />
            </State>
            <State label="Disabled">
              <FormField label="Email" type="email" value="locked@tenantinc.com" onChange={() => {}} disabled />
            </State>
          </Column>

          <Column title="Search">
            <State label="Empty">
              <FormField label="Search Address" type="search" value={emptySearch} onChange={setEmptySearch} />
            </State>
            <State label="Success">
              <FormField label="Search Address" type="search" value={search} onChange={setSearch} state="success" />
            </State>
          </Column>

          <Column title="Calendar">
            <State label="Native picker (move-in date)">
              <FormField label="Move-in Date" type="date" value={moveIn} onChange={setMoveIn} state="success" />
            </State>
            <State label="Typed mask — no picker (date of birth)">
              <FormField label="Date of Birth" mask="date" value={dob} onChange={setDob} state="success" />
            </State>
            <State label="Typed mask, partially filled">
              <FormField label="Date of Birth" mask="date" value={partialDob} onChange={setPartialDob} />
            </State>
            <State label="Error / validation">
              <FormField
                label="Date of Birth" mask="date" value={badDob} onChange={setBadDob}
                error="Enter a valid Date of Birth"
              />
            </State>
          </Column>

          <Column title="Masked Fields">
            <State label="Empty with info icon">
              <FormField
                label="Account Number" required value={emptyAccount} onChange={setEmptyAccount}
                infoTitle="Find this on your statement"
              />
            </State>
            <State label="Masked — click the eye to reveal">
              <FormField label="Account Number" type="password" required value={account} onChange={setAccount} state="success" />
            </State>
            <State label="Error / validation">
              <FormField
                label="Account Number" type="password" required value="" onChange={() => {}}
                error="Account Number is required"
              />
            </State>
          </Column>
        </div>
      </section>

      <section>
        <h2 className="uik__heading">Buttons</h2>
        <p className="uik__note">
          Tone is chosen by <strong>role</strong>, not colour: <code>cta</code> is the
          one primary action on a view, <code>secondary</code> is the alternate beside
          it, <code>dark</code> is a utility function.
        </p>

        <div className="uik-grid">
          <Column title="CTA — primary action">
            <State label="Solid, white text"><Button tone="cta" block>Select</Button></State>
            <State label="Solid, black text"><Button tone="cta" darkText block>Select</Button></State>
            <State label="Outline"><Button tone="cta" fill="outline" block>Select</Button></State>
            <State label="Pill, solid"><Button tone="cta" shape="pill" block>Select</Button></State>
            <State label="Pill, outline"><Button tone="cta" fill="outline" shape="pill" block>Select</Button></State>
          </Column>

          <Column title="Secondary — alternate action">
            <State label="Solid, white text"><Button tone="secondary" block>Select</Button></State>
            <State label="Solid, black text"><Button tone="secondary" darkText block>Select</Button></State>
            <State label="Outline"><Button tone="secondary" fill="outline" block>Select</Button></State>
            <State label="Pill, solid"><Button tone="secondary" shape="pill" block>Select</Button></State>
            <State label="Pill, outline"><Button tone="secondary" fill="outline" shape="pill" block>Select</Button></State>
          </Column>

          <Column title="Black & White — utility">
            <State label="Dark, square"><Button tone="dark" block>Pay Now</Button></State>
            <State label="Dark, pill"><Button tone="dark" shape="pill" block>Pay Now</Button></State>
            <State label="Light"><Button tone="light" block>Print</Button></State>
          </Column>

          <Column title="States">
            <State label="Disabled"><Button tone="cta" block disabled>Select</Button></State>
            <State label="Busy (blocks double submit)"><Button tone="cta" block busy>Sending…</Button></State>
            <State label="As a link (renders an <a>)"><Button tone="secondary" block href="#showcase">View Details</Button></State>
            <State label="Auto width (default)"><Button tone="dark">Pay Now</Button></State>
          </Column>
        </div>
      </section>
    </div>
  );
}
