import { useEffect, useRef, useState } from 'react';
import { ChevronDown, EsFlagIcon, UsFlagIcon } from './icons';
import { currentLang, hrefForLang, type Lang } from './language';

// ===========================================================================
// The language selector — English and Spanish, each with its flag.
//
// It was a button with a chevron and no menu behind it. Now it opens two links,
// each pointing at the SAME page in the other language (see ./language.ts for
// the path rules).
//
// Plain <a> links, not a click handler that assigns to location: the visitor
// gets the destination in the status bar, middle-click and "open in new tab"
// work, and a crawler can follow them — which is rather the point of having
// translated pages at all.
// ===========================================================================

interface Option {
  lang: Lang;
  label: string;
  flag: (props: { width?: number; height?: number }) => React.ReactElement;
  /** What a screen reader hears, since "EN" alone does not say "English". */
  title: string;
}

const OPTIONS: Option[] = [
  { lang: 'en', label: 'EN', flag: UsFlagIcon, title: 'English' },
  { lang: 'es', label: 'ES', flag: EsFlagIcon, title: 'Español' },
];

export function LanguageMenu({
  /** Compact form for the single-bar layout: flag and chevron, no label. */
  compact = false,
  /** The top bar's English label, from the content panel. Spanish is always
   *  "ES" — it is not the editor's to rename, since it names a fixed path. */
  enLabel = 'EN',
}: {
  compact?: boolean;
  enLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Which language THIS page is in, read once on mount rather than every
     render: the bar does not navigate in place, so the answer cannot change
     while it is on screen, and reading window.location during render would be
     a side effect in the render path. */
  const [active, setActive] = useState<Lang>('en');
  useEffect(() => { setActive(currentLang()); }, []);

  /* Close on an outside click or Escape — the two ways anyone expects to
     dismiss a menu. Bound only while open, so a closed bar adds no listeners
     to a page that may carry several widgets. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.lang === active) ?? OPTIONS[0];
  const CurrentFlag = current.flag;
  const label = current.lang === 'en' ? enLabel : current.label;

  return (
    <div className="nav-lang-wrap" ref={wrapRef}>
      <button
        type="button"
        className={compact ? 'nav-icon-btn nav-lang' : 'nav-top-item nav-lang'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `Language: ${current.title}` : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {compact ? <CurrentFlag width={26} height={18} /> : <CurrentFlag />}
        {!compact && <span>{label}</span>}
        <ChevronDown size={compact ? 20 : 24} className="nav-link-chevron" />
      </button>

      {open && (
        <div className="nav-lang-menu" role="menu">
          {OPTIONS.map((o) => {
            const Flag = o.flag;
            return (
              <a
                key={o.lang}
                role="menuitem"
                className={`nav-lang-opt${o.lang === active ? ' nav-lang-opt--on' : ''}`}
                href={hrefForLang(o.lang)}
                /* The page it leads to is in that language, so say so — a
                   screen reader announcing the link otherwise reads it in the
                   voice of the current page. */
                lang={o.lang}
                hrefLang={o.lang}
                aria-current={o.lang === active ? 'true' : undefined}
              >
                <Flag />
                <span>{o.lang === 'en' ? enLabel : o.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
