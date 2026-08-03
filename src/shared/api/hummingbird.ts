import type { HummingbirdClientOptions, Property } from '../types';

/**
 * Typed stub for the Hummingbird API client.
 *
 * Widgets never call Hummingbird directly. All requests go through a
 * server-side proxy whose URL is passed in via `proxyBaseUrl`. No API
 * keys or secrets belong in this file or in any widget bundle.
 *
 * Replace the stub implementations below with real fetch calls once the
 * proxy endpoints are defined.
 */
export class HummingbirdClient {
  private readonly tenantId: string;
  private readonly proxyBaseUrl: string;

  constructor({ tenantId, proxyBaseUrl }: HummingbirdClientOptions) {
    this.tenantId = tenantId;
    this.proxyBaseUrl = proxyBaseUrl.replace(/\/$/, '');
  }

  async getProperties(): Promise<Property[]> {
    // TODO: replace with real proxy call
    // const res = await fetch(`${this.proxyBaseUrl}/properties?tenantId=${this.tenantId}`);
    // return res.json();
    console.warn('[HummingbirdClient] getProperties() is a stub — returning mock data');
    return [
      { id: '1', name: 'Sample Property', address: '123 High Street, London' },
    ];
  }
}
