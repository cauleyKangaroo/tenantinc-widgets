import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseCircleIcon } from '@shared/ui/icons';
import './VideoModal.css';

// ===========================================================================
// A size guide video, in a popup.
//
// Tapping a size card's thumbnail opens this over the page with Wistia's own
// player inside: https://fast.wistia.net/embed/iframe/<videoId> (the embed
// format the size guide hand-off names). The video does NOT autoplay — the
// player shows its own play button and plays when that is pressed.
//
// Closing — the × button, Escape, or a click on the backdrop — UNMOUNTS the
// iframe, which is what stops the video; hiding it would leave the sound
// running behind the page.
//
// Portaled to <body>, so a widget's overflow or stacking context cannot clip
// it, and its styles are its own (VideoModal.css) for the same reason.
// ===========================================================================

/** Wistia hashed ids are short alphanumeric tokens; anything else is not one. */
const WISTIA_ID = /^[a-z0-9]{6,20}$/i;

export function isPlayableVideoId(id: string | undefined): id is string {
  return !!id && WISTIA_ID.test(id.trim());
}

export function VideoModal({
  videoId, title, onClose,
}: {
  /** The Wistia id to play; null/undefined renders nothing. */
  videoId: string | null | undefined;
  /** Names the dialog for screen readers, e.g. "5’ x 10’". */
  title?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = isPlayableVideoId(videoId ?? undefined);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the close button so the keyboard lands inside the dialog.
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;
  const id = (videoId as string).trim();
  const label = title ? `${title} size guide video` : 'Size guide video';

  return createPortal(
    <div className="hb-video-overlay" onMouseDown={onClose}>
      <div
        className="hb-video-modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="hb-video-close" aria-label="Close video" onClick={onClose}>
          <CloseCircleIcon size={32} />
        </button>
        <div className="hb-video-frame">
          <iframe
            src={`https://fast.wistia.net/embed/iframe/${encodeURIComponent(id)}?videoFoam=true`}
            title={label}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        {title && <p className="hb-video-title">{title}</p>}
      </div>
    </div>,
    document.body,
  );
}
