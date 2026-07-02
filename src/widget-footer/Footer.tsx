import React from 'react';
import './Footer.css';
import tenantLogo from './tenant-logo.svg';
import { SOCIALS, PhoneIcon, AiSparkleIcon } from './icons';

// ---------------------------------------------------------------------------
// Types + demo data
// ---------------------------------------------------------------------------

interface LinkColumn {
  heading: string;
  links: { label: string; href: string }[];
}

const COLUMNS: LinkColumn[] = [
  {
    heading: 'Company Information',
    links: [
      { label: 'Why Choose Storage Outlet', href: '#' },
      { label: 'Supplies', href: '#' },
      { label: 'What is Storage Outlet', href: '#' },
      { label: 'What does Storage Outlet do', href: '#' },
      { label: 'Tenant Protection Plan', href: '#' },
      { label: 'SMS Terms', href: '#' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { label: 'Login', href: '#' },
      { label: 'Contact us', href: '#' },
      { label: 'Online Privacy Opt-Out', href: '#' },
      { label: 'Accessibility', href: '#' },
      { label: 'Privacy Policy and Terms', href: '#' },
      { label: 'Sitemap', href: '#' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FooterProps {
  companyName?: string;
  phone?: string;
  description?: string;
  sessionId?: string;
  year?: number;
}

export function Footer({
  companyName = 'Storage Outlet',
  phone = '(800) 645-9876',
  description = 'Storage Outlet, headquartered in Irvine, owns and operates 15 self storage properties across Southern California. Our locations offer a wide range of secure and conveniently located storage solutions, including personal storage, business storage, and vehicle storage options. We are committed to providing affordable, reliable, and professional storage experiences in every community we serve. With a focus on convenience, security, and customer service, Storage Outlet continues to grow as a trusted neighborhood storage provider.',
  sessionId = '24e6fb82-a285-4a73-b4dc-546500c76981',
  year = 2026,
}: FooterProps) {
  return (
    <div className="ft-wrapper">
      <div className="ft-inner ft-top">
        <div className="ft-links">
          {COLUMNS.map((col) => (
            <nav key={col.heading} className="ft-col" aria-label={col.heading}>
              <p className="ft-col-heading">{col.heading}</p>
              <ul className="ft-list">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a className="ft-link" href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="ft-aside">
          <div className="ft-help">
            <p className="ft-help-heading">Need Help?</p>
            <a className="ft-help-row" href={`tel:${phone}`}>
              <PhoneIcon size={24} />
              <span>{phone}</span>
            </a>
            <button className="ft-help-row ft-help-chat" type="button">
              <AiSparkleIcon size={24} />
              <span>Live Chat</span>
            </button>
          </div>
          <p className="ft-desc">{description}</p>
        </div>
      </div>

      <div className="ft-divider" />

      <div className="ft-inner ft-follow">
        <div className="ft-follow-left">
          <span className="ft-follow-label">Follow {companyName}</span>
          <div className="ft-socials">
            {SOCIALS.map(({ key, label, Icon }) => (
              <a key={key} className="ft-social" href="#" aria-label={label} title={label}>
                <Icon />
              </a>
            ))}
          </div>
        </div>
        <div className="ft-powered">
          <span className="ft-powered-label">powered by</span>
          <img className="ft-tenant" src={tenantLogo} alt="Tenant" />
        </div>
      </div>

      <div className="ft-bottom">
        <div className="ft-inner ft-bottom-row">
          <span className="ft-copy">© {year}, {companyName}. All Rights Reserved.</span>
          <span className="ft-session">Session: {sessionId}</span>
        </div>
      </div>
    </div>
  );
}
