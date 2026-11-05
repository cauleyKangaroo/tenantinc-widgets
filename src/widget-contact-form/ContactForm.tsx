import React, { useEffect, useMemo, useState } from 'react';
import './ContactForm.css';
import { LeadForm } from '@shared/components/LeadForm';
import { boundText, type BoundPropertyProps } from '@shared/propertyBinding';
// Same plumbing as #13's Contact us modal — #03's creds, portfolio and lead call.
import { createLead, fetchFacilityOptions, configureApi, type FacilityOption, type ApiCredProps } from '../widget-property-info/api';

// ---------------------------------------------------------------------------
// Widget #23 — Contact Form.
//
// The footer's "Contact us" opens the shared "Send us a Message" LIGHTBOX;
// this widget is the same form INLINE, so the site can have a dedicated
// contact page (the footer link's /contact-us) with the form as page content
// rather than an overlay. It renders the shared LeadForm — the component the
// modal is now built from — so the two can never drift apart.
//
// Unlike the modal's callers, this widget sits on NO property:
//   - the facility dropdown starts unselected and offers the whole portfolio;
//   - `requireFacility` makes Submit insist on a choice, because with nothing
//     selected the lead would fall back to config.json's propertyId — a
//     property of the OLD company that must never receive a live lead;
//   - an optional `propertyId` prop (or dynamic-page binding) preselects one,
//     for a per-facility contact section.
// ---------------------------------------------------------------------------

export interface ContactFormWidgetProps extends ApiCredProps, BoundPropertyProps {
  heading?: string;
  subheading?: string;
  /** The footer/modal's terms link, under the consent text. */
  termsHref?: string;
}

export function ContactForm({
  heading = 'Contact Us',
  subheading = 'Have a question about storage, billing, or your reservation? Send us a message and a member of our team will be in touch shortly.',
  termsHref = '#',
  propertyId,
  companyId,
  // Site-level REST credentials from the Content Library's custom site texts.
  api_domain,
  app_id,
  api_key,
}: ContactFormWidgetProps) {
  /*
   * Credentials in place BEFORE the data effects fire. During render, not
   * in an effect — an effect runs a render too late and the first request
   * would go out against config.json.
   */
  useMemo(
    () => configureApi({ api_domain, app_id, api_key }),
    [api_domain, app_id, api_key],
  );

  /* The portfolio for the "Select Property" dropdown — fetched on mount, not
     lazily on open as the modal's callers do: this form IS the page content,
     so it will be used, and the list arriving before the shopper reaches the
     dropdown beats a visibly late one. Fails soft to [] (fetchFacilities
     logs), leaving a working form whose dropdown simply has no options. */
  const [facilityOptions, setFacilityOptions] = useState<FacilityOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    void fetchFacilityOptions({ companyId }).then((list) => {
      if (!cancelled) setFacilityOptions(list);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundText(companyId)]);

  /* An unbound content-menu field arrives as '' or an unsubstituted
     {{token}}; boundText turns both into undefined so they never preselect. */
  const boundId = boundText(propertyId);

  return (
    <div className="cf-wrapper">
      <div className="cf-heading-block">
        <div className="cf-title">{heading}</div>
        {subheading && <p className="cf-subtitle">{subheading}</p>}
      </div>

      <div className="cf-card">
        <LeadForm
          facilities={facilityOptions}
          defaultFacility={facilityOptions.find((f) => f.id === boundId) ?? null}
          /* The lead files against the facility picked IN the form (LeadForm
             passes it as input.propertyId); this binding only covers the
             preselected case before the list lands. requireFacility
             guarantees one or the other is a real selection. */
          submitLead={(input) => createLead(input, { propertyId: boundId, companyId })}
          termsHref={termsHref}
          requireFacility
        />
      </div>
    </div>
  );
}
