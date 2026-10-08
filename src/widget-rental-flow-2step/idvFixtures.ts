import type { IdvState, SafeIdvResult } from './idvState';

const completeResult: SafeIdvResult = {
  idvId: 'idv094ad9c17e774f76b39fa5968fbd7435',
  authenticated: true,
  driversLicense: { number: '****4567', state: 'CA', expiration: '2030-01-15' },
};

/** Harness-safe lifecycle fixtures. None performs a paid capture. */
export const IDV_STATE_FIXTURES: Readonly<Record<string, IdvState>> = {
  idle: { kind: 'idle', generation: 0 },
  checking: { kind: 'checking', generation: 1 },
  notVerified: { kind: 'ready', generation: 1 },
  starting: { kind: 'starting', generation: 1 },
  pending: { kind: 'pending', generation: 1, idvId: completeResult.idvId, expiresAt: 1_900_000_000 },
  complete: { kind: 'complete', generation: 1, result: completeResult },
  failed: { kind: 'failed', generation: 1, reason: 'FINALIZE_FAILED' },
  expired: { kind: 'expired', generation: 1 },
  retryableError: { kind: 'error', generation: 1, retryable: true },
  terminalError: { kind: 'error', generation: 1, retryable: false },
};

export const IDV_API_FIXTURES = {
  lookupEmpty: { status: 200, data: {} },
  lookupComplete: { status: 200, data: { idv_id: completeResult.idvId, verified: true } },
  startSmsSent: { status: 200, data: {
    idvId: completeResult.idvId, verificationUrl: 'https://verify.example/session',
    notificationStatus: 'sent', expiresAt: 1_900_000_000,
  } },
  startSmsFailed: { status: 200, data: {
    idvId: completeResult.idvId, verificationUrl: 'https://verify.example/session',
    notificationStatus: 'failed', expiresAt: 1_900_000_000,
  } },
  pendingWithoutId: { status: 200, data: { status: 'pending' } },
  complete: { status: 200, data: { status: 'complete', ...completeResult } },
  failedHttp200: { status: 200, data: { status: 'failed', reason: 'FINALIZE_FAILED' } },
} as const;
