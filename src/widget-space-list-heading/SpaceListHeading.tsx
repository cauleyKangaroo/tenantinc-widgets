// ===========================================================================
// Widget #18 — Space List Heading (the Duda widget is named "#15 Space List
// Heading"; Duda numbers its own and #15 was free there).
//
// The <h1> that #05 draws above its filter bar, and nothing else.
//
// WHY IT IS ITS OWN WIDGET: on mobile the promotions widget (#06) has to sit
// BETWEEN the heading and the filters. Both are inside #05's own layout, so
// there is no Duda row to drop #06 into — the only way to get a widget between
// them is for the heading to BE a widget. Set #05's "Show heading" to off,
// place this above it, and #06 between the two.
//
// It deliberately shares #05's class names (.sl-wrapper, .sl-page-title) and
// copies its rules, so the two render identically. Each widget is its own AMD
// bundle and cannot reach another's CSS, which is why the rules are duplicated
// rather than imported — the same reason #06's disclaimer modal duplicates
// #05's hours modal. If the title's type changes in one, change it in both.
// ===========================================================================

import { useEffect, useState } from 'react';
import './SpaceListHeading.css';
import cfg from './config.json';
import { fetchProperties, extractPropertyExtras } from '../widget-space-list/propertyApi';
import { resolvePropertyId, resolveRequireId, boundText } from '@shared/propertyBinding';
import { resolveCompanyIdFromSources } from '@shared/companySource';

export interface SpaceListHeadingProps {
  /**
   * The heading itself, when an editor wants to write it. Overrides everything
   * below. Bindable — see @shared/propertyBinding.
   */
  propertyHeader?: string;
  /**
   * Content-menu field connected to `Properties > id` on a dynamic page. Unset
   * = the config.json property, exactly as #05 behaves.
   */
  propertyId?: string;
  /** Per-instance company override; normally unset (the `Company` collection). */
  companyId?: string;
}

export function SpaceListHeading({
  propertyHeader,
  propertyId,
  companyId,
}: SpaceListHeadingProps) {
  const effectivePropertyId = resolvePropertyId({ propertyId }, cfg.propertyId);

  /* null while resolving. #05 holds the company the same way and waits for it
     before firing: starting from cfg.companyId and correcting later would ask
     the wrong company for a name and briefly render it. */
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void resolveCompanyIdFromSources('#18 space-list-heading', { companyId }, cfg.companyId).then((id) => {
      if (!cancelled) setResolvedCompanyId(id);
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const [propertyName, setPropertyName] = useState<string | null>(null);
  useEffect(() => {
    if (!resolvedCompanyId) return undefined;
    let cancelled = false;
    // Trust-check only against a Duda-bound id; see resolveRequireId.
    fetchProperties(resolveRequireId({ propertyId }, cfg.propertyId), resolvedCompanyId)
      .then((raw) => {
        if (cancelled) return;
        setPropertyName(extractPropertyExtras(raw, effectivePropertyId)?.name ?? null);
      })
      .catch((err) => console.error('[SpaceListHeading] fetchProperties error:', err));
    return () => { cancelled = true; };
  }, [effectivePropertyId, resolvedCompanyId, propertyId]);

  /* Same precedence as #05's own title: an authored heading wins, else the
     property's live name, else the configured one — so the two never disagree
     while the API call is in flight.

     NOT reproduced here: #05 rewrites the heading on a feature page
     (`?feature=<slug>`), which it can only do because it has already loaded
     every unit to know which amenities the property actually has. Loading the
     whole listing to title it would defeat the point of splitting this out. On
     a feature page, set the heading explicitly in the content panel. */
  const title = boundText(propertyHeader)
    || `Storage Units in ${propertyName || cfg.propertyName}`;

  return (
    <div className="sl-wrapper slh-wrapper">
      <h1 className="sl-page-title">{title}</h1>
    </div>
  );
}
