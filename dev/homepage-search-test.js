const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { JSDOM } = require('jsdom');

function load(path, context, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { ...context, exports, require: name => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import ${name}`);
  } });
  return exports;
}
async function main() {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/' });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const context = { window: dom.window, document: dom.window.document, console, Date, URL, URLSearchParams, AbortController, setTimeout, clearTimeout };
  const helpers = load('../src/widget-homepage-search/searchResults.ts', context);
  const city = (label, href = `/${label}`) => ({ label, href, haystack: `${label} 12345 main street`.toLowerCase() });
  assert.deepEqual(Array.from(helpers.matchingCities([city('Zulu'), city('Alpha')], '12345'), row => row.label), ['Alpha', 'Zulu']);
  assert.equal(helpers.matchingCities(Array.from({ length: 160 }, (_, i) => city(`City ${i}`)), '').length, 160);
  const near = helpers.nearbyCities([
    { target: city('Zulu'), lat: 0, lng: 0.1 }, { target: city('Alpha'), lat: 0, lng: 1 },
    { target: city('Zulu'), lat: 0, lng: 0.2 }, { target: city('Far'), lat: 0, lng: 4 },
    { target: city('Bravo'), lat: 0, lng: 1.5 }, { target: city('Charlie'), lat: 0, lng: 2 },
    { target: city('Delta'), lat: 0, lng: 2.5 },
  ], 0, 0);
  assert.deepEqual(Array.from(near, row => row.label), ['Zulu', 'Alpha', 'Bravo', 'Charlie'], 'closest four unique cities displayed nearest-first');
  assert.ok(near.every(row => row.distanceMiles <= 200));
  assert.ok(Math.abs(helpers.milesBetween(0, 0, 0, 1) - 69.09) < 0.1);
  let pages = [];
  dom.window.dmAPI = { loadCollectionsAPI: async () => ({ data: (_, opts) => ({ get: async () => {
    const page = opts?.pageNumber || 0; pages.push(page);
    return { values: Array.from({ length: page === 0 ? 100 : 60 }, (_, i) => ({ id: String(page * 100 + i) })), page: { pageSize: 100, totalPages: 2 } };
  } }) }) };
  const collections = load('../src/shared/dudaCollections.ts', context, { './withTimeout': { withTimeout: promise => promise, TIMEOUTS: { collection: 8000 } } });
  const paged = await collections.readCollectionPaged('Properties');
  assert.equal(paged.complete, true); assert.equal(paged.rows.length, 160); assert.deepEqual(pages, [0, 1]);
  // An API ignoring pageNumber must not advertise its partial list as complete.
  dom.window.dmAPI.loadCollectionsAPI = async () => ({ data: () => ({ get: async () => ({ values: [{ id: 'same' }], page: { pageSize: 100, totalPages: 2 } }) }) });
  assert.equal((await collections.readCollectionPaged('Properties')).complete, false);

  let internalResult = { status: 'ok', complete: true, rows: [{ id: '1', name: 'Facility', slug: 'california/irvine/facility-1', Address: { city: 'Irvine' } }] };
  let internalReads = 0;
  const nav = load('../src/shared/propertyNav.ts', context, {
    './dudaCollections': { ...collections, hasCollectionsApi: () => true, logSource: () => {}, readCollectionPaged: () => { throw new Error('Internal collection must use its normalized reader'); } },
    './propertiesSource': { PROPERTIES_COLLECTION: 'Properties' },
    './internalProperties': { INTERNAL_PROPERTIES_COLLECTION: 'PropertiesInternal', readInternalPropertiesResult: async () => { internalReads++; return internalResult; } },
    './propertyContact': { formatPhone: value => value },
  });
  const internalTree = await nav.fetchLocationTree('test', { collectionName: 'PropertiesInternal', readAllPages: true });
  assert.equal(internalReads, 1, 'paged internal inventory uses the normalized reader');
  assert.equal(internalTree[0].cities[0].properties[0].label, 'Facility');
  internalResult = { ...internalResult, complete: false };
  await assert.rejects(nav.fetchLocationTree('test', { collectionName: 'PropertiesInternal', readAllPages: true }), /fully loaded/, 'incomplete internal inventory is rejected');

  let denied = false;
  let resolveInventory;
  let queryCalls = 0;
  let resolveOld;
  let browseCalls = 0;
  let locationSuccess;
  const navigations = [];
  const widgetWindow = {
    location: { origin: 'https://example.test', hostname: 'example.test', pathname: '/', assign: url => navigations.push(url) },
    localStorage: dom.window.localStorage, innerHeight: 900,
    setTimeout: dom.window.setTimeout.bind(dom.window), clearTimeout: dom.window.clearTimeout.bind(dom.window),
    addEventListener: dom.window.addEventListener.bind(dom.window), removeEventListener: dom.window.removeEventListener.bind(dom.window),
  };
  const Icon = () => null;
  const widgetNavigator = { geolocation: { getCurrentPosition: success => { locationSuccess = success; } } };
  const component = load('../src/widget-homepage-search/HomepageSearch.tsx', { ...context, window: widgetWindow, navigator: widgetNavigator, __HB_DEV_HARNESS__: false }, {
    react: React, './HomepageSearch.css': {}, './searchResults': helpers,
    './useLocationPermission': { useLocationPermission: () => [denied, value => { denied = value; }] },
    '@shared/propertyNav': { fetchLocationTree: (_, opts) => { assert.equal(opts.readAllPages, true); return new Promise(resolve => { resolveInventory = resolve; }); } },
    '@shared/ui/icons': { MapPinSolidIcon: Icon, MapPinIcon: Icon, SearchIcon: Icon },
    '@shared/findStorageBus': { openFindStorage: () => { browseCalls++; return true; } },
    '@shared/placesApi': {
      newSessionToken: () => 'test-token',
      fetchPlaceSuggestions: async query => {
        queryCalls++;
        if (query === 'Failure') throw new Error('offline');
        if (query === 'Old City') return new Promise(resolve => { resolveOld = resolve; });
        return [{ placeId: query, mainText: query === 'San' ? 'San Francisco' : query, description: query === 'San' ? 'San Francisco, CA, USA' : query }];
      },
      fetchPlaceDetails: async id => ({ lat: 0, lng: id === 'Far City' ? 180 : 0, address: { city: id } }),
    },
  }).HomepageSearch;
  const root = createRoot(document.getElementById('root'));
  const render = (props = {}) => React.act(async () => root.render(React.createElement(component, props)));
  await render();
  const input = () => document.querySelector('.hs-input');
  const rows = () => [...document.querySelectorAll('.hs-suggestion[role="option"]')];
  const change = value => React.act(async () => Simulate.change(input(), { target: { value } }));
  const findHref = () => document.querySelector('.hs-find').getAttribute('href');
  const settle = () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 440)); });
  await React.act(async () => Simulate.focus(input()));
  assert.match(document.body.textContent, /Searching/);
  const cities = Array.from({ length: 160 }, (_, i) => ({ label: `City ${String(i).padStart(3, '0')}`, key: `city-${i}`, href: `/locations/state/city-${i}`, properties: [{ label: `Facility ${i}`, href: `/storage-units/state/city-${i}/facility`, vacantUnitTypes: i === 0 ? ['parking'] : ['storage'], lat: 0, lng: i < 4 ? (i + 1) / 10 : 100, zip: '12345', address: '', street: '' }] }));
  await React.act(async () => resolveInventory([{ label: 'State', key: 'state', href: '/locations/state', cities: cities.reverse() }]));
  assert.equal(rows().length, 160); assert.match(document.body.textContent, /Our Locations \(160\)/);
  assert.equal(document.querySelector('.hs-current-location').closest('[role="listbox"]'), null, 'Current Location is outside the city listbox');
  assert.match(rows()[0].textContent, /City 000/);
  assert.doesNotMatch(document.body.textContent, /Search History/);
  await React.act(async () => Simulate.click(document.querySelector('.hs-current-location')));
  await React.act(async () => locationSuccess({ coords: { latitude: 0, longitude: 180 } }));
  assert.equal(navigations.length, 0, 'Current Location does not send someone beyond 200 miles');
  assert.match(document.body.textContent, /No locations within 200 miles/);
  assert.equal(findHref(), '/locations', 'empty Search link matches its click destination');
  await React.act(async () => Simulate.click(document.querySelector('.hs-find')));
  assert.equal(navigations.at(-1), '/locations', 'empty Search opens all locations, not the first city');
  await change('   ');
  await React.act(async () => Simulate.keyDown(input(), { key: 'Enter' }));
  assert.equal(navigations.at(-1), '/locations', 'whitespace-only Enter opens all locations');
  await change('');
  await React.act(async () => Simulate.keyDown(input(), { key: 'ArrowDown' }));
  await React.act(async () => Simulate.keyDown(input(), { key: 'ArrowDown' }));
  await React.act(async () => Simulate.keyDown(input(), { key: 'Enter' }));
  assert.equal(navigations.at(-1), '/storage-units/state/city-1/facility', 'empty-box Enter respects an explicitly highlighted city');
  await change('City');
  await React.act(async () => Simulate.keyDown(input(), { key: 'ArrowDown' }));
  await React.act(async () => Simulate.keyDown(input(), { key: 'ArrowDown' }));
  await React.act(async () => Simulate.keyDown(input(), { key: 'Enter' }));
  assert.equal(navigations.at(-1), '/storage-units/state/city-1/facility', 'Enter respects keyboard selection');
  denied = true; await render(); await change('');
  assert.equal(document.querySelector('.hs-current-location'), null);
  assert.equal(rows().length, 160);
  await change('San'); await settle();
  assert.equal(rows().length, 0, 'partial prediction does not resolve to an arbitrary city');
  await change('Nearby City'); await settle();
  assert.equal(rows().length, 4); assert.equal(document.querySelectorAll('.hs-distance').length, 4);
  const distances = [...document.querySelectorAll('.hs-distance')].map(badge => parseInt(badge.textContent, 10));
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b), 'nearby rows display nearest-first');
  assert.equal(findHref(), '/storage-units/state/city-0/facility', 'nearby Search link matches its click destination');
  await React.act(async () => Simulate.click(document.querySelector('.hs-find')));
  assert.equal(navigations.at(-1), '/storage-units/state/city-0/facility', 'nearby Search chooses the nearest city');
  const before = navigations.length;
  await change('Far City'); await settle();
  assert.match(document.body.textContent, /No Facilities Found/);
  assert.equal(findHref(), '/locations', 'no-results Search link matches its click destination');
  await React.act(async () => Simulate.click(document.querySelector('.hs-find')));
  assert.equal(navigations.length, before + 1, 'no-results search button navigates');
  assert.equal(navigations.at(-1), '/locations');
  await React.act(async () => Simulate.keyDown(document.querySelector('.hs-input'), { key: 'Enter' }));
  assert.equal(navigations.length, before + 2, 'no-results Enter navigates');
  assert.equal(navigations.at(-1), '/locations');
  const viewMap = [...document.querySelectorAll('a')].find(link => link.textContent === 'View Map');
  assert.ok(viewMap, 'no results offers View Map without Duda configuration');
  assert.equal(viewMap.getAttribute('href'), '/locations');
  assert.ok(viewMap.classList.contains('hs-map-link'), 'map footer has dedicated centered styling');
  assert.ok(viewMap.querySelector('svg[aria-hidden="true"]'), 'map footer includes a decorative map icon');
  assert.equal(viewMap.closest('[role="listbox"]'), null, 'View Map is outside the city listbox');
  assert.equal(document.querySelector('.hs-search-empty').closest('[role="listbox"]'), null, 'empty status is outside the city listbox');
  assert.equal(browseCalls, 0);
  await change('Old City'); await settle(); await change('City 003');
  await React.act(async () => { resolveOld([{ placeId: 'Old City', mainText: 'Old City', description: 'Old City' }]); });
  assert.equal(rows().length, 1); assert.match(rows()[0].textContent, /City 003/, 'late lookup cannot replace current results');
  await change('Failure'); await settle();
  assert.match(document.body.textContent, /temporarily unavailable/);
  assert.equal(findHref(), null, 'service errors leave the Search link without a destination');
  const beforeFailureSubmit = navigations.length;
  await React.act(async () => Simulate.click(document.querySelector('.hs-find')));
  assert.equal(navigations.length, beforeFailureSubmit, 'service errors are not treated as empty results');
  await change('');
  await React.act(async () => Simulate.click(document.querySelector('.hs-type-trigger')));
  await React.act(async () => Simulate.click([...document.querySelectorAll('.hs-type-option')].find(button => button.textContent === 'Parking')));
  await React.act(async () => Simulate.focus(input()));
  assert.equal(rows().length, 1);
  assert.match(document.body.textContent, /Our Locations \(1\)/, 'count follows Storage Type filter');
  await change('City 000');
  await React.act(async () => Simulate.click(document.querySelector('.hs-find')));
  assert.equal(navigations.at(-1), '/storage-units/state/city-0/facility?sl_types=parking');
  assert.ok(queryCalls >= 4);
  await change('');
  await render({ locationsUrl: '/all-locations/' });
  await React.act(async () => Simulate.keyDown(input(), { key: 'Enter' }));
  assert.equal(navigations.at(-1), '/all-locations', 'empty fallback respects the configured locations path');
  delete widgetNavigator.geolocation;
  denied = false; await render({ locationsUrl: '/all-locations' });
  await React.act(async () => Simulate.focus(input()));
  await React.act(async () => Simulate.click(document.querySelector('.hs-current-location')));
  assert.match(document.body.textContent, /Your location could not be found/, 'missing geolocation explains why Current Location did nothing');
  await React.act(async () => root.unmount()); dom.window.close();
  console.log('Homepage search tests passed: pagination, alphabetical city matches, nearest-first nearby results, empty-search fallback, keyboard selection, link/click agreement, missing geolocation, denial, stale responses, failure states.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
