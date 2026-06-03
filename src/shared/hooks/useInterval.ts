import { useEffect, useRef } from 'react';

/**
 * Runs `callback` on a fixed `delay` (ms) interval.
 * Pass `null` as delay to pause. Callback ref is kept stable so callers
 * don't need to memoize it.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
