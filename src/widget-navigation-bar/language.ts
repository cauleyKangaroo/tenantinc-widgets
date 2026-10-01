// ===========================================================================
// The language selector's URL rules.
//
// Spanish lives under a /es path prefix on the SAME site — currentsite.com/about
// becomes currentsite.com/es/about — which is how Duda's multilingual sites are
// laid out. So switching language is a pure path transform, and it is kept here
// rather than inline in the bar because getting it slightly wrong sends people
// to a 404 on every page of the site at once.
// ===========================================================================

export type Lang = 'en' | 'es';

/** The prefix Spanish pages sit under. One place, used by every rule below. */
export const ES_PREFIX = 'es';

/**
 * Split a pathname into its segments, dropping the empties that leading and
 * trailing slashes produce. '/es/about/' -> ['es', 'about'].
 */
function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/**
 * Which language the given path is already in.
 *
 * Matches the WHOLE first segment, never a prefix of it: '/estimate' and
 * '/espanol-guide' start with the letters "es" but are English pages, and
 * treating them as Spanish would strip four characters off the URL and 404.
 */
export function langFromPath(pathname: string): Lang {
  return segments(pathname)[0]?.toLowerCase() === ES_PREFIX ? 'es' : 'en';
}

/**
 * The same page in the requested language.
 *
 *   en  /es        -> /
 *   en  /es/about  -> /about
 *   es  /          -> /es
 *   es  /about     -> /es/about
 *
 * Already in the target language, the path is returned unchanged rather than
 * gaining a second prefix ('/es/es/about').
 *
 * `search` and `hash` are carried across untouched: a filtered or anchored page
 * should stay filtered and anchored when the visitor switches language, and
 * dropping them would silently reset whatever they were looking at.
 */
export function pathForLang(lang: Lang, pathname: string, search = '', hash = ''): string {
  const segs = segments(pathname);
  const isEs = segs[0]?.toLowerCase() === ES_PREFIX;

  let next: string[];
  if (lang === 'es') {
    next = isEs ? segs : [ES_PREFIX, ...segs];
  } else {
    next = isEs ? segs.slice(1) : segs;
  }

  // A trailing slash on the original is preserved, so a site that canonicalises
  // one way is not sent to the other and made to redirect on every switch.
  const trailing = pathname.length > 1 && pathname.endsWith('/') && next.length ? '/' : '';
  return `/${next.join('/')}${trailing}${search}${hash}`;
}

/**
 * The href for a language option, read off the CURRENT location.
 *
 * Falls back to the bare '/' or '/es' root if there is no location to read —
 * the widget is mounted client-side so this is really only the harness's
 * server-render path, but a thrown error here would take the whole bar down.
 */
export function hrefForLang(lang: Lang): string {
  try {
    const { pathname, search, hash } = window.location;
    return pathForLang(lang, pathname, search, hash);
  } catch {
    return lang === 'es' ? `/${ES_PREFIX}` : '/';
  }
}

/** Which language the visitor is currently on, from the address bar. */
export function currentLang(): Lang {
  try {
    return langFromPath(window.location.pathname);
  } catch {
    return 'en';
  }
}
