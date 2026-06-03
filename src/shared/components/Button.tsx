import React from 'react';

interface ButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, href, onClick, variant = 'primary' }: ButtonProps) {
  const style: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 20px',
    borderRadius: '6px',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    border: 'none',
    background: variant === 'primary' ? '#2563eb' : '#f3f4f6',
    color: variant === 'primary' ? '#fff' : '#111827',
  };

  if (href) {
    return (
      <a href={href} style={style}>
        {label}
      </a>
    );
  }

  return (
    <button style={style} onClick={onClick}>
      {label}
    </button>
  );
}
