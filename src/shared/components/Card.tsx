import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
