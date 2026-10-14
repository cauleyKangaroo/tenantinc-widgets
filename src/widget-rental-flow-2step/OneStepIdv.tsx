import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createLead, type LeadApiConfig } from '@shared/leadsApi';
import { Button, isPossiblePhone } from '@shared/ui';
import type { IdvApi, IdvScope } from './idvApi';
import type { IdvRequirement } from './idvPolicy';
import { useIdvController } from './useIdvController';
import { IdvCardTitle, IdvPopupNote, IdvCompleteTitle, IdvAddressNotice, IdvFailedContent, IdvLaterContent } from './IdvStatus';
import { IdVerifyModal } from './IdVerifyModal';
import { isRawIdvId } from './idvLinking';
import {
  MailingAddressReadout, MailingAddressFields, LicenceReadout, LicenceFields, EMPTY_MAILING, EMPTY_LICENCE,
  contactDetailsFrom, isoToMasked, mailingProblems, licenceProblems, type MailingValue, type LicenceValue,
} from './IdvDetails';
import { parseCreatedIdvLead, readPreparedIdvLead, sameLeadContact, savePreparedIdvLead, type LeadContact, type IdvCheckoutReadiness } from './idvLead';
import { openVerificationPlaceholder, closeVerificationPlaceholder, navigateVerificationWindow, type VerificationWindow } from './openVerification';

export interface OneStepIdvConfig {
  api: IdvApi;
  scope: IdvScope;
  leadConfig: LeadApiConfig;
  allowedVerificationHosts: readonly string[];
  requirement: IdvRequirement;
  policyPending: boolean;
  /** No staff on site: a failed check points to the phone, not the counter. */
  remoteOperated?: boolean;
  facilityPhone?: string;
}

/** The address and licence after verification, for the tenant's contact. */
export interface OneStepIdvDetails {
  /** False while a required part of the mailing address is missing. */
  complete: boolean;
  contact: ReturnType<typeof contactDetailsFrom>;
}

export function OneStepIdv({ config, contact, onReady, onDetails, showErrors = false }: {
  config: OneStepIdvConfig;
  contact: LeadContact;
  onReady: (readiness: IdvCheckoutReadiness | undefined) => void;
  onDetails?: (details: OneStepIdvDetails | undefined) => void;
  /** After a pay attempt: mark the missing address fields. */
  showErrors?: boolean;
}) {
  const [lead, setLead] = useState(() => readPreparedIdvLead(config.scope));
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [later, setLater] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
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
    lookupByEmail: true,
  });
  const kind = controller.state.kind;
  const completedIdvId = controller.state.kind === 'complete' ? controller.state.result.idvId : undefined;
  const validCompletion = matches && kind === 'complete' && isRawIdvId(completedIdvId);
  const canDefer = !preparing && ['idle', 'ready', 'failed', 'expired'].includes(kind);
  const scanResult = controller.state.kind === 'complete' ? controller.state.result : undefined;
  const [mailing, setMailing] = useState<MailingValue>(EMPTY_MAILING);
  const [licence, setLicence] = useState<LicenceValue>(EMPTY_LICENCE);
  const [editMail, setEditMail] = useState(false);
  const [editDl, setEditDl] = useState(false);
  /** The contact the scanned details belong to; another contact must not inherit them. */
  const seededFor = useRef<string | undefined>();
  // Seed from the scan each time a verification completes. The ID is the
  // source; Edit is how the renter corrects it.
  useEffect(() => {
    if (!validCompletion || !scanResult) return;
    const a = scanResult.address;
    const seeded: MailingValue = {
      ...EMPTY_MAILING,
      query: a?.street ?? '', address1: a?.street ?? '', city: a?.city ?? '',
      state: (a?.state ?? '').toUpperCase().slice(0, 2), zip: a?.zip ?? '',
    };
    seededFor.current = contactFingerprint;
    setMailing(seeded);
    // Always the summary first (Figma Complete); Edit opens the fields.
    setEditMail(false);
    const l = scanResult.driversLicense;
    setLicence({ ...EMPTY_LICENCE, number: l?.number ?? '', exp: isoToMasked(l?.expiration), state: (l?.state ?? '').toUpperCase().slice(0, 2) });
    setEditDl(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validCompletion, completedIdvId]);
  const failedCheck = kind === 'failed' || kind === 'expired' || (kind === 'error' && controller.state.retryable);
  const needsAssistance = kind === 'error' && !controller.state.retryable;
  const deferred = later && config.requirement === 'optional';
  // Typed in when there is no scan: after a failed check or a deferral.
  const typedDetails = !validCompletion && (failedCheck || deferred);
  // The licence is required exactly when ID verification is.
  const licenceRequired = typedDetails && config.requirement === 'required';
  const mailErrors = mailingProblems(mailing);
  const dlErrors = licenceRequired ? licenceProblems(licence) : {};
  const detailsComplete = Object.keys(mailErrors).length === 0 && Object.keys(dlErrors).length === 0;
  const detailsShown = validCompletion || typedDetails;
  useEffect(() => {
    onDetails?.(detailsShown ? { complete: detailsComplete, contact: contactDetailsFrom(mailing, licence) } : undefined);
  }, [detailsShown, detailsComplete, mailing, licence, onDetails]);
  const { start, handheld, verificationUrl } = controller;
  const first = contact.first.trim();
  const last = contact.last.trim();
  const email = contact.email.trim();
  const phone = contact.phone;
  const valid = Boolean(first && last && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isPossiblePhone(phone, 'US'));
  const contactFingerprint = JSON.stringify([first, last, email.toLowerCase(), phone.replace(/\D/g, '')]);
  useEffect(() => {
    setLater(false);
    setHandoffOpen(false);
    // Scanned details are the verified person's: drop them if the contact changes.
    if (seededFor.current && seededFor.current !== contactFingerprint) {
      seededFor.current = undefined;
      setMailing(EMPTY_MAILING);
      setLicence(EMPTY_LICENCE);
      setEditMail(false);
      setEditDl(false);
    }
  }, [contactFingerprint]);
  useEffect(() => {
    if (handheld || later || prepareError || (!identity && !preparing)
      || kind === 'complete' || kind === 'failed' || kind === 'expired' || kind === 'error') {
      setHandoffOpen(false);
    }
  }, [handheld, later, prepareError, identity, preparing, kind]);
  useEffect(() => {
    onReady(!config.policyPending && (config.requirement === 'disabled'
      // Optional: deferring, or a failed check (verified at move-in instead), still lets the renter pay.
      || validCompletion || (config.requirement === 'optional' && ((later && canDefer) || failedCheck)))
      ? { contact: { first, last, email, phone }, scope: { companyId: config.scope.companyId, propertyId: config.scope.propertyId }, verified: validCompletion, idvId: validCompletion ? completedIdvId : undefined } : undefined);
  }, [config.policyPending, config.requirement, config.scope.companyId, config.scope.propertyId, validCompletion, later, canDefer, failedCheck, first, last, email, phone, completedIdvId, onReady]);

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
    if (!handheld) setHandoffOpen(true);
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
    <>
    <section className={`rf-sx-idv rf2-pre-idv${validCompletion ? ' rf-sx-idv--done' : failedCheck || needsAssistance ? ' rf-sx-idv--alert' : ''}`} aria-labelledby={titleId}>
      {validCompletion ? (
        <IdvCompleteTitle id={titleId} />
      ) : failedCheck || needsAssistance ? (
        <IdvFailedContent id={titleId} needsAssistance={needsAssistance} remoteOperated={config.remoteOperated} phone={config.facilityPhone} onReverify={controller.retry} />
      ) : deferred ? (
        <IdvLaterContent id={titleId} onVerifyNow={() => setLater(false)} />
      ) : (
        <IdvCardTitle id={titleId} required={config.requirement === 'required'} />
      )}
      {!validCompletion && !failedCheck && !needsAssistance && !deferred && (
      <div className="rf-sx-idv-body">
        <div className="rf-sx-idv-actions">
          {!identity ? (
            <Button tone="secondary" className="rf-sx-btn" disabled={!valid || preparing || config.policyPending || config.requirement === 'disabled' || !config.scope.companyId || !config.scope.propertyId} onClick={() => void prepare()}>
              {preparing ? 'Preparing Verification…' : 'Verify ID Now'}
            </Button>
          ) : kind === 'complete' ? null
            : kind === 'ready' ? <Button tone="secondary" className="rf-sx-btn" onClick={() => {
              if (!handheld) setHandoffOpen(true);
              void controller.start();
            }}>Verify ID Now</Button>
              : kind === 'pending' ? <>
                <p role="status">Verification in progress. Complete the steps on your phone, then return here.</p>
                <Button tone="dark" fill="outline" className="rf-sx-btn" onClick={() => {
                  if (handheld) controller.continueInNewTab();
                  else setHandoffOpen(true);
                }}>Continue Verification</Button>
              </> : <p role="status">{kind === 'starting' ? 'Starting Verification…' : 'Checking Verification…'}</p>}
          {config.requirement === 'optional' && kind !== 'complete' && !config.policyPending && (
            <Button tone="dark" fill="outline" className="rf-sx-btn" disabled={!canDefer} onClick={() => {
              autoStart.current = false;
              leadRequest.current?.abort();
              closeVerificationPlaceholder(preparedWindow.current);
              preparedWindow.current = null;
              setLater(true);
            }}>Verify ID Later</Button>
          )}
        </div>
      </div>
      )}
      {!validCompletion && !failedCheck && !needsAssistance && !deferred && <IdvPopupNote />}
      {!valid && <p className="rf-sx-idv-note">Enter your name, email, and phone above to prepare verification.</p>}
      {identity && kind === 'ready' && <p className="rf-sx-idv-note">Your contact is ready. Select Verify ID Now to begin. Mobile verification opens in a new tab.</p>}
      {kind === 'pending' && controller.state.notificationStatus === 'failed' && <p className="rf-sx-idv-note">The text message could not be sent. Select Continue Verification to use the existing session.</p>}
      {kind === 'pending' && controller.popupBlocked && <p className="rf-sx-idv-note" role="status">The verification tab was blocked. Select Continue Verification to try opening it again.</p>}
      {prepareError && <p className="rf-sx-idv-note" role="alert">{prepareError}</p>}
      {kind === 'complete' && !validCompletion && <p className="rf-sx-idv-note" role="alert">Verification completed, but its linking ID could not be confirmed. Please contact the facility before paying.</p>}
      {!handheld && (
        <IdVerifyModal
          open={handoffOpen}
          onClose={() => setHandoffOpen(false)}
          // Connected mode never takes a completion result from presentation.
          // Only the controller's authenticated poll/lookup can allow payment.
          onResult={() => setHandoffOpen(false)}
          phone={identity?.phone ?? phone}
          connected
          lifecycle={preparing ? 'starting' : kind}
          notificationStatus={kind === 'pending' ? controller.state.notificationStatus : undefined}
          onResend={controller.resend}
          resendUncertain={kind === 'pending' && controller.state.resendUncertain === true}
          verificationUrl={verificationUrl}
        />
      )}
    </section>
    {typedDetails && (
      <div className="rf2-pre-idv-after">
        <MailingAddressFields
          value={mailing}
          compact
          onChange={(patch) => setMailing((m) => ({ ...m, ...patch }))}
          errors={showErrors ? mailErrors : {}}
        />
        <LicenceFields
          value={licence}
          required={licenceRequired}
          errors={showErrors ? dlErrors : {}}
          onChange={(patch) => setLicence((l) => ({ ...l, ...patch }))}
        />
      </div>
    )}
    {validCompletion && (
      <div className="rf2-pre-idv-after">
        <IdvAddressNotice />
        {editMail || (showErrors && Object.keys(mailErrors).length > 0) ? (
          <MailingAddressFields
            value={mailing}
            onChange={(patch) => setMailing((m) => ({ ...m, ...patch }))}
            errors={showErrors ? mailErrors : {}}
          />
        ) : (
          <MailingAddressReadout value={mailing} onEdit={() => setEditMail(true)} />
        )}
        {editDl ? (
          <LicenceFields value={licence} onChange={(patch) => setLicence((l) => ({ ...l, ...patch }))} />
        ) : (
          <LicenceReadout value={licence} onEdit={() => setEditDl(true)} />
        )}
      </div>
    )}
    </>
  );
}
