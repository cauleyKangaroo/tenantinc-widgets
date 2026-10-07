/** Remote ID-verification lifecycle only. Property policy and local choices
 * (in-store/later) remain outside this union until their source is settled. */
export type SafeIdvResult = {
  idvId: string;
  authenticated: boolean;
  driversLicense?: { number?: string; state?: string; expiration?: string };
};

type Generation = { generation: number };

export type IdvState =
  | ({ kind: 'idle' } & Generation)
  | ({ kind: 'checking' } & Generation)
  | ({ kind: 'ready' } & Generation)
  | ({ kind: 'starting' } & Generation)
  | ({ kind: 'pending'; idvId: string; expiresAt: number; notificationStatus?: 'sent' | 'failed' | 'skipped' } & Generation)
  | ({ kind: 'complete'; result: SafeIdvResult } & Generation)
  | ({ kind: 'failed'; reason?: string } & Generation)
  | ({ kind: 'expired' } & Generation)
  | ({ kind: 'error'; retryable: boolean } & Generation);

/** Every asynchronous result carries the generation captured before its call. */
export type IdvAction =
  | { type: 'check' }
  | { type: 'not-verified'; generation: number }
  | { type: 'start'; generation: number }
  | { type: 'resume'; generation: number; idvId: string; expiresAt: number }
  | { type: 'pending'; generation: number; idvId: string; expiresAt: number; notificationStatus?: 'sent' | 'failed' | 'skipped' }
  | { type: 'refresh-pending'; generation: number; idvId: string; expiresAt: number; notificationStatus?: 'sent' | 'failed' | 'skipped' }
  | { type: 'complete'; generation: number; result: SafeIdvResult }
  | { type: 'failed'; generation: number; reason?: string }
  | { type: 'expired'; generation: number }
  | { type: 'error'; generation: number; retryable: boolean }
  | { type: 'retry'; generation: number }
  /** Starts a replacement session: a new generation, so the old one's late results are ignored. */
  | { type: 'resend'; generation: number }
  | { type: 'reset' };

export const initialIdvState: IdvState = { kind: 'idle', generation: 0 };

function sameGeneration(state: IdvState, action: { generation: number }): boolean {
  return state.generation === action.generation;
}

/**
 * Illegal or stale actions are ignored. `reset` increments the generation, so
 * a response from an abandoned request cannot enter the next attempt even if
 * that newer attempt has reached the same lifecycle state.
 */
export function idvReducer(state: IdvState, action: IdvAction): IdvState {
  if (action.type === 'reset') return { kind: 'idle', generation: state.generation + 1 };
  if (action.type === 'check') {
    return { kind: 'checking', generation: state.generation + 1 };
  }
  if (!sameGeneration(state, action)) return state;

  switch (action.type) {
    case 'not-verified':
      return state.kind === 'checking' ? { kind: 'ready', generation: state.generation } : state;
    case 'start':
      return state.kind === 'ready' ? { kind: 'starting', generation: state.generation } : state;
    case 'resume':
      return state.kind === 'checking'
        ? { kind: 'pending', generation: state.generation, idvId: action.idvId, expiresAt: action.expiresAt }
        : state;
    case 'pending':
      return state.kind === 'starting'
        ? { kind: 'pending', generation: state.generation, idvId: action.idvId, expiresAt: action.expiresAt, notificationStatus: action.notificationStatus }
        : state;
    case 'refresh-pending':
      return state.kind === 'pending'
        ? { ...state, idvId: action.idvId, expiresAt: action.expiresAt, notificationStatus: action.notificationStatus }
        : state;
    case 'complete':
      // Only an AUTHENTICATED result completes. Complete is what reveals the
      // access code, so an unauthenticated one must never reach it: from a
      // lookup (an old, failed verification on the contact) the renter can
      // simply verify now; from a live session it is a failure.
      if (!action.result.authenticated) {
        if (state.kind === 'checking') return { kind: 'ready', generation: state.generation };
        if (state.kind === 'pending') return { kind: 'failed', generation: state.generation, reason: 'not-authenticated' };
        return state;
      }
      return state.kind === 'checking' || state.kind === 'pending'
        ? { kind: 'complete', generation: state.generation, result: action.result }
        : state;
    case 'failed':
      return state.kind === 'pending'
        ? { kind: 'failed', generation: state.generation, reason: action.reason }
        : state;
    case 'expired':
      return state.kind === 'pending' ? { kind: 'expired', generation: state.generation } : state;
    case 'error':
      return state.kind === 'checking' || state.kind === 'starting' || state.kind === 'pending'
        ? { kind: 'error', generation: state.generation, retryable: action.retryable }
        : state;
    case 'resend':
      return state.kind === 'pending' ? { ...state, generation: state.generation + 1 } : state;
    case 'retry':
      return state.kind === 'failed' || state.kind === 'expired' || state.kind === 'error'
        ? { kind: 'ready', generation: state.generation }
        : state;
  }
}
