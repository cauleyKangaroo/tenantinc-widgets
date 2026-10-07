import { useMemo, useState } from 'react';
import { createIdvApi } from './idvApi';
import { currentApiCreds } from './api';
import { useIdvController } from './useIdvController';

const DEV_COMPANY_ID = 'kQoBXA8vpn';
const DEV_PROPERTY_ID = 'MjR57iZ82O';
const DEV_VERIFICATION_HOSTS = ['demo-onboarding.incodesmile.com'];
declare const __HB_DEV_HARNESS__: boolean;

function localHostname(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname === '::1';
}

export function canRenderLiveIdvHarness(enabled: boolean | undefined): boolean {
  if (typeof __HB_DEV_HARNESS__ === 'undefined' || !__HB_DEV_HARNESS__) return false;
  return enabled === true && localHostname();
}

export function LiveIdvHarness() {
  const [first, setFirst] = useState('Test');
  const [last, setLast] = useState('Renter');
  const [email, setEmail] = useState('idv-test@example.com');
  const [phone, setPhone] = useState('9800009652');
  const [contactId, setContactId] = useState('');
  const [attempt, setAttempt] = useState(1);

  const api = useMemo(() => createIdvApi(currentApiCreds()), []);
  const scope = useMemo(() => ({ companyId: DEV_COMPANY_ID, propertyId: DEV_PROPERTY_ID }), []);
  const identity = useMemo(() => ({
    first: first.trim(),
    last: last.trim(),
    email: email.trim(),
    phone: phone.trim(),
    contactId: contactId.trim() || undefined,
    // Gives the standalone harness a stable session-storage owner even though
    // it deliberately does not create a lease. A new attempt changes the key.
    leaseId: `local-harness-${attempt}`,
  }), [attempt, contactId, email, first, last, phone]);
  const controller = useIdvController({
    enabled: Boolean(identity.first && identity.last && identity.email && identity.phone),
    api,
    scope,
    identity,
    allowedVerificationHosts: DEV_VERIFICATION_HOSTS,
  });

  const start = () => {
    if (!window.confirm(
      `Start a LIVE DEV identity-verification session for ${identity.phone}?\n\n`
      + 'This uses the non-billing demo Incode environment and may attempt to send an SMS.',
    )) return;
    void controller.start();
  };

  return (
    <main className="rf-live-idv">
      <div className="rf-live-idv__warning" role="alert">
        <strong>LIVE DEV IDV</strong>
        <span>Real gateway calls; non-billing demo environment. Never use production renter data.</span>
      </div>
      <h2>ID Verification Integration Harness</h2>
      <p>
        Fixed scope: <code>{DEV_COMPANY_ID}</code> / <code>{DEV_PROPERTY_ID}</code>.
        A contact ID is optional; leave it blank to test start and poll without the completed-contact lookup.
      </p>
      <div className="rf-live-idv__grid">
        <label>First name<input value={first} onChange={(event) => setFirst(event.target.value)} /></label>
        <label>Last name<input value={last} onChange={(event) => setLast(event.target.value)} /></label>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Phone<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="rf-live-idv__wide">
          Existing dev contact ID (optional)
          <input value={contactId} onChange={(event) => setContactId(event.target.value)} />
        </label>
      </div>
      <div className="rf-live-idv__status" aria-live="polite">
        <b>State:</b> {controller.state.kind}
        {controller.state.kind === 'pending' && <> · ID: <code>{controller.state.idvId}</code></>}
        {controller.state.kind === 'failed' && controller.state.reason && <> · {controller.state.reason}</>}
      </div>
      <div className="rf-live-idv__actions">
        <button type="button" onClick={start} disabled={controller.state.kind !== 'ready'}>
          Start live dev verification
        </button>
        {(controller.state.kind === 'failed' || controller.state.kind === 'expired' || controller.state.kind === 'error') && (
          <button type="button" onClick={controller.retry}>Prepare retry</button>
        )}
        {(controller.state.kind === 'complete' || controller.state.kind === 'failed' || controller.state.kind === 'expired') && (
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>Prepare a new session</button>
        )}
      </div>
      {controller.state.kind === 'complete' && (
        <div className="rf-live-idv__complete">
          <strong>Verification complete.</strong>
          <span>Authenticated: {controller.state.result.authenticated ? 'yes' : 'no'}</span>
        </div>
      )}
    </main>
  );
}
