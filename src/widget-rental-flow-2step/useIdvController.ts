import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { captureDevice, IdvRequestError, type IdvApi, type IdvIdentity, type IdvScope } from './idvApi';
import { startIdvPolling } from './idvPolling';
import { idvReducer, initialIdvState, type SafeIdvResult } from './idvState';
import { allowedVerificationUrl } from './openVerification';
import { idvSessionGet, idvSessionRemove, idvSessionSet } from './idvStorage';

interface StoredIdvSession {
  idvId: string;
  expiresAt: number;
  /** Kept so "Return to this Device" still works after a reload. */
  verificationUrl?: string;
}

function storageKey(scope: IdvScope, identity: IdvIdentity): string | undefined {
  const owner = identity.contactId || identity.leaseId;
  if (!owner) return undefined;
  return `mariposa:idv:v1:${scope.companyId}:${scope.propertyId}:${owner}`;
}

function readStored(key: string | undefined): StoredIdvSession | undefined {
  if (!key) return undefined;
  try {
    const value = JSON.parse(idvSessionGet(key) ?? 'null') as StoredIdvSession | null;
    if (!value || typeof value.idvId !== 'string' || typeof value.expiresAt !== 'number') return undefined;
    if (value.verificationUrl !== undefined && typeof value.verificationUrl !== 'string') return undefined;
    if (Date.now() >= value.expiresAt * 1_000) {
      idvSessionRemove(key);
      return undefined;
    }
    return value;
  } catch {
    idvSessionRemove(key);
    return undefined;
  }
}

export interface IdvControllerOptions {
  enabled: boolean;
  api?: IdvApi;
  scope: IdvScope;
  identity?: IdvIdentity;
  allowedVerificationHosts: readonly string[];
  /** Persist the completed checkout before a same-tab navigation leaves it.
   *  Receives the pending verification so the snapshot can expire with it. */
  beforeSameTabNavigation?: (pending: { idvId: string; expiresAt: number }) => boolean;
}

const CAPTURE_QUERIES = ['(max-width: 768px)', '(pointer: coarse)'] as const;

/**
 * `captureDevice()` re-read whenever either query changes.
 *
 * The same value must reach two places — the `device` field Incode is served
 * from, and whether the renter is handed off in this tab or a popup. Reading
 * it twice let them disagree (a popup asking Incode for the direct-camera
 * flow), so it is resolved once here and passed to both.
 */
export function useCaptureDevice(): 'mobile' | 'desktop' {
  const [device, setDevice] = useState(captureDevice);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const sync = () => setDevice(captureDevice());
    const lists = CAPTURE_QUERIES.map((query) => window.matchMedia(query));
    lists.forEach((list) => list.addEventListener('change', sync));
    sync();
    return () => lists.forEach((list) => list.removeEventListener('change', sync));
  }, []);
  return device;
}

export function useIdvController(options: IdvControllerOptions) {
  const [state, dispatch] = useReducer(idvReducer, initialIdvState);
  const activeRequest = useRef<AbortController>();
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const cancelRequest = useCallback(() => {
    activeRequest.current?.abort();
    activeRequest.current = undefined;
  }, []);
  useEffect(() => cancelRequest, [cancelRequest, options.enabled, options.api, options.identity,
    options.scope.companyId, options.scope.propertyId, options.allowedVerificationHosts]);
  // Validated once, when it arrives. Both the same-tab hand-off and the
  // modal's "Return to this Device" navigate to it later.
  const [verificationUrl, setVerificationUrl] = useState<string | undefined>(undefined);
  const { companyId, propertyId } = options.scope;
  const key = useMemo(
    () => options.identity ? storageKey({ companyId, propertyId }, options.identity) : undefined,
    [companyId, options.identity, propertyId],
  );

  useEffect(() => {
    if (!options.enabled || !options.api || !options.identity) {
      if (state.kind !== 'idle') dispatch({ type: 'reset' });
      return undefined;
    }
    const generation = state.generation + 1;
    dispatch({ type: 'check' });
    const stored = readStored(key);
    const uncertain = Boolean(key && idvSessionGet(`${key}:start-uncertain`));
    if (uncertain && !stored) {
      setVerificationUrl(undefined);
      dispatch({ type: 'error', generation, retryable: false });
      return undefined;
    }
    if (stored) {
      setVerificationUrl(stored.verificationUrl
        ? allowedVerificationUrl(stored.verificationUrl, options.allowedVerificationHosts)?.href
        : undefined);
      dispatch({ type: 'resume', generation, idvId: stored.idvId, expiresAt: stored.expiresAt, resendUncertain: uncertain });
      return undefined;
    }
    if (!options.identity.contactId) {
      dispatch({ type: 'not-verified', generation });
      return undefined;
    }
    let cancelled = false;
    const lookupController = new AbortController();
    void options.api.lookup({ companyId, propertyId }, options.identity.contactId, lookupController.signal)
      .then((result) => {
        if (cancelled) return;
        // Only an authenticated result completes (the reducer enforces it too):
        // an old, failed verification on the contact leaves the renter to verify now.
        dispatch(result?.authenticated
          ? { type: 'complete', generation, result }
          : { type: 'not-verified', generation });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'error', generation, retryable: true });
      });
    return () => { cancelled = true; lookupController.abort(); };
    // Re-resolve only when the renter/rental scope changes, not on each state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, key, options.allowedVerificationHosts, options.api, options.enabled, options.identity, propertyId]);

  useEffect(() => {
    if (state.kind !== 'pending' || !options.api) return undefined;
    return startIdvPolling<SafeIdvResult>({
      expiresAt: state.expiresAt,
      poll: async (signal) => {
        const result = await options.api!.poll({ companyId, propertyId }, state.idvId, signal);
        if (result.status === 'pending') return { kind: 'continue' };
        if (result.status === 'failed') return { kind: 'failed', reason: result.reason };
        // "complete" but not authenticated is a failed verification, never a pass
        // (the reducer enforces it too) — complete is what reveals the access code.
        if (!result.authenticated) return { kind: 'failed', reason: 'not-authenticated' };
        return { kind: 'complete', value: result };
      },
      onComplete(result) {
        if (key) { idvSessionRemove(key); idvSessionRemove(`${key}:start-uncertain`); }
        dispatch({ type: 'complete', generation: state.generation, result });
      },
      onFailed(reason) {
        if (key) {
          idvSessionRemove(key);
          if (!state.resendUncertain) idvSessionRemove(`${key}:start-uncertain`);
        }
        dispatch(state.resendUncertain
          ? { type: 'error', generation: state.generation, retryable: false }
          : { type: 'failed', generation: state.generation, reason });
      },
      onExpired() {
        if (key) {
          idvSessionRemove(key);
          if (!state.resendUncertain) idvSessionRemove(`${key}:start-uncertain`);
        }
        dispatch(state.resendUncertain
          ? { type: 'error', generation: state.generation, retryable: false }
          : { type: 'expired', generation: state.generation });
      },
      onError() {
        // Scheduler owns retry/backoff. State remains pending and observable.
      },
    });
  }, [companyId, key, options.api, propertyId, state]);

  const device = useCaptureDevice();
  const sameTab = device === 'mobile';
  const startApi = options.api;
  const startIdentity = options.identity;
  const allowedHosts = options.allowedVerificationHosts;
  const beforeSameTabNavigation = options.beforeSameTabNavigation;
  const requestIsCurrent = useCallback((request: AbortController, captured: IdvControllerOptions) => {
    const latest = latestOptions.current;
    return activeRequest.current === request && !request.signal.aborted && latest.enabled
      && latest.api === captured.api && latest.identity === captured.identity
      && latest.scope.companyId === captured.scope.companyId
      && latest.scope.propertyId === captured.scope.propertyId
      && latest.allowedVerificationHosts === captured.allowedVerificationHosts;
  }, []);
  const start = useCallback(async () => {
    if (!options.enabled || activeRequest.current || state.kind !== 'ready' || !startApi || !startIdentity) return;
    const request = new AbortController();
    const captured = options;
    activeRequest.current = request;
    const generation = state.generation;
    setVerificationUrl(undefined);
    dispatch({ type: 'start', generation });
    if (key) idvSessionSet(`${key}:start-uncertain`, '1');
    try {
      const started = await startApi.start({ companyId, propertyId }, startIdentity, device, request.signal);
      if (!requestIsCurrent(request, captured)) return;
      const safeUrl = allowedVerificationUrl(started.verificationUrl, allowedHosts);
      if (!safeUrl) throw new Error('Invalid ID verification URL.');
      setVerificationUrl(safeUrl.href);
      // Best effort: a storage failure here must not turn a start that has
      // already billed and texted into an error.
      if (key) {
        const saved = idvSessionSet(key, JSON.stringify({
          idvId: started.idvId, expiresAt: started.expiresAt, verificationUrl: safeUrl.href,
        }));
        if (saved) idvSessionRemove(`${key}:start-uncertain`);
      }
      dispatch({
        type: 'pending', generation, idvId: started.idvId,
        expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
      });
      // Desktop opens nothing: the design hands off by text message and keeps
      // the renter on the modal. Opening the hosted page as well put Incode's
      // own QR screen in front of them, which the design never asks for.
      if (sameTab) {
        if (beforeSameTabNavigation?.({ idvId: started.idvId, expiresAt: started.expiresAt }) !== false) {
          window.location.assign(safeUrl.href);
        }
      }
    } catch (error) {
      // A failed POST may already have sent a text or created a billable
      // attempt. Do not offer another start without backend reconciliation.
      if (requestIsCurrent(request, captured)) {
        const retryable = error instanceof IdvRequestError && !error.outcomeUnknown;
        if (retryable && key) idvSessionRemove(`${key}:start-uncertain`);
        dispatch({ type: 'error', generation, retryable });
      }
    } finally {
      if (activeRequest.current === request) activeRequest.current = undefined;
    }
  }, [
    key,
    companyId,
    allowedHosts,
    beforeSameTabNavigation,
    device,
    sameTab,
    propertyId,
    startApi,
    startIdentity,
    state,
    options,
    requestIsCurrent,
  ]);

  const resend = useCallback(async () => {
    if (!options.enabled || activeRequest.current || state.kind !== 'pending' || state.resendUncertain || !options.api || !options.identity) return undefined;
    const request = new AbortController();
    const captured = options;
    activeRequest.current = request;
    // Move to a new generation BEFORE the replacement starts: the old session
    // is still being polled, and a late failed/expired from it must not end the
    // flow under the session that was just texted.
    const generation = state.generation + 1;
    dispatch({ type: 'resend', generation: state.generation });
    if (key) idvSessionSet(`${key}:start-uncertain`, '1');
    try {
      const started = await options.api.start({ companyId, propertyId }, options.identity, device, request.signal);
      if (!requestIsCurrent(request, captured)) return undefined;
      const safeUrl = allowedVerificationUrl(started.verificationUrl, allowedHosts);
      if (!safeUrl) throw new Error('Invalid ID verification URL.');
      setVerificationUrl(safeUrl.href);
      if (key) {
        const saved = idvSessionSet(key, JSON.stringify({
          idvId: started.idvId, expiresAt: started.expiresAt, verificationUrl: safeUrl.href,
        }));
        if (saved) idvSessionRemove(`${key}:start-uncertain`);
      }
      dispatch({
        type: 'refresh-pending', generation, idvId: started.idvId,
        expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
      });
      return started.notificationStatus;
    } catch (error) {
      if (requestIsCurrent(request, captured)) {
        const outcomeUnknown = !(error instanceof IdvRequestError) || error.outcomeUnknown;
        if (!outcomeUnknown && key) idvSessionRemove(`${key}:start-uncertain`);
        dispatch({ type: 'resend-failed', generation, outcomeUnknown });
      }
      throw error;
    } finally {
      if (activeRequest.current === request) activeRequest.current = undefined;
    }
  }, [allowedHosts, companyId, device, key, options, propertyId, requestIsCurrent, state]);

  /** Phone, verification still pending: go back to the same session in this
   *  tab — no new start, no new text. False when there is nothing to resume. */
  const continueInThisTab = useCallback((): boolean => {
    if (!latestOptions.current.enabled || state.kind !== 'pending' || !verificationUrl
      || Date.now() >= state.expiresAt * 1_000) return false;
    if (beforeSameTabNavigation?.({ idvId: state.idvId, expiresAt: state.expiresAt }) === false) {
      window.open(verificationUrl, '_blank', 'noopener');
      return true;
    }
    window.location.assign(verificationUrl);
    return true;
  }, [beforeSameTabNavigation, state, verificationUrl]);

  return {
    state,
    continueInThisTab,
    start,
    resend,
    /** Validated hosted-capture URL, for the desktop modal's QR code. */
    verificationUrl,
    /** True when start() will leave this tab rather than open a popup. The
     *  success screen reads it so it does not raise a QR modal over a
     *  navigation that is already under way. */
    sameTab,
    retry: () => { cancelRequest(); dispatch({ type: 'retry', generation: state.generation }); },
    reset: () => { cancelRequest(); setVerificationUrl(undefined); dispatch({ type: 'reset' }); },
  };
}
