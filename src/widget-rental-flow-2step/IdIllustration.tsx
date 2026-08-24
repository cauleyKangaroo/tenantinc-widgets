// ==========================================================================
// The hand-holding-phone-and-ID line drawing. Its own module because two
// places draw it: the ID Verification card on step 3 (SuccessStep) and the
// "Verify ID Now" modal (IdVerifyModal), which is the same artwork at a
// different size. Layout lives in screens.css under .rf-sx-illus.
// ==========================================================================

import idHandCard from './assets/id-g72.svg';
import idCardFace from './assets/id-g105.svg';
import idPhoneA from './assets/id-g28.svg';
import idPhoneB from './assets/id-g27.svg';
import idScreen from './assets/id-rect.svg';
import idThumbA from './assets/id-p19.svg';
import idThumbB from './assets/id-p18.svg';
import idPortrait from './assets/id-portrait.png';

/**
 * The hand-holding-phone-and-ID line drawing from the ID Verification card.
 *
 * The exported layers, positioned at the coordinates Figma 10078-25475 gives
 * them. Every layer is a percentage of the 292.25 × 119.43 artboard those
 * coordinates live in, so the whole thing scales with the card.
 *
 * The licence photo IS included now. Figma exports it at 920×589 (1 MB) for
 * something that renders ~60×38, and webpack inlines images as base64
 * (`asset/inline`), so the export is resampled to 180×115 — 3× the display size,
 * enough for retina — which costs ~57 KB instead of ~1.35 MB inlined.
 */
export function IdIllustration({ className }: { className?: string }) {
  return (
    <div className={className ? `rf-sx-illus ${className}` : 'rf-sx-illus'} aria-hidden="true">
      {/* Painter's order, exactly as the frame stacks them. Right hand and its
          ID card first: hand, white card, licence photo, keyline, fingers. */}
      <img className="rf-sx-illus-l rf-sx-illus-handcard" src={idHandCard} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-cardbg" />
      <img className="rf-sx-illus-l rf-sx-illus-portrait" src={idPortrait} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-cardline" />
      <img className="rf-sx-illus-l rf-sx-illus-cardface" src={idCardFace} alt="" />

      {/* Then the left hand and its phone. */}
      <img className="rf-sx-illus-l rf-sx-illus-phoneA" src={idPhoneA} alt="" />
      <span className="rf-sx-illus-l rf-sx-illus-glint" />
      <img className="rf-sx-illus-l rf-sx-illus-phoneB" src={idPhoneB} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-screen" src={idScreen} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-thumbA" src={idThumbA} alt="" />
      <img className="rf-sx-illus-l rf-sx-illus-thumbB" src={idThumbB} alt="" />
    </div>
  );
}
