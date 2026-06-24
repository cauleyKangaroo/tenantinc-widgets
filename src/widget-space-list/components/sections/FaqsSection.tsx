import React, { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Faq {
  id: number;
  question: string;
  answer: string;
  link?: string;
}

// ── Placeholder data ──────────────────────────────────────────────────────────

const FAQS: Faq[] = [
  { id: 1,  question: 'How does self storage work?',                       answer: 'Self storage is a service that allows individuals and businesses to rent storage space on a short or long-term basis. You choose the unit size you need, sign a rental agreement, and gain access to your unit to store your belongings at your convenience.', link: undefined },
  { id: 2,  question: 'Are storage units climate controlled?',             answer: 'Many of our facilities offer climate-controlled units that maintain a consistent temperature and humidity level year-round. These units are ideal for storing sensitive items such as electronics, artwork, antiques, wine, and important documents.', link: undefined },
  { id: 3,  question: 'Can you live or sleep in a storage unit?',          answer: 'Lorem ipsum dolor sit amet consectetur. Elit mattis netus neque non scelerisque praesent pretium. Odio consectetur sed augue volutpat rhoncus viverra at. Sit nisl vivamus aliquam sollicitudin. Tincidunt fringilla nunc aenean est dignissim neque. Non fermentum metus lorem amet sed ornare ultrices. In morbi semper odio nibh nibh. Ornare tincidunt proin orci volutpat. Sem tincidunt penatibus ac lectus non metus feugiat sit. Gravida maecenas purus urna vitae massa duis amet. Consectetur nunc porttitor mauris netus placerat aliquam eget tristique suspendisse. Et suscipit pellentesque ullamcorper cras faucibus enim semper risus. Pellentesque consectetur aliquam lacus quisque elementum consectetur dolor leo quisque.', link: 'Link to a relevant page' },
  { id: 4,  question: 'What can I store in a storage unit?',               answer: 'You can store almost anything in a storage unit including furniture, appliances, clothing, seasonal items, sporting equipment, business inventory, and more. Certain items are prohibited such as hazardous materials, flammable substances, perishable food, and living things.', link: undefined },
  { id: 5,  question: 'What can a storage unit be used for?',              answer: 'Storage units can be used for a wide range of purposes including home decluttering, moving and relocation, home renovation, business inventory storage, vehicle storage, college student storage, and military deployment storage.', link: undefined },
  { id: 6,  question: 'How to rent a storage unit?',                       answer: 'Renting a storage unit is simple. Browse available unit sizes and prices online, select the unit that fits your needs, complete the rental agreement, and make your first payment. Many facilities offer contactless move-in so you can get started right away.', link: undefined },
  { id: 7,  question: 'How do I choose a storage facility?',               answer: 'When choosing a storage facility consider factors such as location and accessibility, security features, unit sizes and types available, pricing and promotions, customer reviews, and whether climate control is available for your specific storage needs.', link: undefined },
  { id: 8,  question: 'Does this facility offer a military discount?',     answer: 'Yes, we are proud to offer a military discount to active duty service members and veterans. Please present a valid military ID at the time of rental to receive your discount. Contact our facility directly for current discount rates and terms.', link: undefined },
  { id: 9,  question: 'Does this facility offer one month free storage?',  answer: 'We periodically offer promotional deals including one month free storage for new customers. Check our current promotions page or contact us directly to find out about the latest offers available at your chosen facility.', link: undefined },
  { id: 10, question: 'How can I find the best deal on a storage unit?',   answer: 'To find the best deal, compare prices across facilities in your area, look for first-month promotions, consider renting a smaller unit or sharing with a friend, and ask about long-term rental discounts. Booking online often unlocks lower rates than walk-in pricing.', link: undefined },
  { id: 11, question: 'Do you offer self storage sales and promotions?',   answer: 'Yes, we regularly run sales and promotions for new and existing customers. These may include discounted first months, referral bonuses, and seasonal promotions. Sign up for our newsletter or check our website frequently to stay up to date on the latest deals.', link: undefined },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`suf-faq-item${open ? ' open' : ''}`}>
      <button className="suf-faq-question" onClick={() => setOpen((o) => !o)}>
        <span>{faq.question}</span>
        <svg className="suf-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="suf-faq-answer">
          <p>{faq.answer}</p>
          {faq.link && <a href="#" className="suf-faq-link">&#8250; {faq.link}</a>}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FaqsSection() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? FAQS.filter((f) => f.question.toLowerCase().includes(query.toLowerCase()) || f.answer.toLowerCase().includes(query.toLowerCase()))
    : FAQS;

  return (
    <section className="suf-section suf-section--faqs">

      <div className="suf-rv-header">
        <div className="suf-ap-title">FAQ</div>
        <p className="suf-rv-subtitle">Find answers to common questions about choosing a storage unit, storage unit rules and regulations, payment procedures, and more.</p>
      </div>

      <div className="suf-faq-search-wrap">
        <input
          className="suf-faq-search"
          type="text"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="suf-faq-search-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      <div className="suf-faq-list">
        {filtered.length > 0
          ? filtered.map((f) => <FaqItem key={f.id} faq={f} />)
          : <p className="suf-faq-no-results">No results found for "{query}"</p>
        }
      </div>

    </section>
  );
}
