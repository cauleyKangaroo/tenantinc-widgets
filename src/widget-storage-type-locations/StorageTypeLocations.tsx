// ===========================================================================
// #19 — "Find {type} near you"
//
// The facility list on a Storage Type page. Which facilities offer the feature
// comes from `PropertiesInternal.amenities` (property-level, `[{name, image}]`),
// or from an explicit `propertyIds` list for the features Hummingbird and the
// collection do not describe.
//
// ONE collection read. No Hummingbird call: the amenities, the address and the
// slug all arrive on the same row.
//
// Three outcomes, deliberately distinct:
//   • matches            → render, grouped by state
//   • no matches         → render nothing (the feature genuinely isn't offered)
//   • configuration/read failure → log it; show diagnostics in editor/preview,
//                                  but never expose internal wording to visitors
// ===========================================================================

import { useEffect, useState } from 'react';
import './StorageTypeLocations.css';
import { hasCollectionsApi, readCollection, str, plainText, type CollectionRow } from '@shared/dudaCollections';
import { readInternalPropertiesResult, propertyLikeRows } from '@shared/internalProperties';
import { AlertIcon, MapPinSolidIcon } from '@shared/ui/icons';

export interface StorageTypeLocationsProps {
  /** Identifies the page. Used for logging and as the default heading noun. */
  storageTypeSlug?: string;
  /** Amenity name to match against each property's `amenities[].name`. */
  amenityName?: string;
  /** Comma-separated property ids — the fallback when no amenity describes this type. */
  propertyIds?: string;
  heading?: string;
  /** Optional bold lead-in for the supporting sentence. */
  subheadingEmphasis?: string;
  subheading?: string;
  /** Prefix for facility links. Default `/storage-units`. */
  locationBasePath?: string;
  collectionName?: string;
  /** Existing feature copy/mapping collection. Default `featurePage`. */
  featureCollectionName?: string;
  inEditor?: boolean | string;
}

interface Facility {
  id: string;
  name: string;
  line: string;
  state: string;
  href: string;
}

type Result =
  | { status: 'loading' }
  | { status: 'ok'; facilities: Facility[] }
  | { status: 'preview'; facilities: Facility[] }
  | { status: 'error'; detail: string; showDiagnostic: boolean };

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington, D.C.',
};

const PREVIEW: Facility[] = [
  { id: 'demo-1', name: 'Storage Outlet - Bellflower', line: '10326 Foster Rd., Bellflower, CA 90706', state: 'CA', href: '#' },
  { id: 'demo-2', name: 'Storage Outlet - Fullerton', line: '900 S Raymond Ave, Fullerton, CA 92831', state: 'CA', href: '#' },
];

function boolProp(v: boolean | string | undefined): boolean {
  return v === true || v === 'true';
}

function keyOf(value: unknown): string {
  return plainText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function candidateKeys(...values: unknown[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const key = keyOf(value);
    if (!key) continue;
    out.add(key);
    out.add(key.replace(/_(storage|storage_units|units|access)$/, ''));
  }
  return [...out].filter(Boolean);
}

/** Published storage-type pages can identify themselves without a widget field. */
function slugFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const branch = parts.lastIndexOf('storage-types');
  return branch >= 0 && parts[branch + 1] ? parts[branch + 1].toLowerCase() : '';
}

function idSet(value: unknown): Set<string> {
  const values = Array.isArray(value) ? value : plainText(value).split(/[\n,|]+/);
  return new Set(values.map((id) => plainText(id).trim()).filter(Boolean));
}

interface FeatureMapping {
  amenityName: string;
  propertyIds: Set<string>;
}

async function readFeatureMapping(collectionName: string, pageSlug: string): Promise<FeatureMapping | null> {
  if (!collectionName || !pageSlug) return null;
  const wanted = new Set(candidateKeys(pageSlug));
  const rows = await readCollection(collectionName).catch(() => [] as CollectionRow[]);
  const row = rows.find((candidate) =>
    candidateKeys(candidate.slug, candidate.name).some((key) => wanted.has(key)));
  if (!row) return null;
  return {
    amenityName: keyOf(row.amenity_name),
    propertyIds: idSet(row.property_ids),
  };
}

/** The harness is the only no-dmAPI runtime where example rows are intentional. */
function isLocalHarness(): boolean {
  if (typeof window === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
}

/** Duda reports editor/preview explicitly when that surface is available. */
function dudaEnvironment(): string {
  try {
    const dm = (window as unknown as { dmAPI?: { getCurrentEnvironment?: () => string } }).dmAPI;
    const value = dm?.getCurrentEnvironment?.();
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

/** `/storage-units` + `california/bellflower/…`, without a double or missing slash. */
function joinPath(base: string, slug: string): string {
  const b = (base || '').replace(/\/+$/, '');
  const s = (slug || '').replace(/^\/+/, '');
  if (!s) return b || '/';
  const prefixed = b.startsWith('/') || !b ? b : `/${b}`;
  return `${prefixed}/${s}`;
}

/** `10326 Foster Rd., Bellflower, CA 90706` from the Address object. */
function addressLine(addr: Record<string, unknown>): string {
  const street = str(addr.address).replace(/,\s*$/, '').trim();
  const city = str(addr.city).trim();
  const state = str(addr.state).trim();
  const zip = str(addr.zip).trim();
  const tail = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [street, tail].filter(Boolean).join(', ');
}

function amenityNames(row: CollectionRow): string[] {
  const raw = row.amenities;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => (a && typeof a === 'object' ? plainText((a as Record<string, unknown>).name) : plainText(a)))
    .map(keyOf)
    .filter(Boolean);
}

function toFacility(row: CollectionRow, basePath: string): Facility | null {
  const addr = row.Address;
  if (!addr || typeof addr !== 'object' || Array.isArray(addr)) return null;
  const a = addr as Record<string, unknown>;
  const id = str(row.id).trim();
  const name = str(row.name).trim();
  const state = str(a.state).trim().toUpperCase();
  const slug = str(row.slug).trim();
  const line = addressLine(a);
  if (!id || !name || !state || !slug || !line) return null;
  return { id, name, line, state, href: joinPath(basePath, slug) };
}

/** Groups in a stable order: state name A→Z, facilities by name within each. */
function groupByState(facilities: Facility[]): Array<[string, Facility[]]> {
  const groups = new Map<string, Facility[]>();
  for (const f of facilities) {
    const label = STATE_NAMES[f.state] ?? f.state;
    const list = groups.get(label);
    if (list) list.push(f);
    else groups.set(label, [f]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'en'))
    .map(([label, list]) => [
      label,
      [...list].sort((x, y) => x.name.localeCompare(y.name, 'en', { numeric: true, sensitivity: 'base' })),
    ] as [string, Facility[]]);
}

export function StorageTypeLocations({
  storageTypeSlug = '',
  amenityName = '',
  propertyIds = '',
  heading,
  subheadingEmphasis = '',
  subheading = 'Available at the following locations.',
  locationBasePath = '/storage-units',
  collectionName,
  featureCollectionName = 'featurePage',
  inEditor,
}: StorageTypeLocationsProps) {
  const [result, setResult] = useState<Result>({ status: 'loading' });
   // Duda sends unfilled text fields as null. Parameter defaults only handle
  // undefined, so normalize at the external-data boundary before using them.
  const resolvedSlug = plainText(storageTypeSlug).trim().toLowerCase() || slugFromLocation();
  const resolvedSubheading = plainText(subheading).trim()
    || 'Available at the following locations.';
  const explicitEmphasis = plainText(subheadingEmphasis).trim();
  // Figma treats the opening question as a bold lead-in. Preserve the simple
  // one-field authoring path by recognizing that structure automatically,
  // while allowing an explicit lead-in when the copy has no question mark.
  const questionEnd = resolvedSubheading.indexOf('?');
  const inferredEmphasis = questionEnd >= 0
    ? resolvedSubheading.slice(0, questionEnd + 1).trim()
    : '';
  const emphasizedCopy = explicitEmphasis || inferredEmphasis;
  const regularCopy = emphasizedCopy && resolvedSubheading.startsWith(emphasizedCopy)
    ? resolvedSubheading.slice(emphasizedCopy.length).trim()
    : resolvedSubheading;

  useEffect(() => {
    let cancelled = false;
    const tag = `[#19 storage-type-locations${resolvedSlug ? ` ${resolvedSlug}` : ''}]`;
    const environment = dudaEnvironment();

    // Preview data is allowed only in an explicitly identified non-live runtime.
    // Do NOT use `!hasCollectionsApi()` as a general gate: dmAPI is injected late
    // on published pages, and that synchronous check would leak demo facilities
    // into production before readCollection's poll had a chance to run.
    const explicitPreview = boolProp(inEditor) || (!!environment && environment !== 'live');
    const localPreview = isLocalHarness() && !hasCollectionsApi();
    const showDiagnostic = explicitPreview || localPreview;

    if (showDiagnostic) {
      setResult({ status: 'preview', facilities: PREVIEW });
      return;
    }

    setResult({ status: 'loading' });

    Promise.all([
      readInternalPropertiesResult(collectionName),
      readFeatureMapping(featureCollectionName, resolvedSlug),
    ])
      .then(([read, featureMapping]) => {
        if (cancelled) return;

        if (read.status !== 'ok') {
          console.error(`${tag} could not read PropertiesInternal: ${read.detail}`);
          setResult({ status: 'error', detail: 'We could not load locations just now.', showDiagnostic });
          return;
        }
        if (!read.rows.length) {
          console.error(`${tag} PropertiesInternal is empty or missing`);
          setResult({ status: 'error', detail: 'This locations section is not configured yet.', showDiagnostic });
          return;
        }

        const usable = propertyLikeRows(read.rows);
        if (!usable.length) {
          console.error(`${tag} PropertiesInternal has no complete property rows`);
          setResult({ status: 'error', detail: 'This locations section is not configured yet.', showDiagnostic });
          return;
        }

        let wanted = keyOf(amenityName) || featureMapping?.amenityName || '';
        const ids = idSet(propertyIds);
        if (!ids.size && featureMapping?.propertyIds.size) {
          for (const id of featureMapping.propertyIds) ids.add(id);
        }

        // Inference is deliberately evidence-based: only accept a key derived
        // from the page slug when that key actually exists in the live rows.
        // `business-storage` → `business` works; `wash-bay` never guesses
        // `washrack`, so that exceptional mapping belongs in featurePage.
        if (!wanted && !ids.size) {
          const availableAmenities = new Set(usable.flatMap(amenityNames));
          wanted = candidateKeys(resolvedSlug).find((key) => availableAmenities.has(key)) || '';
        }

        if (!wanted && !ids.size) {
          console.error(`${tag} could not infer an amenity and featurePage has no amenity_name/property_ids mapping`);
          setResult({ status: 'error', detail: 'This section is not configured yet.', showDiagnostic });
          return;
        }

        if (!ids.size && !usable.some((row) => Array.isArray(row.amenities))) {
          console.error(`${tag} PropertiesInternal has no usable amenities column`);
          setResult({ status: 'error', detail: 'This storage type is not configured for locations yet.', showDiagnostic });
          return;
        }

        let hasInvalidConfiguredRow = false;
        if (ids.size) {
          const availableIds = new Set(usable.map((row) => str(row.id).trim()));
          const missing = [...ids].filter((id) => !availableIds.has(id));
          if (missing.length) {
            console.error(`${tag} propertyIds not found in PropertiesInternal: ${missing.join(', ')}`);
            hasInvalidConfiguredRow = true;
          }
        }

        const matched = usable.filter((row) => {
          if (ids.size) return ids.has(str(row.id).trim());
          return amenityNames(row).includes(wanted);
        });
        const converted = matched.map((row) => toFacility(row, locationBasePath));
        if (converted.some((facility) => facility === null)) {
          const invalid = matched
            .filter((_, index) => converted[index] === null)
            .map((row) => str(row.id) || '(unknown)');
          console.error(`${tag} matching rows are missing a name, address, state, or slug: ${invalid.join(', ')}`);
          hasInvalidConfiguredRow = true;
        }
        const facilities = converted.filter((facility): facility is Facility => facility !== null);
        if (!facilities.length && hasInvalidConfiguredRow) {
          setResult({
            status: 'error',
            detail: 'No valid configured locations could be displayed.',
            showDiagnostic,
          });
          return;
        }
        setResult({ status: 'ok', facilities });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`${tag} could not read the facilities collection:`, detail);
        setResult({ status: 'error', detail: 'We could not load locations just now.', showDiagnostic });
      });

    return () => { cancelled = true; };
  }, [resolvedSlug, amenityName, propertyIds, locationBasePath, collectionName, featureCollectionName, inEditor]);

  if (result.status === 'loading') return null;

  if (result.status === 'error') {
    if (!result.showDiagnostic) return null;
    return (
      <section className="stl stl--error" role="alert">
        <AlertIcon className="stl-error-icon" size={24} />
        <p className="stl-error">{result.detail}</p>
      </section>
    );
  }

  // A feature no facility offers renders nothing at all — an empty heading over
  // an empty list is what the legacy site does, and it reads as broken.
  if (!result.facilities.length) return null;

  const title = heading || `Find ${resolvedSlug.replace(/-/g, ' ') || 'storage'} near you`;

  return (
    <section className="stl">
      <h2 className="stl-heading">{title}</h2>
      <p className="stl-sub">
        {emphasizedCopy ? <strong className="stl-sub-emphasis">{emphasizedCopy}</strong> : null}
        {emphasizedCopy && regularCopy ? ' ' : null}
        {regularCopy}
      </p>
      {groupByState(result.facilities).map(([state, list]) => (
        <div className="stl-group" key={state}>
          <h3 className="stl-state">{state}</h3>
          <ul className="stl-list">
            {list.map((f) => (
              <li className="stl-item" key={f.id}>
                <MapPinSolidIcon className="stl-pin" size={24} />
                <a className="stl-link" href={f.href}>{`${f.name}, ${f.line}`}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
