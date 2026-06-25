import React, { useState } from 'react';

interface Faq {
  id: number;
  question: string;
  answer: string;
  link?: string;
}

const FAQS: Faq[] = [
  { id: 1,  question: 'How does self storage work?',                        answer: 'Self storage is a service that allows individuals and businesses to rent storage space on a short or long-term basis. You choose the unit size you need, sign a rental agreement, and gain access to your unit to store your belongings at your convenience.' },
  { id: 2,  question: 'Are storage units climate controlled?',              answer: 'Many of our facilities offer climate-controlled units that maintain a consistent temperature and humidity level year-round. These units are ideal for storing sensitive items such as electronics, artwork, antiques, wine, and important documents.' },
  { id: 3,  question: 'Can you live or sleep in a storage unit?',           answer: 'No — it is illegal to live or sleep in a storage unit. Storage units are zoned for storage only and lack the utilities, ventilation, and safety standards required for human habitation. Violations can result in eviction and legal consequences.',       link: 'Learn more about storage unit rules' },
  { id: 4,  question: 'What can I store in a storage unit?',                answer: 'You can store almost anything including furniture, appliances, clothing, seasonal items, sporting equipment, and business inventory. Prohibited items include hazardous materials, flammable substances, perishable food, and living things.' },
  { id: 5,  question: 'What can a storage unit be used for?',               answer: 'Storage units can be used for home decluttering, moving and relocation, home renovation, business inventory storage, vehicle storage, college student storage, and military deployment storage.' },
  { id: 6,  question: 'How to rent a storage unit?',                        answer: 'Renting is simple. Browse available unit sizes and prices online, select the unit that fits your needs, complete the rental agreement, and make your first payment. Many facilities offer contactless move-in so you can get started right away.' },
  { id: 7,  question: 'How do I choose a storage facility?',                answer: 'Consider location and accessibility, security features, unit sizes and types, pricing and promotions, customer reviews, and whether climate control is available for your specific storage needs.' },
  { id: 8,  question: 'Does this facility offer a military discount?',      answer: 'Yes, we are proud to offer a military discount to active duty service members and veterans. Please present a valid military ID at the time of rental to receive your discount. Contact our facility for current rates and terms.' },
  { id: 9,  question: 'Does this facility offer one month free storage?',   answer: 'We periodically offer promotional deals including one month free storage for new customers. Check our current promotions page or contact us directly to find out about the latest offers available at your chosen facility.' },
  { id: 10, question: 'How can I find the best deal on a storage unit?',    answer: 'Compare prices across facilities in your area, look for first-month promotions, consider a smaller unit, and ask about long-term rental discounts. Booking online often unlocks lower rates than walk-in pricing.' },
  { id: 11, question: 'Do you offer self storage sales and promotions?',    answer: 'Yes, we regularly run sales and promotions for new and existing customers, including discounted first months, referral bonuses, and seasonal promotions. Sign up for our newsletter or check our website to stay up to date.' },
  { id: 12, question: 'Do storage units have holiday sales?',               answer: 'Yes, many storage facilities run holiday promotions around major holidays. These may include reduced move-in fees, waived admin fees, or discounted monthly rates. Check our promotions page for the latest seasonal deals.' },
  { id: 13, question: 'Where can I get the best deal on storage units?',    answer: 'The best deals are often found by booking online directly through the facility website, comparing multiple locations, and taking advantage of first-month promotions. Prices vary by unit size, location, and time of year.' },
];

// ── FAQ item ──────────────────────────────────────────────────────────────────

function FaqItem({ faq, isLast }: { faq: Faq; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`sl-faq2-item${isLast ? ' sl-faq2-item--last' : ''}`}>
      <button className="sl-faq2-row" onClick={() => setOpen((o) => !o)}>
        <span className="sl-faq2-question">{faq.question}</span>
        <svg
          className={`sl-faq2-chevron${open ? ' open' : ''}`}
          width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="sl-faq2-answer">
          <p className="sl-faq2-answer-text">{faq.answer}</p>
          {faq.link && (
            <a href="#" className="sl-faq2-link">&#8250; {faq.link}</a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FaqsSection() {
  return (
    <div className="sl-faq2">
      {FAQS.map((faq, i) => (
        <FaqItem key={faq.id} faq={faq} isLast={i === FAQS.length - 1} />
      ))}
    </div>
  );
}
