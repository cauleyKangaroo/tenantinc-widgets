import React from 'react';
import { ReviewsSection } from './sections/ReviewsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { NearbySection } from './sections/NearbySection';
import { SizeGuideSection } from './sections/SizeGuideSection';
import { BlogSection } from './sections/BlogSection';
import { StoreSection } from './sections/StoreSection';
import { NotesSection } from './sections/NotesSection';
import { FaqsSection } from './sections/FaqsSection';
import { HoursSection } from './sections/HoursSection';

interface APSectionsProps {
  isReviews?:   boolean;
  isFeatures?:  boolean;
  isNearby?:    boolean;
  isSizeGuide?: boolean;
  isBlog?:      boolean;
  isStore?:     boolean;
  isNotes?:     boolean;
  isFAQ?:       boolean;
  isHours?:     boolean;
}

export function APSections({
  isReviews   = true,
  isFeatures  = true,
  isNearby    = true,
  isSizeGuide = true,
  isBlog      = true,
  isStore     = true,
  isNotes     = true,
  isFAQ       = true,
  isHours     = true,
}: APSectionsProps) {
  return (
    <div className="suf-ap-sections">
      {isReviews   && <ReviewsSection />}
      {isFeatures  && <FeaturesSection />}
      {isNearby    && <NearbySection />}
      {isSizeGuide && <SizeGuideSection />}
      {isBlog      && <BlogSection />}
      {isStore     && <StoreSection />}
      {isNotes     && <NotesSection />}
      {isFAQ       && <FaqsSection />}
      {isHours     && <HoursSection />}
    </div>
  );
}
