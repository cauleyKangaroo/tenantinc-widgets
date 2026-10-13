export interface CityResult { label: string; href: string; haystack: string; distanceMiles?: number }
export function alphabetically<T extends CityResult>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) || a.href.localeCompare(b.href));
}
export function matchingCities<T extends CityResult>(rows: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return alphabetically(rows.filter(row => !needle || row.haystack.includes(needle)));
}
export function milesBetween(latA: number, lngA: number, latB: number, lngB: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(latB - latA) / 2) ** 2
    + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(radians(lngB - lngA) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
export function nearbyCities<T extends CityResult>(properties: Array<{ lat: number; lng: number; target: T }>, lat: number, lng: number): Array<T & { distanceMiles: number }> {
  const cities = new Map<string, T & { distanceMiles: number }>();
  for (const property of properties) {
    const distanceMiles = milesBetween(lat, lng, property.lat, property.lng);
    if (!Number.isFinite(distanceMiles) || distanceMiles > 200) continue;
    const old = cities.get(property.target.href);
    if (!old || distanceMiles < old.distanceMiles) cities.set(property.target.href, { ...property.target, distanceMiles });
  }
  // Select the closest four distinct cities, then display/navigation order A–Z.
  return alphabetically([...cities.values()].sort((a, b) => a.distanceMiles - b.distanceMiles || a.label.localeCompare(b.label)).slice(0, 4));
}
