// ---------------------------------------------------------------------------
// A gallery slide that is a video rather than a photo.
//
// POSTER FIRST, IFRAME ONLY ON CLICK. A gallery can carry several slides and
// they are all mounted at once (the track is one strip that translates), so an
// iframe per video would load a full player for every one of them on page load
// — several hundred KB and a third-party connection each, for a slide nobody
// has looked at yet.
//
// The URL is used AS STORED. The collection currently holds a malformed value
// (Duda concatenated its embed prefix with the page URL) and is being corrected
// at source; rewriting it here would keep working afterwards and hide that it
// was ever wrong. Only the POSTER is derived, and it degrades on its own.
// ---------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';

/**
 * The YouTube id inside a URL, or ''.
 *
 * Used for the POSTER ONLY — never to rebuild the embed src. Ids are exactly 11
 * characters of [A-Za-z0-9_-], so the LAST such segment is taken: that finds it
 * in a clean `/embed/{id}`, in `watch?v={id}`, in a `youtu.be/{id}`, and at the
 * tail of the malformed value currently in the collection. Anything else
 * returns '' and the slide falls back to a plain play button.
 */
export function youtubeId(url: string): string {
  if (!/youtu\.?be/i.test(url)) return '';
  const matches = url.match(/[A-Za-z0-9_-]{11}/g);
  return matches?.length ? matches[matches.length - 1] : '';
}

/**
 * Poster frame for a video URL, or '' when none can be derived.
 *
 * `hqdefault` rather than `maxresdefault`: the latter 404s on videos that were
 * never uploaded at that resolution — including the one in the collection today
 * — and a broken poster is worse than a lower-resolution one.
 */
export function videoPoster(url: string): string {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

/** `autoplay=1` added to whatever the stored URL already carries. */
function withAutoplay(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}autoplay=1`;
}

export function VideoSlide({
  src, className, active, title,
}: {
  src: string;
  className?: string;
  /**
   * This slide is the one on screen. Navigating away UNMOUNTS the iframe —
   * otherwise a video keeps playing, and keeps making noise, from a slide the
   * viewer has scrolled past.
   */
  active: boolean;
  title?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const poster = videoPoster(src);

  useEffect(() => { if (!active) setPlaying(false); }, [active]);

  if (playing) {
    return (
      <iframe
        className={className}
        src={withAutoplay(src)}
        title={title ?? 'Property video'}
        /* `allow` is what lets autoplay actually start once the viewer has
           clicked; fullscreen is the player's own control. */
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      className={`pi-video-poster${className ? ` ${className}` : ''}`}
      /* The gallery opens the lightbox on click, so this must not bubble —
         otherwise pressing play would open the lightbox instead. */
      onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
      aria-label={title ? `Play ${title}` : 'Play property video'}
      style={poster ? { backgroundImage: `url(${poster})` } : undefined}
    >
      {/* Drawn, not an asset: the bundle cannot load remote images, and this is
          two shapes. Inherits currentColor so the CSS owns the colour. */}
      <span className="pi-video-play" aria-hidden="true">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="35" fill="rgba(16,19,24,0.72)" stroke="#fff" strokeWidth="2" />
          <path d="M29 24.5 L50 36 L29 47.5 Z" fill="#fff" />
        </svg>
      </span>
    </button>
  );
}
