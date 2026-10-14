import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createLead, type LeadApiConfig } from '@shared/leadsApi';
import { isPossiblePhone } from '@shared/ui';
import type { IdvApi, IdvScope } from './idvApi';
import type { IdvRequirement } from './idvPolicy';
import { useIdvController } from './useIdvController';
import { IdIllustration } from './IdIllustration';
import { parseCreatedIdvLead, readPreparedIdvLead, sameLeadContact, savePreparedIdvLead, type LeadContact, type IdvCheckoutReadiness } from './idvLead';
import { openVerificationPlaceholder, closeVerificationPlaceholder, navigateVerificationWindow, type VerificationWindow } from './openVerification';

export interface OneStepIdvConfig {
  api: IdvApi;
  scope: IdvScope;
  leadConfig: LeadApiConfig;
  allowedVerificationHosts: readonly string[];
  requirement: IdvRequirement;
  policyPending: boolean;
}

export function OneStepIdv({ config, contact, onReady }: {
  config: OneStepIdvConfig;
  contact: LeadContact;
  onReady: (readiness: IdvCheckoutReadiness | undefined) => void;
}) {
  const [lead, setLead] = useState(() => readPreparedIdvLead(config.scope));
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [later, setLater] = useState(false);
  const inFlight = useRef(false);
  const leadRequest = useRef<AbortController>();
  const titleId = useId();
  const mounted = useRef(true);
  const preparedWindow = useRef<VerificationWindow | null>(null);
  const autoStart = useRef(false);
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false;
    autoStart.current = false;
    leadRequest.current?.abort();
    closeVerificationPlaceholder(preparedWindow.current);
  }; }, []);
  const matches = Boolean(lead && sameLeadContact(lead.contact, contact));
  const identity = useMemo(() => lead && matches ? { ...lead.contact, contactId: lead.contactId } : undefined, [lead, matches]);
  const controller = useIdvController({
    enabled: Boolean(identity) && !config.policyPending && config.requirement !== 'disabled',
    api: config.api, scope: config.scope, identity,
    allowedVerificationHosts: config.allowedVerificationHosts,
  });
  const kind = controller.state.kind;
  const { start, handheld, verificationUrl } = controller;
  const first = contact.first.trim();
  const last = contact.last.trim();
  const email = contact.email.trim();
  const phone = contact.phone;
  const valid = Boolean(first && last && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isPossiblePhone(phone, 'US'));
  const contactFingerprint = JSON.stringify([first, last, email.toLowerCase(), phone.replace(/\D/g, '')]);
  useEffect(() => { setLater(false); }, [contactFingerprint]);
  useEffect(() => {
    onReady(!config.policyPending && (config.requirement === 'disabled'
      || (matches && kind === 'complete') || (config.requirement === 'optional' && later))
      ? { contact: { first, last, email, phone }, scope: { companyId: config.scope.companyId, propertyId: config.scope.propertyId }, verified: matches && kind === 'complete' } : undefined);
  }, [config.policyPending, config.requirement, config.scope.companyId, config.scope.propertyId, kind, matches, later, first, last, email, phone, onReady]);

  useEffect(() => {
    if (!autoStart.current || preparing) return;
    if (!identity) {
      autoStart.current = false;
      closeVerificationPlaceholder(preparedWindow.current);
      preparedWindow.current = null;
      return;
    }
    if (kind === 'idle' || kind === 'checking') return;
    autoStart.current = false;
    const target = preparedWindow.current;
    preparedWindow.current = null;
    if (kind === 'ready') {
      // The blank mobile tab was opened during the original click, before
      // creating the lead. The shared controller takes ownership from here.
      void start(handheld ? target : undefined);
    } else if (kind === 'pending' && verificationUrl && target) {
      if (!navigateVerificationWindow(target, verificationUrl, config.allowedVerificationHosts)) closeVerificationPlaceholder(target);
    } else {
      closeVerificationPlaceholder(target);
    }
  }, [preparing, kind, identity, start, handheld, verificationUrl, config.allowedVerificationHosts]);

  const prepare = async () => {
    if (!valid || config.policyPending || config.requirement === 'disabled'
      || !config.scope.companyId || !config.scope.propertyId || inFlight.current) return;
    inFlight.current = true;
    setPreparing(true);
    setPrepareError('');
    const captured = { first, last, email, phone };
    const request = new AbortController();
    leadRequest.current = request;
    const timeout = window.setTimeout(() => request.abort(), 30_000);
    // Preserve mobile user activation across the lead creation and lookup.
    preparedWindow.current = controller.handheld ? openVerificationPlaceholder() : null;
    autoStart.current = true;
    try {
      const response = await createLead(config.leadConfig, {
        ...captured, subject: 'Website Rental - Pre-payment ID Verification',
        message: 'Renter preparing identity verification before completing an online rental.',
      }, { signal: request.signal });
      if (!mounted.current || request.signal.aborted) return;
      const prepared = parseCreatedIdvLead(response, config.leadConfig.appId, captured);
      savePreparedIdvLead(config.scope, prepared);
      if (mounted.current) setLead(prepared);
    } catch {
      const cancelled = request.signal.aborted && !autoStart.current;
      autoStart.current = false;
      closeVerificationPlaceholder(preparedWindow.current);
      preparedWindow.current = null;
      if (mounted.current && !cancelled) setPrepareError('Your contact could not be prepared for verification. Please try again.');
    } finally {
      window.clearTimeout(timeout);
      leadRequest.current = undefined;
      inFlight.current = false;
      if (mounted.current) setPreparing(false);
    }
  };

  return (
    <section className="rf-sx-idv rf2-pre-idv" aria-labelledby={titleId}>
      <h3 id={titleId} className="rf-sx-idv-title">ID Verification</h3>
      <div className="rf-sx-idv-body">
        <IdIllustration />
        <div className="rf-sx-idv-actions">
          {!identity ? (
            <button type="button" className="rf-sx-btn rf-sx-btn--solid" disabled={!valid || preparing || config.policyPending || config.requirement === 'disabled' || !config.scope.companyId || !config.scope.propertyId} onClick={() => void prepare()}>
              {preparing ? 'Preparing Verification…' : 'Verify ID Now'}
            </button>
          ) : kind === 'complete' ? <p role="status">ID Verification Complete</p>
            : kind === 'ready' ? <button type="button" className="rf-sx-btn rf-sx-btn--solid" onClick={() => void controller.start()}>Verify ID Now</button>
              : kind === 'pending' ? <>
                <p role="status">Verification in progress. Complete the steps on your phone, then return here.</p>
                <button type="button" className="rf-sx-btn rf-sx-btn--outline" onClick={controller.continueInNewTab}>Continue Verification</button>
              </> : kind === 'failed' || kind === 'expired' || kind === 'error' ? <>
                <p role="status">{kind === 'error' && !controller.state.retryable ? 'Verification Needs Assistance. Please contact the facility.' : 'Verification could not be completed. Please try again.'}</p>
                {!(kind === 'error' && !controller.state.retryable) && <button type="button" className="rf-sx-btn rf-sx-btn--outline" onClick={controller.retry}>Reverify</button>}
              </> : <p role="status">{kind === 'starting' ? 'Starting Verification…' : 'Checking Verification…'}</p>}
          {config.requirement === 'optional' && kind !== 'complete' && !config.policyPending && (
            <button type="button" className="rf-sx-btn rf-sx-btn--outline" onClick={() => {
              autoStart.current = false;
              leadRequest.current?.abort();
              closeVerificationPlaceholder(preparedWindow.current);
              preparedWindow.current = null;
              setLater(true);
            }}>Verify ID Later</button>
          )}
        </div>
      </div>
      {!valid && <p className="rf-sx-idv-note">Enter your name, email, and phone above to prepare verification.</p>}
      {identity && kind === 'ready' && <p className="rf-sx-idv-note">Your contact is ready. Select Verify ID Now to begin. Mobile verification opens in a new tab.</p>}
      {kind === 'pending' && controller.state.notificationStatus === 'failed' && <p className="rf-sx-idv-note">The text message could not be sent. Select Continue Verification to use the existing session.</p>}
      {kind === 'pending' && controller.popupBlocked && <p className="rf-sx-idv-note" role="status">The verification tab was blocked. Select Continue Verification to try opening it again.</p>}
      {later && <p className="rf-sx-idv-note" role="status">You can complete verification after payment.</p>}
      {prepareError && <p className="rf-sx-idv-note" role="alert">{prepareError}</p>}
    </section>
  );
}
