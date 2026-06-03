import React, { useState } from 'react';
import { Card } from '@shared/components/Card';
import { useInterval } from '@shared/hooks/useInterval';
import type { ClockProps } from '@shared/types';

function formatTime(date: Date, timezone?: string): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date: Date, timezone?: string): string {
  return date.toLocaleDateString('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function Clock({ timezone, layout = 'default' }: ClockProps) {
  const [now, setNow] = useState(() => new Date());

  useInterval(() => setNow(new Date()), 1000);

  if (layout === 'minimal') {
    return (
      <Card>
        <span style={{ fontFamily: 'monospace', fontSize: '32px', color: '#111827' }}>
          {formatTime(now, timezone)}
        </span>
      </Card>
    );
  }

  // layout === 'default'
  return (
    <Card>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#9ca3af', fontFamily: 'sans-serif' }}>
        {timezone ?? 'Local time'}
      </p>
      <p style={{ margin: '0 0 4px', fontFamily: 'monospace', fontSize: '36px', color: '#111827' }}>
        {formatTime(now, timezone)}
      </p>
      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', fontFamily: 'sans-serif' }}>
        {formatDate(now, timezone)}
      </p>
    </Card>
  );
}
