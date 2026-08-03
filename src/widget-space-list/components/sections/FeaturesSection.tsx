import React from 'react';
import { AMENITY_IMAGES } from '@shared/demoImages';

// Features & Amenities — grid of orange-tinted photo tiles (Figma 6411-130529).
interface Amenity { label: string; img: string; }

// Demo fallback shown until the property API's Amenities arrive.
const DEMO_AMENITIES: Amenity[] = [
  { label: 'Drive Up Access',   img: AMENITY_IMAGES.driveup },
  { label: 'Video Surveillance', img: AMENITY_IMAGES.video },
  { label: 'Elevator Access',   img: AMENITY_IMAGES.elevator },
  { label: 'Electronic Lock',   img: AMENITY_IMAGES.lock },
];

export function FeaturesSection({ amenities }: { amenities?: { name: string; label: string; image: string }[] }) {
  // Live amenities (name + photo URL) from the property API; demo until loaded.
  const tiles: Amenity[] = amenities && amenities.length
    ? amenities.map((a) => ({ label: a.label, img: a.image }))
    : DEMO_AMENITIES;

  return (
    <section className="sl-section sl-section--features">
      <div className="sl-feat-grid">
        {tiles.map((a, i) => (
          <div className="sl-feat-tile" key={`${a.label}-${i}`} style={{ backgroundImage: `url(${a.img})` }}>
            <span className="sl-feat-tile-scrim" aria-hidden="true" />
            <span className="sl-feat-tile-label">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
