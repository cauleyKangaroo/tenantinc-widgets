import React, { useMemo, useState } from 'react';
import './FAQs.css';
import { SearchIcon, ChevronDown, ChevronRight } from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface Faq {
  id: string;
  question: string;
  answer: string;
  /** Optional "Link to a relevant page" shown under the answer. */
  link?: { label: string; href: string };
}

const FAQS: Faq[] = [
  { id: 'f1', question: 'How does self storage work?', answer: 'You rent a private, lockable unit on a month-to-month basis and keep the only key or access code. Drive up or use the building entrance to load and unload your belongings whenever the facility is open.' },
  { id: 'f2', question: 'Are storage units climate controlled?', answer: 'Many of our units are climate controlled, keeping temperature and humidity within a steady range to protect sensitive items like electronics, documents, and wood furniture. Standard drive-up units are also available.' },
  {
    id: 'f3',
    question: 'Can you live or sleep in a storage unit?',
    answer: 'No. Storage units are for storing belongings only — living, sleeping, or working inside a unit is prohibited by law and by your rental agreement for safety reasons, as units lack ventilation, plumbing, and fire-safety systems required for occupancy.',
    link: { label: 'Link to a relevant page', href: '#' },
  },
  { id: 'f4', question: 'What can I store in a storage unit?', answer: 'Furniture, appliances, business inventory, seasonal items, vehicles, and most household goods. Hazardous materials, perishables, plants, and living things are not permitted.' },
  { id: 'f5', question: 'What can a storage unit be used for?', answer: 'Common uses include decluttering your home, storing inventory for a small business, holding belongings during a move or renovation, and keeping seasonal gear like holiday decorations or sports equipment.' },
  { id: 'f6', question: 'How to rent a storage unit?', answer: 'Choose a unit size online or in person, complete the rental agreement, and make your first payment. You can typically move in the same day once your reservation is confirmed.' },
  { id: 'f7', question: 'How do I choose a storage facility?', answer: 'Consider location, security features, access hours, climate control, and pricing. Reading recent customer reviews is one of the best ways to gauge a facility’s cleanliness and service.' },
  { id: 'f8', question: 'Does this facility offer a military discount?', answer: 'Yes — we proudly offer discounts for active-duty military and veterans. Bring valid ID to the office or mention it when booking to apply your discount.' },
  { id: 'f9', question: 'Does this facility offer one month free storage?', answer: 'Move-in specials, including first-month-free promotions, are available on select unit sizes throughout the year. Check the current offers on our promotions page or ask our team.' },
  { id: 'f10', question: 'How can I find the best deal on a storage unit?', answer: 'Book online to access web-only rates, watch for seasonal promotions, and consider a slightly smaller unit if you can pack efficiently. Longer commitments sometimes unlock better pricing.' },
  { id: 'f11', question: 'Do you offer self storage sales and promotions?', answer: 'Yes. We run regular promotions including discounted first months and rate locks. Availability varies by location and unit size.' },
  { id: 'f12', question: 'Do storage units have holiday sales?', answer: 'We frequently run special pricing around major holidays. Sign up for our mailing list to be the first to hear about seasonal offers.' },
  { id: 'f13', question: 'Where can I get the best deal on storage units?', answer: 'Our online booking consistently offers the lowest available rates, and our team can help match you with the right size so you’re never paying for space you don’t need.' },
  { id: 'f14', question: 'Are there recycling containers available?', answer: 'Recycling availability varies by location. Many of our facilities provide clearly marked recycling and waste containers near the loading areas.' },
  { id: 'f15', question: 'Do the facilities have a dumpster?', answer: 'Dumpsters are provided at most locations for tenant use during move-in and move-out. Please dispose of household waste only — no hazardous materials.' },
  { id: 'f16', question: 'Do the facilities have bathrooms?', answer: 'Yes, restrooms are available for customers during office and access hours at the majority of our locations.' },
  { id: 'f17', question: 'Do storage units have power outlets and electricity?', answer: 'Standard units do not include in-unit electricity. Some specialty units offer power on request — ask our team about availability at your location.' },
  { id: 'f18', question: 'Do storage units have wifi?', answer: 'Wi-Fi is not provided inside individual units, though many facilities offer connectivity in the office and common areas.' },
  { id: 'f19', question: 'Do facilities provide carts, elevators, or dollies during holidays?', answer: 'Yes — moving carts, dollies, and elevators (where applicable) remain available during access hours, including most holidays.' },
  { id: 'f20', question: 'Do holidays affect gate access hours?', answer: 'Gate access generally follows the normal schedule on holidays, though office hours may be reduced. Check your location’s page for any holiday-specific changes.' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={onToggle} aria-expanded={open}>
        <span className="faq-q-text">{faq.question}</span>
        <ChevronDown className={`faq-chevron${open ? ' open' : ''}`} size={24} />
      </button>
      {open && (
        <div className="faq-a">
          <p className="faq-a-text">{faq.answer}</p>
          {faq.link && (
            <a className="faq-link" href={faq.link.href}>
              <ChevronRight size={24} />
              {faq.link.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface FaqsProps {
  heading?: string;
  subheading?: string;
}

export function FAQs({
  heading = 'FAQ',
  subheading = 'Find answers to common questions about choosing a storage unit, storage unit rules and regulations, payment procedures, and more.',
}: FaqsProps) {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [query]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="faq-wrapper">
      <div className="faq-heading-block">
        <div className="faq-title">{heading}</div>
        <p className="faq-subtitle">{subheading}</p>
      </div>

      <div className="faq-search">
        <input
          className="faq-search-input"
          type="text"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search FAQs"
        />
        <span className="faq-search-btn" aria-hidden="true">
          <SearchIcon size={24} />
        </span>
      </div>

      <div className="faq-list">
        {filtered.length === 0 ? (
          <p className="faq-empty">No questions match “{query}”.</p>
        ) : (
          filtered.map((faq) => (
            <FaqItem key={faq.id} faq={faq} open={openIds.has(faq.id)} onToggle={() => toggle(faq.id)} />
          ))
        )}
      </div>
    </div>
  );
}
