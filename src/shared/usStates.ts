// ===========================================================================
// US state name <-> two-letter code.
//
// Needed because the two sources of truth disagree in shape: a property's
// `Address.state` is the CODE ("CA"), while its `slug` — and therefore the page
// URL the nav links to — uses the full NAME ("california"). Anything matching a
// `/locations/{state}` URL against property data has to bridge the two.
//
// Comparison is done on a normalised key (lowercase, letters only), so
// "New York", "new-york" and "NEWYORK" are the same thing.
// ===========================================================================

/** Lowercase, letters only: "New York" / "new-york" → "newyork". */
export function stateKey(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z]/g, '');
}

const CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico',
};

/** Built once — the reverse lookup, keyed on the normalised name. */
const NAME_TO_CODE: Record<string, string> = Object.entries(CODE_TO_NAME)
  .reduce((acc, [code, name]) => {
    acc[stateKey(name)] = code;
    return acc;
  }, {} as Record<string, string>);

/** "CA" → "California". Unknown or already-spelled-out input passes through. */
export function stateNameFromCode(code: string): string {
  return CODE_TO_NAME[code.trim().toUpperCase()] ?? code.trim();
}

/** "california" / "New York" → "CA" / "NY". '' when unrecognised. */
export function stateCodeFromName(name: string): string {
  return NAME_TO_CODE[stateKey(name)] ?? '';
}

/**
 * Do these two refer to the same state, whichever form each is in?
 * Handles code-vs-code, name-vs-name and code-vs-name in either direction.
 */
export function sameState(a: string, b: string): boolean {
  if (!a || !b) return false;
  const norm = (v: string) => {
    const k = stateKey(v);
    // A two-letter input is a code; expand it so both sides compare as names.
    if (k.length === 2 && CODE_TO_NAME[k.toUpperCase()]) return stateKey(CODE_TO_NAME[k.toUpperCase()]);
    return k;
  };
  return norm(a) === norm(b);
}
