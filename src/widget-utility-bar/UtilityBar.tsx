import React, { useEffect, useState } from 'react';
import './UtilityBar.css';
import { InfoIcon, CloseIcon } from './icons';

// ---------------------------------------------------------------------------
// Utility Bar — a dismissible announcement bar.
//
// Dismissal: clicking × writes a flag to localStorage that hides the bar for
// `dismissDurationHours` (default 24h). On load the bar stays hidden until the
// flag expires, then reappears automatically.
//
// Editor aid: when `inEditor` is true a small floating debug panel shows the
// current state + live countdown and offers a "Delete Flag" button so an editor
// can clear the dismissal and make the bar pop back up.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tenantinc_utility_bar_dismissed';

interface DismissFlag {
  dismissed: boolean;
  expires: number;
}

function getFlag(): DismissFlag | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissFlag;
    if (!parsed?.expires) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isFlagActive(): boolean {
  const flag = getFlag();
  if (!flag) return false;
  if (Date.now() >= flag.expires) {
    clearFlag();
    return false;
  }
  return true;
}

function persistDismiss(durationHours: number): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dismissed: true, expires: Date.now() + durationHours * 60 * 60 * 1000 }),
    );
  } catch {
    /* sandboxed iframe / storage disabled — fail soft */
  }
}

function clearFlag(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* fail soft */
  }
}

function msToHMS(ms: number): string {
  if (ms <= 0) return '0s';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export interface UtilityBarProps {
  message?: string;
  showInfo?: boolean;
  infoMessage?: string;
  infoStyle?: 'tooltip' | 'modal';
  showClose?: boolean;
  sticky?: boolean;
  dismissDurationHours?: number;
  inEditor?: boolean;
}

export function UtilityBar({
  message = '$30 Admin fee applied to all transactions',
  showInfo = true,
  infoMessage = 'This fee covers administrative processing and is applied once per transaction.',
  infoStyle = 'tooltip',
  showClose = true,
  sticky = false,
  dismissDurationHours = 24,
  inEditor = false,
}: UtilityBarProps) {
  // Read the flag synchronously on first render so the bar never flashes.
  const [flagActive, setFlagActive] = useState<boolean>(() => isFlagActive());
  const [, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // While dismissed, tick every second to drive the countdown and to auto-show
  // the bar the moment the flag expires (even with the page left open).
  useEffect(() => {
    if (!flagActive) return;
    const id = window.setInterval(() => {
      if (!isFlagActive()) setFlagActive(false);
      else setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [flagActive]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  function handleClose() {
    persistDismiss(dismissDurationHours);
    setFlagActive(true);
  }

  function handleDeleteFlag() {
    clearFlag();
    setFlagActive(false);
  }

  const showBar = !flagActive;
  const showDebug = inEditor;
  if (!showBar && !showDebug) return null;

  const flag = getFlag();
  const remaining = flag ? flag.expires - Date.now() : 0;

  const info =
    showInfo &&
    (infoStyle === 'tooltip' ? (
      <span className="ub-info ub-info--tooltip" tabIndex={0} role="button" aria-label="More information">
        <InfoIcon size={22} />
        <span className="ub-tooltip" role="tooltip">{infoMessage}</span>
      </span>
    ) : (
      <button className="ub-info" onClick={() => setModalOpen(true)} aria-label="More information">
        <InfoIcon size={22} />
      </button>
    ));

  return (
    <div className="ub-wrapper">
      {showBar && (
        <div className={`ub-bar ${sticky ? 'ub-bar--sticky' : 'ub-bar--block'}`}>
          <div className="ub-inner">
            <div className="ub-spacer" />
            <div className="ub-message-wrap">
              <span className="ub-message">{message}</span>
              {info}
            </div>
            <div className="ub-close-wrap">
              {showClose && (
                <button className="ub-close" onClick={handleClose} aria-label="Close">
                  <CloseIcon size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showInfo && infoStyle === 'modal' && modalOpen && (
        <div
          className="ub-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="ub-modal" role="dialog" aria-modal="true">
            <button className="ub-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
              <CloseIcon size={18} />
            </button>
            <div className="ub-modal-body">{infoMessage}</div>
          </div>
        </div>
      )}

      {showDebug && (
        <div className="ub-debug">
          <span className="ub-debug-label">Debug</span>
          <div className="ub-debug-row">
            <span className="ub-debug-key">State:</span>
            <span className={`ub-debug-badge ${flagActive ? 'ub-debug-badge--hidden' : 'ub-debug-badge--shown'}`}>
              {flagActive ? 'Hidden' : 'Shown'}
            </span>
          </div>
          {flagActive && (
            <div className="ub-debug-row">
              <span className="ub-debug-key">Expires in:</span>
              <span className="ub-debug-countdown">{msToHMS(remaining)}</span>
            </div>
          )}
          <button className="ub-debug-btn" onClick={handleDeleteFlag}>🗑 Delete Flag</button>
        </div>
      )}
    </div>
  );
}
