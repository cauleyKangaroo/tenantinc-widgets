// Template flow — copy this folder to start a new one, then delete or replace it.
// Screens are plain components: hardcode the data, compose from @shared/ui.

import React from 'react';
import { Button, FormField } from '@shared/ui';
import type { Flow } from '../../types';

function Details() {
  return (
    <div style={{ maxWidth: 420, display: 'grid', gap: 16 }}>
      <FormField label="Full name" value="Roland Tenant" onChange={() => {}} />
      <FormField label="Email" type="email" value="roland@tenantinc.com" onChange={() => {}} />
      <Button>Continue</Button>
    </div>
  );
}

function Confirmation() {
  return (
    <div style={{ maxWidth: 420 }}>
      <h2 style={{ margin: '0 0 8px', fontWeight: 700 }}>You're all set</h2>
      <p style={{ margin: 0, color: 'var(--hb-grayscale-medium)' }}>
        A confirmation has been sent to roland@tenantinc.com.
      </p>
    </div>
  );
}

export const exampleFlow: Flow = {
  id: 'example',
  title: 'Example (template)',
  description: 'A two-screen placeholder showing the shape of a flow. Copy flows/example/ to start one.',
  screens: [
    { id: 'details', title: 'Details', note: 'Filled-in form, resting state', Component: Details },
    { id: 'confirmation', title: 'Confirmation', Component: Confirmation },
  ],
};
