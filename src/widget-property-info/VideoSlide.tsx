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

/**
 * Player parameters added to whatever the stored URL already carries.
 *
 * `muted` is NOT a style choice — it is the only way autoplay happens at all.
 * Chrome, Safari and Firefox all block autoplay WITH SOUND until the viewer
 * has interacted with the page, and a site cannot opt out. An unmuted
 * `autoplay=1` is simply ignored, leaving a player sitting there not playing,
 * which reads as more broken than the poster it replaced. A CLICK is that
 * interaction, so a manually started video keeps its sound.
 *
 * `playsinline=1` keeps iOS from tearing the video out into its own fullscreen
 * player over the page.
 */
function playerUrl(url: string, muted: boolean): string {
  const params = `autoplay=1&playsinline=1${muted ? '&mute=1' : ''}`;
  return `${url}${url.includes('?') ? '&' : '?'}${params}`;
}

export function VideoSlide({
  src, className, active, title, autoPlay = false,
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
  /**
   * Start playing, MUTED, as soon as this slide is the active one.
   *
   * The trade is real and deliberate: the player is mounted on page load
   * rather than on a click, so a third-party script and a few hundred KB load
   * for every visitor whether or not they look at the gallery. Worth it where
   * the video leads the slider — silent motion is the first thing seen — and
   * not worth it in the lightbox, which nobody reaches by accident.
   */
  autoPlay?: boolean;
}) {
  const [clicked, setClicked] = useState(false);
  const poster = videoPoster(src);
  /* Autoplay only while this slide is on screen, so stepping away and back
     restarts it rather than leaving a player running out of sight. */
  const playing = clicked || (autoPlay && active);

  useEffect(() => { if (!active) setClicked(false); }, [active]);

  if (playing) {
    return (
      <iframe
        className={className}
        // Muted ONLY when it started itself — see playerUrl.
        src={playerUrl(src, !clicked)}
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
      onClick={(e) => { e.stopPropagation(); setClicked(true); }}
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
