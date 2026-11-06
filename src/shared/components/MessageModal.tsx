import React, { useEffect } from 'react';
import { CloseCircleIcon } from '@shared/ui/icons';
import type { LeadInput } from '@shared/leadsApi';
import { LeadForm, type Facility } from './LeadForm';
import './MessageModal.css';

// ---------------------------------------------------------------------------
// "Send us a Message" lightbox (Figma 10199-60873 / 10199-67707).
//
// SHARED between #02 nav, #03 property-info, #05 space-list and #13 footer.
// #05 used to carry a "faithful clone" of #03's, which is exactly how it ended
// up two revisions behind — one component means that cannot happen a third time.
//
// This file is now only the CHROME: overlay, dialog, title bar, Esc and the
// body-scroll lock. The form itself — fields, facility picker, consent,
// submit, success — is the shared LeadForm, which #23 widget-contact-form
// renders inline on a page without any of this. Form state resets by MOUNT:
// the form renders only while the modal is open, so closing unmounts it and
// the next open starts clean, which is what the old reset-on-open effect did.
//
// The lead call is INJECTED. Each widget files against its own company and
// property with its own key, so the creds cannot live here; `submitLead` is
// whatever that widget's createLead already is.
// ---------------------------------------------------------------------------

export type { Facility };

function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.8032 7.76159L16.295 11.2668C14.7385 12.2573 13.9602 12.7526 13.1238 12.9455C12.3843 13.1161 11.6157 13.1161 10.8762 12.9455C10.0398 12.7526 9.26153 12.2573 7.70499 11.2668L2.19678 7.76159M21.8032 7.76159C22 8.72189 22 10.006 22 12C22 14.8003 22 16.2004 21.455 17.27C20.9757 18.2108 20.2108 18.9757 19.27 19.455C18.2004 20 16.8003 20 14 20H10C7.19974 20 5.79961 20 4.73005 19.455C3.78924 18.9757 3.02433 18.2108 2.54497 17.27C2 16.2004 2 14.8003 2 12C2 10.006 2 8.72189 2.19678 7.76159M21.8032 7.76159C21.7237 7.37332 21.6119 7.03798 21.455 6.73005C20.9757 5.78924 20.2108 5.02433 19.27 4.54497C18.2004 4 16.8003 4 14 4H10C7.19974 4 5.79961 4 4.73005 4.54497C3.78924 5.02433 3.02433 5.78924 2.54497 6.73005C2.38807 7.03798 2.27634 7.37332 2.19678 7.76159" />
    </svg>
  );
}

export function MessageModal({
  open, onClose, facilities, submitLead, termsHref = '#', defaultFacility = null,
}: {
  open: boolean;
  onClose: () => void;
  facilities: Facility[];
  /** The widget's own createLead — see the note at the top of this file. */
  submitLead: (input: LeadInput) => Promise<unknown>;
  termsHref?: string;
  /** The property whose page this is, preselected on open — see LeadForm. */
  defaultFacility?: Facility | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pi-msg-overlay" onMouseDown={onClose}>
      <div className="pi-msg-modal" role="dialog" aria-modal="true" aria-label="Send us a Message" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pi-msg-head">
          <span className="pi-msg-title"><EnvelopeIcon size={24} /><span>Send us a Message</span></span>
          {/* Filled disc: .pi-msg-modal is #fff. 32 desktop AND mobile — the
              box is 32px with no padding and has no mobile override, so one
              size serves both. Pinned in CSS too; see .pi-msg-close svg. */}
          <button type="button" className="pi-msg-close" aria-label="Close" onClick={onClose}><CloseCircleIcon size={32} /></button>
        </div>
        <LeadForm
          facilities={facilities}
          submitLead={submitLead}
          termsHref={termsHref}
          defaultFacility={defaultFacility}
          onCancel={onClose}
          onDone={onClose}
        />
      </div>
    </div>
  );
}
