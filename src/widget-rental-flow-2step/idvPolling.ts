export type PollDecision<T> =
  | { kind: 'continue' }
  | { kind: 'complete'; value: T }
  | { kind: 'failed'; reason?: string };

export interface PollSchedulerOptions<T> {
  poll(signal: AbortSignal): Promise<PollDecision<T>>;
  expiresAt: number;
  onComplete(value: T): void;
  onFailed(reason?: string): void;
  onExpired(): void;
  onError(error: unknown): void;
  now?: () => number;
  visibleDelayMs?: () => number;
  hiddenDelayMs?: number;
  maxErrorDelayMs?: number;
  isVisible?: () => boolean;
  onVisibilityChange?: (handler: () => void) => () => void;
  /** Injectable only to make scheduler races deterministic in unit tests. */
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

/**
 * One request at a time. A new timeout is scheduled only after the previous
 * request settles, so slow upstream calls can never overlap.
 */
export function startIdvPolling<T>(options: PollSchedulerOptions<T>): () => void {
  const controller = new AbortController();
  const now = options.now ?? Date.now;
  const visibleDelay = options.visibleDelayMs ?? (() => 3_000 + Math.floor(Math.random() * 2_001));
  const hiddenDelay = options.hiddenDelayMs ?? 15_000;
  const maxErrorDelay = options.maxErrorDelayMs ?? 30_000;
  const isVisible = options.isVisible ?? (() => typeof document === 'undefined' || !document.hidden);
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribeVisibility = () => {};
  let consecutiveErrors = 0;
  let inFlight = false;

  const stop = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    unsubscribeVisibility();
    if (timer !== undefined) clearTimer(timer);
    if (expiryTimer !== undefined) clearTimer(expiryTimer);
  };
  const expire = () => {
    if (controller.signal.aborted) return;
    stop();
    options.onExpired();
  };
  const armExpiry = () => {
    const remaining = options.expiresAt * 1_000 - now();
    if (remaining <= 0) { expire(); return; }
    expiryTimer = setTimer(armExpiry, Math.min(remaining, 2_147_483_647));
  };

  const schedule = (delay: number) => {
    if (!controller.signal.aborted) timer = setTimer(run, delay);
  };

  const run = async () => {
    if (controller.signal.aborted) return;
    if (now() >= options.expiresAt * 1_000) {
      expire();
      return;
    }
    inFlight = true;
    try {
      const result = await options.poll(controller.signal);
      if (controller.signal.aborted) return;
      if (now() >= options.expiresAt * 1_000) { expire(); return; }
      consecutiveErrors = 0;
      if (result.kind === 'complete') { stop(); return options.onComplete(result.value); }
      if (result.kind === 'failed') { stop(); return options.onFailed(result.reason); }
      schedule(isVisible() ? visibleDelay() : hiddenDelay);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (now() >= options.expiresAt * 1_000) { expire(); return; }
      options.onError(error);
      consecutiveErrors += 1;
      schedule(Math.min(maxErrorDelay, 3_000 * (2 ** (consecutiveErrors - 1))));
    } finally {
      inFlight = false;
    }
  };

  const defaultVisibilitySubscription = (handler: () => void) => {
    if (typeof document === 'undefined') return () => undefined;
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  };
  unsubscribeVisibility = (options.onVisibilityChange ?? defaultVisibilitySubscription)(() => {
    if (controller.signal.aborted || !isVisible() || inFlight) return;
    if (timer) clearTimer(timer);
    // Returning from a hidden tab should not wait out the hidden 15-second
    // interval. Poll promptly while retaining the one-request-at-a-time rule.
    schedule(0);
  });

  armExpiry();
  void run();
  return stop;
}
