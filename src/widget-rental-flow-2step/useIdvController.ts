import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { captureDevice, type IdvApi, type IdvIdentity, type IdvScope } from './idvApi';
import { startIdvPolling } from './idvPolling';
import { idvReducer, initialIdvState, type SafeIdvResult } from './idvState';
import {
  allowedVerificationUrl,
  closeVerificationPlaceholder,
  navigateVerificationWindow,
  openVerificationPlaceholder,
} from './openVerification';

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
  if (!key || typeof sessionStorage === 'undefined') return undefined;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as StoredIdvSession | null;
    if (!value || typeof value.idvId !== 'string' || typeof value.expiresAt !== 'number') return undefined;
    if (value.verificationUrl !== undefined && typeof value.verificationUrl !== 'string') return undefined;
    if (Date.now() >= value.expiresAt * 1_000) {
      sessionStorage.removeItem(key);
      return undefined;
    }
    return value;
  } catch {
    sessionStorage.removeItem(key);
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
  beforeSameTabNavigation?: (pending: { idvId: string; expiresAt: number }) => void;
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
    if (stored) {
      setVerificationUrl(stored.verificationUrl);
      dispatch({ type: 'resume', generation, idvId: stored.idvId, expiresAt: stored.expiresAt });
      return undefined;
    }
    if (!options.identity.contactId) {
      dispatch({ type: 'not-verified', generation });
      return undefined;
    }
    let cancelled = false;
    void options.api.lookup({ companyId, propertyId }, options.identity.contactId)
      .then((result) => {
        if (cancelled) return;
        dispatch(result
          ? { type: 'complete', generation, result }
          : { type: 'not-verified', generation });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'error', generation, retryable: true });
      });
    return () => { cancelled = true; };
    // Re-resolve only when the renter/rental scope changes, not on each state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, key, options.api, options.enabled, options.identity, propertyId]);

  useEffect(() => {
    if (state.kind !== 'pending' || !options.api) return undefined;
    return startIdvPolling<SafeIdvResult>({
      expiresAt: state.expiresAt,
      poll: async (signal) => {
        const result = await options.api!.poll({ companyId, propertyId }, state.idvId, signal);
        if (result.status === 'pending') return { kind: 'continue' };
        if (result.status === 'failed') return { kind: 'failed', reason: result.reason };
        const completed = result;
        return { kind: 'complete', value: completed };
      },
      onComplete(result) {
        if (key && typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
        dispatch({ type: 'complete', generation: state.generation, result });
      },
      onFailed(reason) {
        if (key && typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
        dispatch({ type: 'failed', generation: state.generation, reason });
      },
      onExpired() {
        if (key && typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
        dispatch({ type: 'expired', generation: state.generation });
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
  const start = useCallback(async () => {
    if (state.kind !== 'ready' || !startApi || !startIdentity) return;
    const generation = state.generation;
    dispatch({ type: 'start', generation });
    try {
      const started = await startApi.start({ companyId, propertyId }, startIdentity, device);
      const safeUrl = allowedVerificationUrl(started.verificationUrl, allowedHosts);
      if (!safeUrl) throw new Error('Invalid ID verification URL.');
      setVerificationUrl(safeUrl.href);
      if (key && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify({
          idvId: started.idvId, expiresAt: started.expiresAt, verificationUrl: safeUrl.href,
        }));
      }
      dispatch({
        type: 'pending', generation, idvId: started.idvId,
        expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
      });
      // Desktop opens nothing: the design hands off by text message and keeps
      // the renter on the modal. Opening the hosted page as well put Incode's
      // own QR screen in front of them, which the design never asks for.
      if (sameTab) {
        beforeSameTabNavigation?.({ idvId: started.idvId, expiresAt: started.expiresAt });
        window.location.assign(safeUrl.href);
      }
    } catch {
      dispatch({ type: 'error', generation, retryable: true });
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
  ]);

  const resend = useCallback(async () => {
    if (state.kind !== 'pending' || !options.api || !options.identity) return undefined;
    const generation = state.generation;
    const started = await options.api.start({ companyId, propertyId }, options.identity, device);
    const safeUrl = allowedVerificationUrl(started.verificationUrl, allowedHosts);
    if (safeUrl) setVerificationUrl(safeUrl.href);
    if (key && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify({
        idvId: started.idvId, expiresAt: started.expiresAt, verificationUrl: safeUrl?.href,
      }));
    }
    dispatch({
      type: 'refresh-pending', generation, idvId: started.idvId,
      expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
    });
    return started.notificationStatus;
  }, [allowedHosts, companyId, device, key, options.api, options.identity, propertyId, state]);

  /** The design's escape hatch: capture here instead of on the phone. Opened
   *  inside the click gesture, which is why the URL is resolved beforehand. */
  const returnToThisDevice = useCallback((): boolean => {
    if (!verificationUrl) return false;
    const target = openVerificationPlaceholder();
    if (navigateVerificationWindow(target, verificationUrl, allowedHosts)) return true;
    closeVerificationPlaceholder(target);
    return false;
  }, [allowedHosts, verificationUrl]);

  return {
    state,
    start,
    resend,
    returnToThisDevice,
    canReturnToThisDevice: Boolean(verificationUrl),
    /** True when start() will leave this tab rather than open a popup. The
     *  success screen reads it so it does not raise a QR modal over a
     *  navigation that is already under way. */
    sameTab,
    retry: () => dispatch({ type: 'retry', generation: state.generation }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
