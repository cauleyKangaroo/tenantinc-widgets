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
// EVERY class here is `slh-`. It briefly borrowed #05's `.sl-` names on the
// theory that both would then be styled from one set of rules — which was
// wrong twice over. Each widget is its own AMD bundle and cannot reach
// another's CSS, so the rules had to be copied anyway; and both stylesheets
// load on the SAME PAGE, where a class is global. `.sl-wrapper` carries
// `min-height: 600px` in #05's sheet, so this widget inherited a 600px box
// from a stylesheet it does not even contain. Its own names cannot collide.
// The type is duplicated from #05's title — if it changes there, change it
// here too.
// ===========================================================================

import { useEffect, useRef, useState } from 'react';
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
  /**
   * The id, when the content field cannot supply it.
   *
   * "Connect to data" on a content-menu field is the intended route, but it is
   * not always offered for an external app — the open question CLAUDE.md
   * records. A dynamic page WILL substitute handlebars in the widget's HTML
   * tab, though, so a hidden token there is a second way in:
   *
   *     <span data-slh-property-id="{{propertyId}}" hidden></span>
   *
   * Read once on mount from this widget's own subtree — never the document, so
   * two of these on one page cannot read each other's. boundText() throws away
   * an unsubstituted `{{...}}`, so the tag being present but unfilled leaves us
   * exactly where we started rather than searching for a property called
   * "{{propertyId}}".
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const [domId, setDomId] = useState<string | undefined>();
  useEffect(() => {
    if (boundText(propertyId)) return;   // the prop already arrived
    const host = rootRef.current?.closest('[data-slh-host]') ?? rootRef.current?.parentElement?.parentElement;
    const tag = host?.querySelector('[data-slh-property-id]');
    const raw = tag?.getAttribute('data-slh-property-id') ?? '';
    const clean = boundText(raw);
    if (clean) setDomId(clean);
  }, [propertyId]);

  const effectivePropertyId = resolvePropertyId({ propertyId: propertyId || domId }, cfg.propertyId);

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
    fetchProperties(resolveRequireId({ propertyId: propertyId || domId }, cfg.propertyId), resolvedCompanyId)
      .then((raw) => {
        if (cancelled) return;
        setPropertyName(extractPropertyExtras(raw, effectivePropertyId)?.name ?? null);
      })
      .catch((err) => console.error('[SpaceListHeading] fetchProperties error:', err));
    return () => { cancelled = true; };
  }, [effectivePropertyId, resolvedCompanyId, propertyId, domId]);

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

  /* Nothing until the name is known.
     The fallback below it is config.json's, which on this site names a
     property of the OLD company — so rendering early flashed a heading for the
     wrong facility and then swapped it. A skeleton reserves the same line
     instead, and Duda measures a box that is already the right height. */
  if (propertyName === null && !boundText(propertyHeader)) {
    return (
      <div className="slh-wrapper" ref={rootRef}>
        <div className="slh-skeleton" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="slh-wrapper" ref={rootRef}>
      <h1 className="slh-title">{title}</h1>
    </div>
  );
}
