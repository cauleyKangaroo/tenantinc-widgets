import { useEffect, useState } from 'react';

/** Querying permission never requests coordinates or opens a permission prompt. */
export function useLocationPermission() {
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let status: PermissionStatus | undefined;
    const onChange = () => {
      if (!disposed && status) setDenied(status.state === 'denied');
    };
    const refresh = async () => {
      if (!navigator.permissions?.query) return;
      const current = ++generation;
      try {
        const next = await navigator.permissions.query({ name: 'geolocation' });
        if (disposed || current !== generation) return;
        status?.removeEventListener('change', onChange);
        status = next;
        onChange();
        status.addEventListener('change', onChange);
      } catch {
        // Some browsers cannot query geolocation permission. A denied position
        // callback still hides the option for the lifetime of this widget.
      }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      status?.removeEventListener('change', onChange);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return [denied, setDenied] as const;
}
