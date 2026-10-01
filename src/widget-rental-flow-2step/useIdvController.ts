import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { IdvApi, IdvIdentity, IdvScope } from './idvApi';
import { startIdvPolling } from './idvPolling';
import { idvReducer, initialIdvState, type SafeIdvResult } from './idvState';
import {
  closeVerificationPlaceholder,
  navigateVerificationWindow,
  openVerificationPlaceholder,
} from './openVerification';

interface StoredIdvSession {
  idvId: string;
  expiresAt: number;
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
}

export function useIdvController(options: IdvControllerOptions) {
  const [state, dispatch] = useReducer(idvReducer, initialIdvState);
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
      dispatch({ type: 'resume', generation, ...stored });
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

  const start = useCallback(async () => {
    if (state.kind !== 'ready' || !options.api || !options.identity) return;
    const generation = state.generation;
    const target = openVerificationPlaceholder();
    dispatch({ type: 'start', generation });
    try {
      const started = await options.api.start({ companyId, propertyId }, options.identity);
      if (!navigateVerificationWindow(target, started.verificationUrl, options.allowedVerificationHosts)) {
        closeVerificationPlaceholder(target);
      }
      if (key && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify({ idvId: started.idvId, expiresAt: started.expiresAt }));
      }
      dispatch({
        type: 'pending', generation, idvId: started.idvId,
        expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
      });
    } catch {
      closeVerificationPlaceholder(target);
      dispatch({ type: 'error', generation, retryable: true });
    }
  }, [
    key,
    companyId,
    options.allowedVerificationHosts,
    options.api,
    options.identity,
    propertyId,
    state,
  ]);

  const resend = useCallback(async () => {
    if (state.kind !== 'pending' || !options.api || !options.identity) return undefined;
    const generation = state.generation;
    const started = await options.api.start({ companyId, propertyId }, options.identity);
    if (key && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify({ idvId: started.idvId, expiresAt: started.expiresAt }));
    }
    dispatch({
      type: 'refresh-pending', generation, idvId: started.idvId,
      expiresAt: started.expiresAt, notificationStatus: started.notificationStatus,
    });
    return started.notificationStatus;
  }, [companyId, key, options.api, options.identity, propertyId, state]);

  return {
    state,
    start,
    resend,
    retry: () => dispatch({ type: 'retry', generation: state.generation }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
