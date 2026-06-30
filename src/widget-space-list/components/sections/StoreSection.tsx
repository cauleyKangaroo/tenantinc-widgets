import React, { useState } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.99 1.17 2 2 0 013 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0122 16z"/>
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function WriteReviewIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="10" y1="11" x2="14" y2="11"/>
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <polyline points="9 16 11 18 15 14"/>
    </svg>
  );
}

function ChevronDownIcon({ rotated }: { rotated?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: rotated ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9"/>
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
const GATE_HOURS = '6:00am – 11:30pm (Daily)';

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

          {hoursExpanded && (
            <div className="sl-pi-hours-table">
              <div className="sl-pi-hours-section-label">Office Hours</div>
              {OFFICE_HOURS.map((row) => (
                <div key={row.day} className="sl-pi-hours-row">
                  <span className="sl-pi-hours-day">{row.day}</span>
                  <span className="sl-pi-hours-time">{row.hours}</span>
                </div>
              ))}
              <div className="sl-pi-hours-section-label sl-pi-hours-section-label--mt">Gate Access</div>
              <div className="sl-pi-hours-row">
                <span className="sl-pi-hours-day">Daily</span>
                <span className="sl-pi-hours-time">{GATE_HOURS}</span>
              </div>
            </div>
          )}

          <button className="sl-pi-see-hours" onClick={() => setHoursExpanded((e) => !e)}>
            <ChevronDownIcon rotated={hoursExpanded} />
            See all Hours
          </button>
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
