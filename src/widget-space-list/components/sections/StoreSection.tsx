import React, { useState } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

// Pika stroke icons traced from the Figma side-panel design.
const strokeProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...strokeProps}>
      <path d="M5.40731 12.974C4.16988 10.8771 3.35625 8.43264 3.03493 5.70916C2.89384 4.51323 3.63519 3.25377 4.89733 3.04738C5.29394 2.98252 5.78431 2.99232 6.18768 3.0287C7.87081 3.18051 8.56658 4.6661 8.93595 6.10803C9.43051 8.03869 8.82802 10.0852 7.36633 11.4397C6.76147 12.0002 6.06056 12.4721 5.40731 12.974ZM5.40731 12.974C6.72406 15.2053 8.52068 17.043 10.7146 18.4047M10.7146 18.4047C12.8787 19.7478 15.4294 20.6276 18.2874 20.965C19.4834 21.1062 20.7424 20.3643 20.9487 19.1022C21.0194 18.6693 21.011 18.1714 20.9595 17.7362C20.7499 15.9658 19.0455 15.2967 17.5244 14.9479C15.7912 14.5505 13.9733 15.0271 12.6579 16.2238C11.9438 16.8733 11.3466 17.6768 10.7146 18.4047Z" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...strokeProps}>
      <path d="M21.8032 7.76159L16.295 11.2668C14.7385 12.2573 13.9602 12.7526 13.1238 12.9455C12.3843 13.1161 11.6157 13.1161 10.8762 12.9455C10.0398 12.7526 9.26153 12.2573 7.70499 11.2668L2.19678 7.76159M21.8032 7.76159C22 8.72189 22 10.006 22 12C22 14.8003 22 16.2004 21.455 17.27C20.9757 18.2108 20.2108 18.9757 19.27 19.455C18.2004 20 16.8003 20 14 20H10C7.19974 20 5.79961 20 4.73005 19.455C3.78924 18.9757 3.02433 18.2108 2.54497 17.27C2 16.2004 2 14.8003 2 12C2 10.006 2 8.72189 2.19678 7.76159M21.8032 7.76159C21.7237 7.37332 21.6119 7.03798 21.455 6.73005C20.9757 5.78924 20.2108 5.02433 19.27 4.54497C18.2004 4 16.8003 4 14 4H10C7.19974 4 5.79961 4 4.73005 4.54497C3.78924 5.02433 3.02433 5.78924 2.54497 6.73005C2.38807 7.03798 2.27634 7.37332 2.19678 7.76159" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...strokeProps}>
      <path d="M11.9995 8V12.8164C11.9995 12.9874 12.0869 13.1465 12.2311 13.2383L14.9995 15M21.1496 12.0001C21.1496 17.0535 17.053 21.1501 11.9996 21.1501C6.9462 21.1501 2.84961 17.0535 2.84961 12.0001C2.84961 6.94669 6.9462 2.8501 11.9996 2.8501C17.053 2.8501 21.1496 6.94669 21.1496 12.0001Z" />
    </svg>
  );
}

function WriteReviewIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...strokeProps}>
      <path d="M16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V12.2C3 13.8802 3 14.7202 3.32698 15.362C3.6146 15.9265 4.07354 16.3854 4.63803 16.673C5.27976 17 6.11984 17 7.8 17H8V21L13 17H16.2C17.8802 17 18.7202 17 19.362 16.673C19.9265 16.3854 20.3854 15.9265 20.673 15.362C21 14.7202 21 13.8802 21 12.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3Z" />
      <path d="M9.0258 12.2118C9.03341 11.9795 9.03721 11.8633 9.06595 11.7542C9.09143 11.6575 9.13129 11.5651 9.18418 11.4804C9.24382 11.3847 9.32568 11.3025 9.48939 11.1381L13.4359 7.17476C13.6331 6.97678 13.9407 6.9431 14.1757 7.09378C14.4595 7.27574 14.7015 7.51618 14.8858 7.79917L14.8987 7.81897C15.0597 8.06623 15.026 8.39297 14.818 8.60187L10.9081 12.5284C10.7382 12.699 10.6533 12.7843 10.5542 12.8455C10.4664 12.8998 10.3707 12.94 10.2705 12.9647C10.1575 12.9924 10.0374 12.9932 9.79717 12.9948L9 13L9.0258 12.2118Z" strokeWidth="1" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...strokeProps}>
      <path d="M16 2V4.12777M16 4.12777V6M16 4.12777C15.0589 4 13.8284 4 12 4C10.1716 4 8.94106 4 8 4.12777M16 4.12777C16.4978 4.19536 16.9146 4.29871 17.2961 4.45672C18.7663 5.06569 19.9343 6.23373 20.5433 7.7039C21 8.80653 21 10.2044 21 13C21 15.7956 21 17.1935 20.5433 18.2961C19.9343 19.7663 18.7663 20.9343 17.2961 21.5433C16.1935 22 14.7956 22 12 22C9.20435 22 7.80653 22 6.7039 21.5433C5.23373 20.9343 4.06569 19.7663 3.45672 18.2961C3 17.1935 3 15.7956 3 13C3 10.2044 3 8.80653 3.45672 7.7039C4.06569 6.23373 5.23373 5.06569 6.7039 4.45672C7.08538 4.29871 7.50219 4.19536 8 4.12777M8 2V4.12777M8 4.12777V6M8.75 13.9219L10.924 16.0936C11.99 14.2295 13.4794 12.6552 15.25 11.4462" />
    </svg>
  );
}

function ChevronDownIcon({ rotated }: { rotated?: boolean }) {
  // Pika chevron-big-right; rotated to point down (collapsed) / up (expanded).
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...strokeProps}
      style={{ transform: `rotate(${rotated ? -90 : 90}deg)`, transition: 'transform 0.2s' }}>
      <path d="M9 18C11.1808 16.423 13.1364 14.5771 14.8172 12.5101C15.0609 12.2103 15.0609 11.7897 14.8172 11.4899C13.1364 9.42294 11.1808 7.57701 9 6" />
    </svg>
  );
}

// Social icons
function FacebookIcon()  { return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>; }
function InstagramIcon() { return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>; }
function YouTubeIcon()   { return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#101318" stroke="none"/></svg>; }
function XIcon()         { return <svg width="29" height="29" viewBox="0 0 24 24" fill="#101318"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.246l7.73-8.835L1.254 2.25H8.08l4.713 5.893zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>; }
function LinkedInIcon()  { return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>; }
function TikTokIcon()    { return <svg width="29" height="29" viewBox="0 0 24 24" fill="#101318"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.35 6.35 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.19 8.19 0 004.77 1.52V6.89a4.85 4.85 0 01-1-.2z"/></svg>; }

// ── Hours data ────────────────────────────────────────────────────────────────

const OFFICE_HOURS = [
  { day: 'Monday – Friday', hours: '8:30am – 6:00pm' },
  { day: 'Saturday',        hours: '8:30am – 5:00pm' },
  { day: 'Sunday',          hours: '10:00am – 4:00pm' },
];
const GATE_HOURS = '6:00am – 11:30pm';

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRatingInput() {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const active = hovered || selected;
  const path = 'M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z';

  return (
    <div className="sl-pi-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          className="sl-pi-star-btn"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => setSelected(i === selected ? 0 : i)}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={i <= active ? '#FBBC05' : 'none'} stroke={i <= active ? '#FBBC05' : '#a5b4bf'} strokeWidth="1.5" strokeLinejoin="round">
            <path d={path}/>
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StoreSection() {
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [reservationCode, setReservationCode] = useState('');

  return (
    <div className="sl-pi">

      {/* ── Call our Storage Experts ── */}
      <div className="sl-pi-card">
        <div className="sl-pi-card-header">
          <PhoneIcon />
          <span className="sl-pi-card-title">Call our Storage Experts</span>
        </div>
        <div className="sl-pi-card-body">
          <p className="sl-pi-phone-row">
            <a href="tel:8776577465" className="sl-pi-phone-link">(877) 657-7465</a>
            <span className="sl-pi-phone-label"> (New Customer)</span>
          </p>
          <p className="sl-pi-phone-row">
            <a href="tel:8778479487" className="sl-pi-phone-link">(877) 847-9487</a>
            <span className="sl-pi-phone-label"> (Existing Customer)</span>
          </p>
        </div>
      </div>

      {/* ── Send us a Message ── */}
      <button className="sl-pi-card sl-pi-card--action">
        <div className="sl-pi-card-header">
          <EnvelopeIcon />
          <span className="sl-pi-card-title">Send us a Message</span>
        </div>
      </button>

      {/* ── Hours ── */}
      <div className="sl-pi-card">
        <div className="sl-pi-card-header">
          <ClockIcon />
          <span className="sl-pi-card-title">Hours</span>
        </div>
        <div className="sl-pi-card-body">
          <p className="sl-pi-hours-status">
            <span className="sl-pi-status--open">Gate Open</span>
            <span className="sl-pi-status-detail"> (Closes 11:30pm)</span>
          </p>
          <p className="sl-pi-hours-status">
            <span className="sl-pi-status--closed">Office Closed</span>
            <span className="sl-pi-status-detail"> (Opens 8:30am)</span>
          </p>

          <button className="sl-pi-see-hours" onClick={() => setHoursExpanded((e) => !e)}>
            <ChevronDownIcon rotated={hoursExpanded} />
            See all Hours
          </button>

          {hoursExpanded && (
            <div className="sl-pi-hours-detail">
              <p className="sl-pi-hours-label">Office Hours</p>
              {OFFICE_HOURS.map((row) => (
                <p key={row.day} className="sl-pi-hours-line">{row.day}: {row.hours}</p>
              ))}
              <p className="sl-pi-hours-label">Gate Hours</p>
              <p className="sl-pi-hours-line">Daily: {GATE_HOURS}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Rate and Review ── */}
      <div className="sl-pi-card">
        <div className="sl-pi-card-header">
          <WriteReviewIcon />
          <span className="sl-pi-card-title">Rate and Review</span>
        </div>
        <div className="sl-pi-card-body sl-pi-card-body--stars">
          <StarRatingInput />
        </div>
      </div>

      {/* ── Find my Reservation ── */}
      <div className="sl-pi-card">
        <div className="sl-pi-card-header">
          <CalendarCheckIcon />
          <span className="sl-pi-card-title">Find my Reservation</span>
        </div>
        <div className="sl-pi-card-body sl-pi-card-body--reservation">
          <input
            className="sl-pi-reservation-input"
            type="text"
            placeholder="Reservation Code"
            value={reservationCode}
            onChange={(e) => setReservationCode(e.target.value)}
          />
          <button className="sl-pi-reservation-go">Go</button>
        </div>
      </div>

      {/* ── Social icons ── */}
      <div className="sl-pi-social">
        <a href="#" className="sl-pi-social-link" aria-label="Facebook"><FacebookIcon /></a>
        <a href="#" className="sl-pi-social-link" aria-label="Instagram"><InstagramIcon /></a>
        <a href="#" className="sl-pi-social-link" aria-label="YouTube"><YouTubeIcon /></a>
        <a href="#" className="sl-pi-social-link" aria-label="X (Twitter)"><XIcon /></a>
        <a href="#" className="sl-pi-social-link" aria-label="LinkedIn"><LinkedInIcon /></a>
        <a href="#" className="sl-pi-social-link" aria-label="TikTok"><TikTokIcon /></a>
      </div>

    </div>
  );
}
