import type { IdvRequirement } from './idvPolicy';

export type IdvPresentationOutcome = 'choose' | 'instore' | 'complete' | 'failed' | 'later';

export interface IdvPresentationDecision {
  enabled: boolean;
  detailsShown: boolean;
  idVerified: boolean;
}

/**
 * Pure presentation policy. Production always supplies the universal required
 * rule; keeping the value explicit lets the editor exercise the disabled
 * presentation without changing the screen's state rules.
 */
export function resolveIdvPresentation(
  requirement: IdvRequirement,
  outcome: IdvPresentationOutcome,
  options: { serviceConnected: boolean; preview: boolean },
): IdvPresentationDecision {
  const enabled = requirement === 'required'
    && (options.serviceConnected || options.preview);

  return {
    enabled,
    detailsShown: !enabled || outcome === 'instore' || outcome === 'complete' || outcome === 'failed',
    idVerified: !enabled || outcome === 'complete',
  };
}
