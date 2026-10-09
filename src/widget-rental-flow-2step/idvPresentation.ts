import type { IdvRequirement } from './idvPolicy';

export type IdvPresentationOutcome = 'choose' | 'instore' | 'complete' | 'failed' | 'later';

export interface IdvPresentationDecision {
  enabled: boolean;
  detailsShown: boolean;
  idVerified: boolean;
}

/**
 * Pure presentation policy. The requirement is the property's own setting
 * (disabled / optional / required); the editor preview can override it to
 * exercise each presentation without changing the screen's state rules.
 */
export function resolveIdvPresentation(
  requirement: IdvRequirement,
  outcome: IdvPresentationOutcome,
  options: { serviceConnected: boolean; preview: boolean },
): IdvPresentationDecision {
  const enabled = requirement !== 'disabled'
    && (options.serviceConnected || options.preview);

  return {
    enabled,
    detailsShown: !enabled || outcome !== 'choose',
    idVerified: !enabled || outcome === 'complete',
  };
}
