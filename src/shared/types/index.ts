// ---------------------------------------------------------------------------
// Hummingbird API
// ---------------------------------------------------------------------------

export interface Property {
  id: string;
  name: string;
  address: string;
}

export interface HummingbirdClientOptions {
  /** Tenant identifier passed with every request */
  tenantId: string;
  /**
   * Base URL of the server-side proxy that forwards requests to Hummingbird.
   * Widgets never call Hummingbird directly — auth lives server-side.
   */
  proxyBaseUrl: string;
}

// ---------------------------------------------------------------------------
// Duda External App lifecycle
// ---------------------------------------------------------------------------

/**
 * Shape of the object Duda passes into init().
 * `props` is whatever you pass as the third arg to renderExternalApp().
 */
export interface DudaInitParams<TProps = Record<string, unknown>> {
  container: HTMLElement;
  props: TProps;
}

// ---------------------------------------------------------------------------
// Widget prop shapes
// ---------------------------------------------------------------------------

export interface HeroProps {
  title: string;
  subtitle?: string;
  /** Controls which layout variant to render — driven by a Duda content panel dropdown */
  layout?: 'default' | 'centered' | 'split';
  ctaLabel?: string;
  ctaHref?: string;
}

export interface ClockProps {
  /** IANA timezone string e.g. "Europe/London" */
  timezone?: string;
  /** Controls which layout variant to render */
  layout?: 'default' | 'minimal';
}
