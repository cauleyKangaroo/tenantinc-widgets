import React from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import type { HeroProps } from '@shared/types';

export function Hero({ title, subtitle, layout = 'default', ctaLabel, ctaHref }: HeroProps) {
  const inner = (
    <>
      <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: '0 0 16px', fontSize: '16px', color: '#6b7280' }}>{subtitle}</p>
      )}
      {ctaLabel && <Button label={ctaLabel} href={ctaHref} />}
    </>
  );

  if (layout === 'centered') {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>{inner}</div>
      </Card>
    );
  }

  if (layout === 'split') {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>{inner}</div>
          <div
            style={{
              width: '120px',
              height: '80px',
              background: '#f3f4f6',
              borderRadius: '6px',
              marginLeft: '24px',
              flexShrink: 0,
            }}
          />
        </div>
      </Card>
    );
  }

  // layout === 'default'
  return <Card>{inner}</Card>;
}
