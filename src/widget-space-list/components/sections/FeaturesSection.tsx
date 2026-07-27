import React from 'react';
import { AMENITY_IMAGES } from '@shared/demoImages';

// Features & Amenities — grid of orange-tinted photo tiles (Figma 6411-130529).
// Demo data; real amenities come from the property API later.
interface Amenity { label: string; img: string; }
const AMENITIES: Amenity[] = [
  { label: 'Drive Up Access',   img: AMENITY_IMAGES.driveup },
  { label: 'Video Surveillance', img: AMENITY_IMAGES.video },
  { label: 'Elevator Access',   img: AMENITY_IMAGES.elevator },
  { label: 'Electronic Lock',   img: AMENITY_IMAGES.lock },
];

export function FeaturesSection() {
  return (
    <section className="sl-section sl-section--features">
      <div className="sl-feat-grid">
        {AMENITIES.map((a) => (
          <div className="sl-feat-tile" key={a.label} style={{ backgroundImage: `url(${a.img})` }}>
            <span className="sl-feat-tile-scrim" aria-hidden="true" />
            <span className="sl-feat-tile-label">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
