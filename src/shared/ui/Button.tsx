// ===========================================================================
// <Button /> — Figma "CTA / Secondary / Black & White" (node 9215-57188).
//
// The designer's note defines the three tones by ROLE, not by colour, and that
// is the distinction to hold on to when picking one:
//
//   cta        the primary action on a page or widget — "Select", "Rent Now".
//              One per view; two CTAs means neither is the CTA.
//   secondary  the alternate action beside it — "View Details", "Compare".
//   dark       utility functions — "Pay Now", "Print". Not a sales action.
//
// Renders a <button> by default, or an <a> when given `href`, so a link that
// looks like a button is still a link (middle-click, open in new tab, and the
// right role for a screen reader).
// ===========================================================================

import React from 'react';
import './Button.css';

export type ButtonTone = 'cta' | 'secondary' | 'dark' | 'light';
/** 'solid' fills with the tone; 'outline' is a 2px bordered white box. */
export type ButtonFill = 'solid' | 'outline';
export type ButtonShape = 'square' | 'pill';

interface CommonProps {
  children: React.ReactNode;
  /** Role, not colour. See the note above. Default 'cta'. */
  tone?: ButtonTone;
  /** Default 'solid'. */
  fill?: ButtonFill;
  /** 4px corners ('square', default) or fully rounded ('pill'). */
  shape?: ButtonShape;
  /** Black label on a filled brand colour — Figma's "(Black Text)" option. */
  darkText?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  /** Shows a spinner and blocks further clicks — use while a request is in flight. */
  busy?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional leading icon, e.g. one of the 24px icons from `./icons`. */
  icon?: React.ReactNode;
}

export type ButtonProps = CommonProps &
  (
    | ({ href: string; onClick?: React.MouseEventHandler } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>)
    | ({ href?: undefined; type?: 'button' | 'submit' | 'reset' } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'type'>)
  );

export function Button(props: ButtonProps) {
  const {
    children, tone = 'cta', fill = 'solid', shape = 'square',
    darkText = false, block = false, busy = false, disabled = false,
    className, icon, ...rest
  } = props;

  const classes = [
    'hb-btn',
    `hb-btn--${tone}`,
    fill === 'outline' ? 'hb-btn--outline' : '',
    shape === 'pill' ? 'hb-btn--pill' : '',
    darkText ? 'hb-btn--text-dark' : '',
    block ? 'hb-btn--block' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {busy && <span className="hb-btn__spinner" aria-hidden="true" />}
      {!busy && icon}
      <span>{children}</span>
    </>
  );

  // `href` present → render a real link. An <a> has no disabled attribute, so a
  // disabled link drops its href (making it unfocusable) and says so via ARIA.
  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;
    const inert = disabled || busy;
    return (
      <a
        {...anchorRest}
        className={classes}
        href={inert ? undefined : href}
        aria-disabled={inert || undefined}
        aria-busy={busy || undefined}
      >
        {content}
      </a>
    );
  }

  const { type = 'button', ...buttonRest } = rest as { type?: 'button' | 'submit' | 'reset' } & React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonRest}
      className={classes}
      // Defaults to "button": an unmarked <button> inside a <form> submits it,
      // which has caught people out before.
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {content}
    </button>
  );
}
