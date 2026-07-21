import React, { useState, useRef, useLayoutEffect } from 'react';
import './TierSelection.css';
import { SIZE_IMAGES, PROPERTY_IMAGES } from '@shared/demoImages';
import {
  CheckIcon,
  CheckCircle,
  InfoCircle,
  PromoStar,
  TagIcon,
  PlayCircle,
  ChevronDown,
  MapPinIcon,
  PhoneIcon,
} from './icons';
import {
  VisaMark,
  MastercardMark,
  AmexMark,
  DiscoverMark,
  ApplePayMark,
  GooglePayMark,
} from './paymentIcons';

// ---------------------------------------------------------------------------
// Widget #14 — Tier Selection ("Value Tiers" page).
// Responsive: renders Layout 1 (desktop: selector + comparison table + order-
// summary card) at wide widths and Layout 2 (mobile: centred header, stacked
// selector, collapsible move-in total, compact table) below 640px.
// Figma: Mariposa — Duda — 8551-26950 / 8551-27233 (desktop),
// 8245-6641 / 8245-6718 (mobile).
// ---------------------------------------------------------------------------

type TierKey = 'good' | 'better' | 'best';

interface Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  hours: string;
  online: number;
  inStore: number;
  summary: string;
}

const TIERS: Tier[] = [
  { key: 'good',   name: 'Good',   tagline: 'Lowest Rate',   price: 60, hours: '7am - 7pm', online: 52, inStore: 70,  summary: 'Drive-Up Access' },
  { key: 'better', name: 'Better', tagline: 'Best Value',    price: 75, hours: '7am - 9pm', online: 64, inStore: 86,  summary: 'Climate Controlled' },
  { key: 'best',   name: 'Best',   tagline: 'Most Features', price: 90, hours: '24 Hours',  online: 77, inStore: 103, summary: 'Most Features' },
];

type RowType = 'price' | 'hours' | 'check';
interface FeatureRow {
  label: string;
  type: RowType;
  bold?: boolean;
  good?: boolean;
  better?: boolean;
  best?: boolean;
}

const ROWS: FeatureRow[] = [
  { label: 'Monthly Rent',       type: 'price', bold: true },
  { label: 'Access Hours',       type: 'hours', bold: true },
  { label: 'Climate Controlled', type: 'check', bold: true, good: false, better: false, best: true },
  { label: 'Drive-Up',           type: 'check', good: false, better: true,  best: true },
  { label: 'Interior Access',    type: 'check', good: false, better: true,  best: true },
  { label: 'Ground Floor',       type: 'check', good: false, better: false, best: true },
  { label: 'Electronic Lock',    type: 'check', good: true,  better: true,  best: true },
];

// Amenity list beneath the promo banner (properties of the 5×5 unit).
const AMENITIES_LEFT = ['Climate Controlled', 'Drive-Up', 'Interior Access'];
const AMENITIES_RIGHT = ['24 Hour Access', 'Near Entrances', 'No Late Fees'];

// Move-in cost breakdown (shared by the desktop card and the mobile dropdown).
interface BreakdownRow { label: string; sub?: string; amt: string; strong?: boolean; }
const BREAKDOWN: BreakdownRow[] = [
  { label: 'Rent (Prorated)', sub: '(05/06/2026 - 05/31/2026)', amt: '$ 53.68', strong: true },
  { label: 'Admin Fee',  amt: '$ 29.00' },
  { label: 'Protection', amt: '$ 17.00' },
  { label: 'Total Tax',  amt: '$ 0.00' },
];
const MOVE_IN_TOTAL = '$99.68';

// ── Option 2 — big Good/Better/Best pricing cards (Figma 8235-43137) ────────
interface O2Feature { label: string; star?: boolean; }
interface O2Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  popular?: boolean;
  promo?: string;
  features: O2Feature[];
}
const OPTION2: O2Tier[] = [
  {
    key: 'good', name: 'Good', tagline: 'Lowest Rate', price: 65,
    features: [{ label: 'Third Floor' }, { label: '10’ Ceiling' }],
  },
  {
    key: 'better', name: 'Better', tagline: 'Best Value', price: 94,
    popular: true, promo: 'Short Promotion Title',
    features: [
      { label: '24 Hour Access', star: true },
      { label: 'Climate Controlled' },
      { label: 'Second Floor' },
      { label: '8’ Ceiling' },
    ],
  },
  {
    key: 'best', name: 'Best', tagline: 'Most Features', price: 115,
    features: [
      { label: '24 Hour Access', star: true },
      { label: 'No Late Fee', star: true },
      { label: 'Climate Controlled' },
      { label: 'Ground Floor' },
      { label: '10’ Ceiling' },
    ],
  },
];
const ADMIN_FEE_NOTE = '$30 Admin fee applied to all transactions';

// ── Option 3 — pricing cards fused with a comparison table (Figma 8235-42371).
interface O3Tier {
  key: TierKey;
  name: string;
  tagline: string;
  price: number;
  popular?: boolean;
  promo?: string;
}
const OPTION3: O3Tier[] = [
  { key: 'good',   name: 'Good',   tagline: 'Lowest Rate',   price: 65 },
  { key: 'better', name: 'Better', tagline: 'Best Value',    price: 94, popular: true, promo: 'Short Promotion Title' },
  { key: 'best',   name: 'Best',   tagline: 'Most Features', price: 84, promo: 'Short Promotion Title' },
];

type O3Weight = 'bold' | 'medium' | 'normal';
interface O3Row {
  label: string;
  type: 'hours' | 'check';
  weight: O3Weight;
  gray?: boolean;
  good?: boolean;
  better?: boolean;
  best?: boolean;
}
const ROWS3: O3Row[] = [
  { label: 'Access Hours',       type: 'hours', weight: 'bold',   gray: true },
  { label: 'Climate Controlled', type: 'check', weight: 'bold',   gray: true, good: false, better: true,  best: true },
  { label: 'Drive-up',           type: 'check', weight: 'normal', good: false, better: false, best: true },
  { label: 'Interior Access',    type: 'check', weight: 'medium', good: true,  better: true,  best: false },
  { label: 'Ground Floor',       type: 'check', weight: 'normal', good: false, better: false, best: true },
  { label: 'Electronic Lock',    type: 'check', weight: 'medium', good: true,  better: true,  best: true },
];
// Per-tier access-hours values shown in the first table row.
const O3_HOURS: Record<TierKey, string> = { good: '7am - 7pm', better: '7am - 9pm', best: '24 hours' };

export interface TierSelectionProps {
  /** 'option1' = selector + comparison table (+ order card on desktop);
   *  'option2' = three Good/Better/Best pricing cards;
   *  'option3' = pricing cards fused with a comparison table. */
  variant?: 'option1' | 'option2' | 'option3';
  heading?: string;
  subheading?: string;
  headingMobile?: string;
  urgency?: string;
  promo?: string;
}

// Container-width breakpoint: below this we render the mobile layout.
const MOBILE_BP = 640;

function useIsMobile(breakpoint: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      setIsMobile(entries[0].contentRect.width < breakpoint);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [breakpoint]);
  return { ref, isMobile };
}

export function TierSelection({
  variant = 'option1',
  heading = 'Select an Option for your 5’ x 5’',
  subheading = 'Choose a package that gives you features and flexibility.',
  headingMobile = 'Choose a 5’ x 5’ Option',
  urgency = 'Only 3 Left- Rent Soon!',
  promo = '50% Off First Month',
}: TierSelectionProps) {
  const [selected, setSelected] = useState<TierKey>('better');
  const { ref, isMobile } = useIsMobile(MOBILE_BP);
  const tier = TIERS.find((t) => t.key === selected)!;

  if (variant === 'option2') {
    return (
      <div className="ts-wrapper" ref={ref}>
        {isMobile ? (
          <Option2Mobile heading={headingMobile} urgency={urgency} />
        ) : (
          <Option2Layout heading={heading} subheading={subheading} />
        )}
      </div>
    );
  }

  if (variant === 'option3') {
    return (
      <div className="ts-wrapper" ref={ref}>
        <Option3Layout heading={heading} subheading={subheading} />
      </div>
    );
  }

  return (
    <div className="ts-wrapper" ref={ref}>
      {isMobile ? (
        <MobileLayout
          tier={tier}
          selected={selected}
          setSelected={setSelected}
          heading={headingMobile}
          urgency={urgency}
          promo={promo}
        />
      ) : (
        <DesktopLayout
          tier={tier}
          selected={selected}
          setSelected={setSelected}
          heading={heading}
          subheading={subheading}
          promo={promo}
        />
      )}
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────

function Pills({ selected, setSelected }: { selected: TierKey; setSelected: (k: TierKey) => void }) {
  return (
    <div className="ts-pills">
      {TIERS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`ts-pill${t.key === selected ? ' ts-pill--active' : ''}`}
          onClick={() => setSelected(t.key)}
          aria-pressed={t.key === selected}
        >
          <span className="ts-pill-name">{t.name}</span>
          <span className="ts-pill-tag">{t.tagline}</span>
          <span className="ts-pill-divider" />
          <span className="ts-pill-price">${t.price}/mo.</span>
        </button>
      ))}
    </div>
  );
}

// "Pricing Details" link + hover tooltip. The dark breakdown fades in on hover
// and follows the cursor (mouse sits at the tooltip's top-centre); the trigger
// shows a help (question-mark) cursor.
function PricingDetails({ price, className }: { price: number; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);

  const track = (e: React.MouseEvent) => setPos({ x: e.clientX, y: e.clientY });

  return (
    <span className="ts-pd">
      <a
        className={`ts-pd-link${className ? ' ' + className : ''}`}
        href="#"
        onClick={(e) => e.preventDefault()}
        onMouseEnter={(e) => { track(e); setVisible(true); }}
        onMouseMove={track}
        onMouseLeave={() => setVisible(false)}
      >
        Pricing Details
      </a>
      {pos && (
        <div
          className="ts-pd-modal"
          style={{ left: pos.x, top: pos.y + 6, opacity: visible ? 1 : 0 }}
          aria-hidden
        >
          <div className="ts-pd-inner">
            <div className="ts-pd-row">
              <span className="ts-pd-label"><span>Monthly Rent</span><InfoCircle size={15} className="ts-pd-info" /></span>
              <span className="ts-pd-amt">$ {price}.00</span>
            </div>
            <div className="ts-pd-row">
              <span className="ts-pd-label">Coverage</span>
              <span className="ts-pd-amt">$ 10.00</span>
            </div>
            <hr className="ts-pd-divider" />
            <div className="ts-pd-row">
              <span className="ts-pd-strong">Rent (Prorated)</span>
              <span className="ts-pd-strong">$ 64.00</span>
            </div>
            <p className="ts-pd-dates">(05/06/2026 - 05/31/2026)</p>
            <div className="ts-pd-breakdown">
              <div className="ts-pd-row"><span className="ts-pd-reg">Admin Fee</span><span className="ts-pd-reg">$ 29.00</span></div>
              <div className="ts-pd-row"><span className="ts-pd-reg">Protection</span><span className="ts-pd-reg">$ 17.00</span></div>
              <div className="ts-pd-row"><span className="ts-pd-reg">Total Tax</span><span className="ts-pd-reg">$ 0.00</span></div>
            </div>
            <div className="ts-pd-row ts-pd-total">
              <span>Total Cost to Move-In:</span>
              <span className="ts-pd-total-amt">$99.68</span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

// Desktop comparison-table cell (large price, starred hours, 24px ticks).
function Cell({ row, tier }: { row: FeatureRow; tier: Tier }) {
  if (row.type === 'price') return <span className="ts-cell-price">${tier.price}/mo</span>;
  if (row.type === 'hours') {
    return (
      <span className="ts-cell-hours">
        <PromoStar size={16} className="ts-cell-star" />
        {tier.hours}
      </span>
    );
  }
  return row[tier.key] ? <CheckIcon size={24} className="ts-cell-check" /> : null;
}

// ── Desktop (Layout 1) ──────────────────────────────────────────────────────

interface LayoutProps {
  tier: Tier;
  selected: TierKey;
  setSelected: (k: TierKey) => void;
  heading: string;
  subheading?: string;
  promo: string;
}

function DesktopLayout({ tier, selected, setSelected, heading, subheading, promo }: LayoutProps) {
  return (
    <div className="ts-grid">
      {/* LEFT: selector + comparison table */}
      <div className="ts-left">
        <div className="ts-header">
          <h2 className="ts-title">{heading}</h2>
          <p className="ts-subtitle">{subheading}</p>
        </div>
        <hr className="ts-rule" />

        <div className="ts-picker-row">
          <div className="ts-unit">
            <img className="ts-unit-img" src={SIZE_IMAGES['5x5']} alt="5 by 5 storage unit" />
            <button type="button" className="ts-seewhatfits">
              <span>See what fits</span>
              <PlayCircle size={24} />
            </button>
          </div>

          <div className="ts-picker">
            <Pills selected={selected} setSelected={setSelected} />

            <div className="ts-promo">
              <TagIcon size={16} className="ts-promo-icon" />
              <span className="ts-promo-text">{promo}</span>
            </div>

            <div className="ts-features">
              <div className="ts-feat-col">
                <div className="ts-feat ts-feat--chip">
                  <CheckIcon size={16} className="ts-feat-check" />
                  <span>Access Hours</span>
                </div>
                {AMENITIES_LEFT.map((a) => (
                  <div className="ts-feat" key={a}>
                    <CheckIcon size={16} className="ts-feat-check" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
              <div className="ts-feat-col">
                {AMENITIES_RIGHT.map((a) => (
                  <div className="ts-feat" key={a}>
                    <CheckIcon size={16} className="ts-feat-check" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="ts-select-btn">Select</button>
          </div>
        </div>

        <div className="ts-table" role="table">
          <div className="ts-thead" role="row">
            <div className="ts-th ts-th--label" role="columnheader" />
            {TIERS.map((t) => (
              <div
                key={t.key}
                role="columnheader"
                className={`ts-th${t.key === selected ? ' ts-col--active' : ''}`}
              >
                {t.name.toUpperCase()}
              </div>
            ))}
          </div>

          {ROWS.map((row, ri) => (
            <div className="ts-tr" role="row" key={row.label}>
              <div className={`ts-td ts-td--label${row.bold ? ' ts-td--bold' : ''}`} role="rowheader">
                {row.label}
              </div>
              {TIERS.map((t) => (
                <div
                  key={t.key}
                  role="cell"
                  className={`ts-td ts-td--value${t.key === selected ? ' ts-col--active' : ''}${
                    ri === ROWS.length - 1 ? ' ts-td--last' : ''
                  }`}
                >
                  <Cell row={row} tier={t} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: order-summary card */}
      <aside className="ts-card">
        <div className="ts-card-hero">
          <img className="ts-card-hero-img" src={PROPERTY_IMAGES[0]} alt="3rd Street Storage" />
          <div className="ts-card-hero-overlay" />
          <div className="ts-card-hero-content">
            <p className="ts-card-storename">3rd Street Storage</p>
            <a className="ts-card-line" href="#">
              <MapPinIcon size={24} className="ts-card-line-icon" />
              <span>1301 E. Mission Ave, Fullerton, CA 02027</span>
            </a>
            <a className="ts-card-line" href="tel:8776577465">
              <PhoneIcon size={24} className="ts-card-line-icon" />
              <span>(877) 657-7465</span>
            </a>
          </div>
        </div>

        <div className="ts-card-body">
          <div className="ts-card-top">
            <div className="ts-card-top-left">
              <p className="ts-card-size">
                5’ x 5’ <span className="ts-card-bar">|</span> {tier.name.toUpperCase()}
              </p>
              <p className="ts-card-sub">{tier.summary}</p>
              <div className="ts-card-amenities">
                <div className="ts-feat"><CheckIcon size={16} className="ts-feat-check" /><span>24 Hour Access</span></div>
                <div className="ts-feat"><CheckIcon size={16} className="ts-feat-check" /><span>Drive Up</span></div>
              </div>
            </div>
            <div className="ts-card-top-right">
              <a className="ts-card-change" href="#">Change Space</a>
              <div className="ts-card-prices">
                <div className="ts-price-instore">
                  <span className="ts-price-label">IN-STORE</span>
                  <span className="ts-price-strike">${tier.inStore}</span>
                </div>
                <span className="ts-price-sep" />
                <div className="ts-price-online">
                  <span className="ts-price-label">ONLINE</span>
                  <span className="ts-price-amount">${tier.online}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ts-card-promo">
            <TagIcon size={16} className="ts-promo-icon" />
            <span className="ts-promo-text">First Full Month FREE</span>
          </div>

          <div className="ts-card-breakdown">
            {BREAKDOWN.map((r) => (
              <div className="ts-bd-row" key={r.label}>
                {r.sub ? (
                  <div className="ts-bd-label">{r.label}<span className="ts-bd-dates">{r.sub}</span></div>
                ) : (
                  <span className="ts-bd-plain">{r.label}</span>
                )}
                <span className={`ts-bd-amt${r.strong ? ' ts-bd-amt--strong' : ''}`}>{r.amt}</span>
              </div>
            ))}
            <div className="ts-bd-row ts-bd-row--total">
              <span className="ts-bd-total-label">Total Cost to Move-In:</span>
              <span className="ts-bd-total-amt">{MOVE_IN_TOTAL}</span>
            </div>
          </div>

          <div className="ts-card-payments">
            <span className="ts-pay-box"><VisaMark /></span>
            <span className="ts-pay-box"><MastercardMark /></span>
            <span className="ts-pay-box ts-pay-box--amex"><AmexMark /></span>
            <span className="ts-pay-box"><DiscoverMark /></span>
            <span className="ts-pay-mark"><ApplePayMark /></span>
            <span className="ts-pay-mark"><GooglePayMark /></span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Mobile (Layout 2) ───────────────────────────────────────────────────────

function MobileLayout({
  tier, selected, setSelected, heading, urgency, promo,
}: {
  tier: Tier; selected: TierKey; setSelected: (k: TierKey) => void;
  heading: string; urgency: string; promo: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ts-m">
      <div className="ts-m-headwrap">
        <h2 className="ts-m-title">{heading}</h2>
        {urgency && <p className="ts-m-urgency">{urgency}</p>}
      </div>

      <div className="ts-m-pills">
        <Pills selected={selected} setSelected={setSelected} />
      </div>

      <div className="ts-promo ts-m-promo">
        <TagIcon size={16} className="ts-promo-icon" />
        <span className="ts-promo-text">{promo}</span>
      </div>

      <div className="ts-features ts-m-features">
        <div className="ts-feat-col">
          <div className="ts-feat ts-feat--chip">
            <CheckIcon size={16} className="ts-feat-check" />
            <span>Climate Controlled</span>
          </div>
          {['7am - 7pm', 'Interior Access', 'Ground Floor'].map((a) => (
            <div className="ts-feat" key={a}>
              <CheckIcon size={16} className="ts-feat-check" />
              <span>{a}</span>
            </div>
          ))}
        </div>
        <div className="ts-feat-col">
          <div className="ts-feat">
            <CheckIcon size={16} className="ts-feat-check" />
            <span>Electronic Lock</span>
          </div>
        </div>
      </div>

      <button type="button" className="ts-select-btn ts-m-select">Select</button>

      <div className="ts-m-total">
        <button
          type="button"
          className="ts-m-total-row"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="ts-m-total-label">Total Cost to Move-In</span>
          <span className="ts-m-total-amt">{MOVE_IN_TOTAL}</span>
          <ChevronDown size={24} className={`ts-m-total-chev${open ? ' ts-m-total-chev--open' : ''}`} />
        </button>
        {open && (
          <div className="ts-m-total-detail">
            {BREAKDOWN.map((r) => (
              <div className="ts-bd-row" key={r.label}>
                {r.sub ? (
                  <div className="ts-bd-label">{r.label}<span className="ts-bd-dates">{r.sub}</span></div>
                ) : (
                  <span className="ts-bd-plain">{r.label}</span>
                )}
                <span className={`ts-bd-amt${r.strong ? ' ts-bd-amt--strong' : ''}`}>{r.amt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact comparison table */}
      <div className="ts-mt" role="table">
        <div className="ts-mt-row ts-mt-head" role="row">
          <div className="ts-mt-cell ts-mt-label" role="columnheader" />
          {TIERS.map((t) => (
            <div
              key={t.key}
              role="columnheader"
              className={`ts-mt-cell ts-mt-hcell${t.key === selected ? ' ts-mt-col--active' : ''}`}
            >
              {t.name.toUpperCase()}
            </div>
          ))}
        </div>
        {ROWS.map((row, ri) => (
          <div className="ts-mt-row" role="row" key={row.label}>
            <div className={`ts-mt-cell ts-mt-label${row.bold ? ' ts-mt-label--bold' : ''}`} role="rowheader">
              {row.label}
            </div>
            {TIERS.map((t) => (
              <div
                key={t.key}
                role="cell"
                className={`ts-mt-cell ts-mt-value${t.key === selected ? ' ts-mt-col--active' : ''}${
                  ri === ROWS.length - 1 ? ' ts-mt-value--last' : ''
                }`}
              >
                <MobileCell row={row} tier={t} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobile comparison-table cell (compact 12px text, no star, 22px ticks).
function MobileCell({ row, tier }: { row: FeatureRow; tier: Tier }) {
  if (row.type === 'price') return <span className="ts-mt-text">${tier.price}</span>;
  if (row.type === 'hours') return <span className="ts-mt-text">{tier.hours}</span>;
  return row[tier.key] ? <CheckIcon size={22} className="ts-mt-check" /> : null;
}

// ── Option 2 — Good/Better/Best pricing cards ───────────────────────────────

function Option2Layout({ heading, subheading }: { heading: string; subheading?: string }) {
  return (
    <div className="ts-o2">
      <div className="ts-o2-header">
        <h2 className="ts-title ts-o2-title">{heading}</h2>
        <p className="ts-subtitle ts-o2-subtitle">{subheading}</p>
      </div>

      <div className="ts-o2-cards">
        {OPTION2.map((card) => (
          <O2Card key={card.key} card={card} />
        ))}
      </div>

      <p className="ts-o2-admin">
        {ADMIN_FEE_NOTE}
        <InfoCircle size={22} className="ts-o2-admin-info" />
      </p>
    </div>
  );
}

function O2Card({ card }: { card: O2Tier }) {
  return (
    <div className={`ts-o2-card${card.popular ? ' ts-o2-card--popular' : ''}`}>
      {card.popular && <span className="ts-o2-badge">Most Popular</span>}

      <div className="ts-o2-card-top">
        <div className="ts-o2-card-head">
          <p className="ts-o2-name">{card.name}</p>
          <p className="ts-o2-tag">{card.tagline}</p>
        </div>
        <ul className="ts-o2-features">
          {card.features.map((f) => (
            <li className="ts-o2-feat" key={f.label}>
              {f.star ? (
                <PromoStar size={22} className="ts-o2-feat-star" />
              ) : (
                <CheckCircle size={24} className="ts-o2-feat-check" />
              )}
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ts-o2-foot">
        <div className="ts-o2-foot-top">
          <div className="ts-o2-price">
            <span className="ts-o2-amt">${card.price}</span>
            <span className="ts-o2-per">/MONTH</span>
          </div>
          <PricingDetails price={card.price} className="ts-o2-details" />
        </div>
        <div className="ts-o2-foot-bottom">
          {card.promo && (
            <div className="ts-promo ts-o2-promo">
              <TagIcon size={16} className="ts-promo-icon" />
              <span className="ts-promo-text">{card.promo}</span>
            </div>
          )}
          <button type="button" className={`ts-o2-select${card.popular ? ' ts-o2-select--accent' : ''}`}>
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Option 2 mobile — accordion (one expanded, others collapsed) ────────────

function Option2Mobile({ heading, urgency }: { heading: string; urgency: string }) {
  const [expanded, setExpanded] = useState<TierKey>('better');

  return (
    <div className="ts-m ts-o2m">
      <div className="ts-m-headwrap">
        <h2 className="ts-m-title">{heading}</h2>
        {urgency && <p className="ts-m-urgency">{urgency}</p>}
      </div>

      <div className="ts-o2m-cards">
        {OPTION2.map((card) =>
          card.key === expanded ? (
            <O2MExpanded card={card} key={card.key} />
          ) : (
            <button
              type="button"
              key={card.key}
              className="ts-o2m-bar"
              onClick={() => setExpanded(card.key)}
              aria-expanded={false}
            >
              <O2MHead card={card} />
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// Shared header row (name + tagline on the left, price on the right).
function O2MHead({ card }: { card: O2Tier }) {
  return (
    <div className="ts-o2m-head">
      <div className="ts-o2m-head-info">
        <span className="ts-o2m-name">{card.name}</span>
        <span className="ts-o2m-tag">{card.tagline}</span>
      </div>
      <span className="ts-o2m-price">${card.price}/mo.</span>
    </div>
  );
}

function O2MExpanded({ card }: { card: O2Tier }) {
  return (
    <div className={`ts-o2m-card${card.popular ? ' ts-o2m-card--popular' : ''}`}>
      {card.popular && <span className="ts-o2-badge ts-o2m-badge">Most Popular</span>}
      <O2MHead card={card} />
      <ul className="ts-o2-features ts-o2m-features">
        {card.features.map((f) => (
          <li className="ts-o2-feat" key={f.label}>
            {f.star ? (
              <PromoStar size={22} className="ts-o2-feat-star" />
            ) : (
              <CheckCircle size={24} className="ts-o2-feat-check" />
            )}
            <span>{f.label}</span>
          </li>
        ))}
      </ul>
      {card.promo && (
        <div className="ts-promo ts-o2m-promo">
          <TagIcon size={16} className="ts-promo-icon" />
          <span className="ts-promo-text">{card.promo}</span>
        </div>
      )}
      <button type="button" className={`ts-o2-select${card.popular ? ' ts-o2-select--accent' : ''}`}>
        Select
      </button>
    </div>
  );
}

// ── Option 3 — pricing cards fused with comparison table ────────────────────

function Option3Layout({ heading, subheading }: { heading: string; subheading?: string }) {
  return (
    <div className="ts-o3">
      <div className="ts-o3-header">
        <div className="ts-o3-headings">
          <h2 className="ts-title ts-o3-title">{heading}</h2>
          <p className="ts-subtitle">{subheading}</p>
        </div>
        <p className="ts-o3-admin">
          {ADMIN_FEE_NOTE}
          <InfoCircle size={22} className="ts-o3-admin-info" />
        </p>
      </div>
      <hr className="ts-rule ts-o3-rule" />

      <div className="ts-o3-scroll">
        <div className="ts-o3-grid">
          {/* Feature-label column (unit illustration on top) */}
          <div className="ts-o3-col ts-o3-col--label">
            <div className="ts-o3-head ts-o3-unit">
              <img className="ts-o3-unit-img" src={SIZE_IMAGES['5x5']} alt="5 by 5 storage unit" />
              <button type="button" className="ts-seewhatfits ts-o3-seewhatfits">
                <span>See what fits</span>
                <PlayCircle size={24} />
              </button>
            </div>
            <div className="ts-o3-rows">
              {ROWS3.map((r) => (
                <div
                  key={r.label}
                  className={`ts-o3-lrow ts-o3-w-${r.weight}${r.gray ? ' ts-o3-row--gray' : ''}`}
                >
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {OPTION3.map((card) => (
            <O3Column key={card.key} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function O3Column({ card }: { card: O3Tier }) {
  return (
    <div className={`ts-o3-col ts-o3-tier${card.popular ? ' ts-o3-col--popular' : ''}`}>
      {card.popular && <span className="ts-o2-badge ts-o3-badge">Most Popular</span>}

      <div className="ts-o3-head ts-o3-card">
        <div className="ts-o3-cardhead">
          <p className="ts-o3-name">{card.name}</p>
          <p className="ts-o3-tag">{card.tagline}</p>
        </div>
        <div className="ts-o3-foot">
          <div className="ts-o3-foot-top">
            <div className="ts-o3-price">
              <span className="ts-o3-amt">${card.price}</span>
              <span className="ts-o3-per">/ MONTH</span>
            </div>
            <PricingDetails price={card.price} className="ts-o3-details" />
          </div>
          <div className="ts-o3-foot-bottom">
            <div className="ts-o3-promo-slot">
              {card.promo && (
                <div className="ts-promo ts-o3-promo">
                  <TagIcon size={16} className="ts-promo-icon" />
                  <span className="ts-promo-text">{card.promo}</span>
                </div>
              )}
            </div>
            <button type="button" className={`ts-o2-select${card.popular ? ' ts-o2-select--accent' : ''}`}>
              Select
            </button>
          </div>
        </div>
      </div>

      <div className="ts-o3-rows">
        {ROWS3.map((r, i) => (
          <div
            key={r.label}
            className={`ts-o3-vrow${r.gray ? ' ts-o3-row--gray' : ''}${i === ROWS3.length - 1 ? ' ts-o3-vrow--last' : ''}`}
          >
            <O3Cell row={r} tierKey={card.key} />
          </div>
        ))}
      </div>
    </div>
  );
}

function O3Cell({ row, tierKey }: { row: O3Row; tierKey: TierKey }) {
  if (row.type === 'hours') {
    return (
      <span className="ts-o3-hours">
        <PromoStar size={20} className="ts-o3-hours-star" />
        {O3_HOURS[tierKey]}
      </span>
    );
  }
  return row[tierKey] ? <CheckIcon size={24} className="ts-o3-check" /> : null;
}
