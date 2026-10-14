// ===========================================================================
// Widget #19 — My Account
//
// The signed-in account screen. THREE panels over the same data, sharing one
// slot; the greeting, promo and sidebar stay put and only the middle panel
// swaps. The Payment Activity accordion belongs to the BILL PAY panel and
// appears only there:
//
//   'account'  Figma 8815-115354 "Account Info - Display"  — THE DEFAULT.
//              Promo sells autopay; the panel shows contacts and documents.
//              "Pay Now" → 'payment'.  "Edit" → 'edit'.
//   'payment'  Figma 9030-31458  "Screen after Login (1 Space)".
//              Promo sells supplies; the panel takes the payment.
//   'edit'     Figma 8815-115876. The account/mailing/alternate form.
//              Cancel and Save both return to 'account'.
//
// Every route back to 'account' goes through one place — a unit's "Account
// Info" button, Cancel, Save, or picking a different unit — so there is no
// screen you can reach and not get out of.
//
// SELECTION: whichever sidebar unit is picked rings itself in the frame's
// Primary/Notifications orange and opens its details on the left. The frames
// draw one property; the code carries a list of properties, each holding a
// list of units, so more of either works.
//
// SCOPE: both frames also contain the site nav and footer. Those are #02 and
// #13 and are deliberately NOT reproduced — a Duda page composes them around
// this widget, as it does for every other page-level widget.
//
// EVERYTHING IS STATIC. `data.ts` holds both frames' sample content; there is
// no account API behind this yet. That is why the numbers do not reconcile —
// they are the designer's placeholders, reproduced as drawn rather than
// quietly rationalised. See the note at the top of data.ts.
//
// Every class is `ma-`. Each widget is its own AMD bundle and cannot reach
// another's stylesheet, but they DO share the page, where a class name is
// global — #18's header comment records what happened when two widgets shared
// a prefix.
// ===========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MyAccount.css';
import { Button } from '@shared/ui';
import { AccountInfoPanel } from './AccountInfoPanel';
import { EditPanel } from './EditPanel';
import { MakePaymentPanel, type CoverageHandlers, type PaymentHandlers } from './MakePaymentPanel';
import type { PaymentOutcome } from './PaymentResult';
import { PaymentActivity } from './PaymentActivity';
import { PropertyCard } from './PropertyCard';
import { readSession, clearSession } from '@shared/accountSession';
import { readInternalProperties } from '@shared/internalProperties';
import { normaliseBasePath, parseSlug } from '@shared/propertyNav';
import { str } from '@shared/dudaCollections';
import { fetchPropertyContact, type PropertyContact } from '@shared/propertyContact';
import {
  fetchMe, fetchContact, updateContact, fetchDocumentFile, saveBlob, loginApiReady,
  type LoginApiConfig, type AccountRecord,
  fetchLeaseCoverage, previewCoverage, applyCoverage,
  payLease,
} from '@shared/accountApi';
import {
  editFormFrom, updateFromEditForm,
  primaryContactFrom, alternateContactFrom,
} from './contactMapping';
import { spacesFrom, propertiesFrom, activityFrom, savedCardsFrom } from './leaseMapping';
import { mergeApiCreds, type ApiCredProps } from '@shared/apiConfig';
import { resolveCompanyIdFromSources } from '@shared/companySource';
import { fetchGatewayInfo } from '@shared/paymentGateway';
import type { AccountDocument, EditForm } from './data';
import { PAYMENT_ACTIVITY, PROMO_AUTOPAY, PROMO_SUPPLIES, PROPERTIES, SPACES, USER } from './data';
import { SubmenuIcon } from './icons';
import { AccountSheet } from './AccountSheet';

/** The three panels that share the middle slot. */
export type View = 'account' | 'payment' | 'edit';

export interface MyAccountProps {
  /**
   * First name for the greeting — "Hi {name},". Defaults to the frames' own
   * sample so the widget renders as designed with no props at all.
   */
  userName?: string;
  /** Shown opposite the greeting: "You're logged in as {email}". */
  userEmail?: string;
  /**
   * Where "Log out" goes. Defaults to the login page.
   *
   * There IS a session to end now: the button clears it before navigating, so
   * the next visit cannot walk back in on a token still sitting in storage.
   */
  logOutUrl?: string;
  /** Content-panel overrides for the promo card. Blank falls back. */
  promoTitle?: string;
  promoBody?: string;
  promoCta?: string;
  /** Where the promo's button goes. Omitted → a button that does nothing yet. */
  promoUrl?: string;
  /**
   * Where the harness and the Duda editor open; the DEFAULT is the account
   * view. A signed-in customer always lands on Make a Payment (see the view
   * state), and `?view=` on the URL overrides both.
   */
  initialView?: View;
  /**
   * With initialView 'payment': open on a payment result banner instead of
   * the bare form. Harness only — on a site the result comes from paying.
   */
  initialPaymentResult?: PaymentOutcome;
  /**
   * My Account proxy base, from the Duda JS tab's `login_api_base` site text —
   * the SAME value #17 is given.
   */
  login_api_base?: string;
  /** Duda's `data.siteId` — the proxy identifies the caller by it. */
  siteId?: string;
  /**
   * Where the Duda dynamic property pages live — the same `locationBasePath`
   * the navigation bar (#02) prefixes its "Find Storage" links with, so "+ Add
   * a Space" lands on the same page the nav would. Default matches #02.
   */
  locationBasePath?: string;
  /**
   * Hummingbird credentials from the site texts (api_domain / app_id /
   * api_key) and the company id — the SAME values the rental flow's JS tab
   * passes. Needed for one thing here: asking which card gateway a property
   * uses and its Global Payments public key, so Make a Payment can mount the
   * hosted card fields. Without them there is no card option online.
   */
  api_domain?: unknown;
  app_id?: unknown;
  api_key?: unknown;
  companyId?: string;
  /** The GP public key directly, overriding the gateway lookup. */
  gpPublicKey?: string;
  /**
   * Duda's `data.inEditor`. The page is INERT in the editor: no request, no
   * redirect, and the sample content renders so the layout can be worked on
   * without a session.
   */
  inEditor?: boolean;
  /** Where a signed-out visitor is sent. */
  loginUrl?: string;
}

/** A Duda text field arrives as '' until the editor types, which a default
 *  parameter will not catch — so fall back on the trimmed value, not on
 *  `undefined`. Same helper shape as #05's junk-fee copy. */
const orElse = (v: string | undefined, fallback: string) => (v?.trim() ? v.trim() : fallback);

export function MyAccount({
  userName,
  userEmail,
  logOutUrl,
  promoTitle,
  promoBody,
  promoCta,
  promoUrl,
  initialView = 'account',
  initialPaymentResult,
  login_api_base = '',
  siteId = '',
  locationBasePath = '/storage-units',
  api_domain, app_id, api_key, companyId: companyIdProp, gpPublicKey: gpPublicKeyProp,
  inEditor = false,
  loginUrl = '/login',
}: MyAccountProps) {

  const api: LoginApiConfig = useMemo(
    () => ({ baseUrl: login_api_base.trim(), siteId: siteId.trim() }),
    [login_api_base, siteId],
  );
  /*
   * Whether this page is really gated.
   *
   * Not in the Duda editor: there is no session there, so gating would bounce
   * an editor to /login the moment they opened the page they are building.
   * Unconfigured is the same — the harness and any site without the site text
   * keep rendering the sample content, exactly as before.
   */
  const gated = loginApiReady(api) && !inEditor;
  // Declared AFTER `gated`, which its initialiser reads — the same temporal
  // dead zone that once stopped this widget mounting (see `space` below).
  /*
   * A SIGNED-IN customer lands on Make a Payment, with the first property's
   * first space selected and ticked — paying is what the page is for, and
   * Account Info is one click away on every unit card. The content-menu
   * `initialView` still decides where the harness and the Duda editor open,
   * since there is no session there to pay from. `?view=account|payment|edit`
   * on the URL overrides either, so a link can open a particular screen.
   */
  const [view, setView] = useState<View>(() => {
    const fromUrl = (() => {
      try { return new URLSearchParams(window.location.search).get('view'); } catch { return null; }
    })();
    if (fromUrl === 'account' || fromUrl === 'payment' || fromUrl === 'edit') return fromUrl;
    return gated ? 'payment' : initialView;
  });

  const [session, setSession] = useState(() => (gated ? readSession() : null));
  /*
   * null = still deciding. Nothing of the account renders until the token has
   * been checked, so a signed-out visitor never sees a flash of someone's
   * account before the redirect.
   */
  const [authed, setAuthed] = useState<boolean | null>(gated ? null : true);

  const signOut = () => {
    clearSession();
    // The editor never navigates — same rule as #17.
    if (inEditor) return;
    // `logOutUrl` is the existing content field and still wins; `loginUrl` is
    // where a signed-out visitor goes by default, so they agree unless an
    // editor deliberately points logout somewhere else.
    window.location.href = (logOutUrl || '').trim() || loginUrl;
  };

  useEffect(() => {
    if (!gated) return undefined;

    // No token at all — nothing to check, and nothing to show.
    const live = readSession();
    if (!live) {
      window.location.href = loginUrl;
      return undefined;
    }

    let cancelled = false;
    /*
     * `me` is the cheap check — the proxy answers from the token itself with no
     * call upstream. Worth doing even though readSession() already rejected an
     * expired stamp: the SERVER is the authority. A token can be revoked, or
     * the clock can be wrong, and the local expiry would happily pass both.
     */
    void fetchMe(api, live.token).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setSession(live);
        setAuthed(true);
        return;
      }
      if (r.unauthorized) {
        // Dead token. Clear it, or the next visit retries the same bad one.
        clearSession();
        window.location.href = loginUrl;
        return;
      }
      /*
       * A network failure is NOT a sign-out. Bouncing to /login here would
       * throw away a perfectly good session because the wifi blinked, and the
       * reader would sign in again for no reason.
       */
      console.warn('[#19 my-account] token check failed:', r.detail ?? r.message);
      setSession(live);
      setAuthed(true);
    });

    return () => { cancelled = true; };
  }, [gated, api, loginUrl]);

  /*
   * The full contact record — what the Edit panel edits.
   *
   * Separate from the /me gate on purpose: /me is the cheap token check and
   * answers from the token alone, while this calls TenantInc. Gating on the
   * cheap one means a slow upstream delays the form, not the whole page.
   */
  const [record, setRecord] = useState<AccountRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  /* A document that would not download. Its own state, not `saveError`:
     that one belongs to the Edit panel, and a failed download surfacing
     later as a failed save was the confusion. */
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    if (!gated || authed !== true || !session) return undefined;
    let cancelled = false;
    void fetchContact(api, session.token).then((r) => {
      if (cancelled) return;
      if (r.ok) { setRecord(r.data); return; }
      if (r.unauthorized) {
        clearSession();
        window.location.href = loginUrl;
        return;
      }
      // The page still works without it — only the Edit panel loses its real
      // starting values, so this is a warning rather than a failure state.
      console.warn('[#19 my-account] contact load failed:', r.detail ?? r.message);
    });
    return () => { cancelled = true; };
  }, [gated, authed, session, api, loginUrl]);

  /*
   * Memoised per record so EditPanel's re-seed effect fires when the record
   * lands and NOT on every render of this component, which would reset a
   * half-finished edit under the reader.
   */
  const editInitial = useMemo(
    () => (record ? editFormFrom(record) : undefined),
    [record],
  );

  /*
   * The display panel's real content. Undefined until the record lands, which
   * is what keeps the frame's sample on screen in the harness and the editor.
   *
   * `alternate` is null — not undefined — when the account has none, so the
   * panel hides that block instead of falling back to the sample contact.
   */
  const realContact = useMemo(
    () => (record ? primaryContactFrom(record) : undefined),
    [record],
  );
  const realAlternate = useMemo(
    () => (record ? alternateContactFrom(record) : undefined),
    [record],
  );
  /*
   * THE SIGNED-IN CONTACT'S OWN UNITS.
   *
   * This page rendered `SPACES` from data.ts whatever account was open, so the
   * login picker changed who the page said you were and not a single unit,
   * balance or rent. Verified live: the three contacts behind one email hold 1,
   * 3 and 1 leases, and all three showed the same two invented units.
   *
   * The sample survives only where there is no record — the harness and the
   * Duda editor — so the layout can still be worked on without a session.
   */
  const spaces = useMemo(() => {
    if (!record) return SPACES;
    // SPACES[0] carries the frame's own contact; reuse it rather than export a
    // second copy of the same sample from data.ts.
    const fallback = SPACES[0]?.primaryContact ?? { name: '' };
    // siteId is Duda's own (data.siteId) and is what builds the site's
    // Media Manager artwork URLs for each unit — the same as the space cards.
    const mapped = spacesFrom(record, realContact ?? fallback, realAlternate ?? null, { siteId });
    /*
     * A contact with no leases gets an EMPTY list, not the sample. Someone who
     * has closed their last unit must not be shown a stranger's storage.
     */
    return mapped;
  }, [record, realContact, realAlternate, siteId]);

  /*
   * The property's name, address and phone for each sidebar card, from the
   * site's `Properties` collection. A lease carries only its unit's street
   * address — no property name, no phone — so the card read "333 Central Ave"
   * as its title and drew a phone icon beside nothing. One read per distinct
   * property, keyed by the unit's propertyId; fails soft to the lease's own
   * address where there is no dmAPI (editor, harness) or no matching row.
   */
  const [propertyContacts, setPropertyContacts] = useState<Record<string, PropertyContact>>({});
  useEffect(() => {
    if (!record) return undefined;
    const ids = Array.from(new Set(
      (Array.isArray(record.leases) ? (record.leases as Array<{ unit?: { propertyId?: unknown } }>) : [])
        .map((l) => String(l.unit?.propertyId ?? ''))
        .filter(Boolean),
    ));
    if (!ids.length) return undefined;
    let cancelled = false;
    void Promise.all(ids.map((id) => fetchPropertyContact('#19 my-account', id).catch(() => null)))
      .then((found) => {
        if (cancelled) return;
        const next: Record<string, PropertyContact> = {};
        found.forEach((c, i) => { if (c) next[ids[i]] = c; });
        setPropertyContacts(next);
      });
    return () => { cancelled = true; };
  }, [record]);


  const activityRows = useMemo(() => (record ? activityFrom(record) : []), [record]);

  /*
   * Coverage handlers for Make a Payment — only with a real session. Each
   * one carries the session token and treats a 401 the way every other read
   * here does: sign out, so a dead token never leaves the panel stuck.
   * Without a session (harness, editor) the panel keeps its static plans.
   */
  const coverageHandlers = useMemo<CoverageHandlers | undefined>(() => {
    // Not before the record: until it lands the panel is drawing the SAMPLE
    // spaces, and reading coverage for 'space-41' is two 404s on every visit.
    if (!gated || !session || !record) return undefined;
    const token = session.token;
    return {
      load: async (leaseId) => {
        const r = await fetchLeaseCoverage(api, token, leaseId);
        if (r.ok) return r.data;
        if (r.unauthorized) signOut();
        else console.warn('[MyAccount] coverage unavailable for lease', leaseId, r.detail ?? r.message);
        return null;
      },
      preview: async (leaseId, insuranceId) => {
        const r = await previewCoverage(api, token, leaseId, insuranceId);
        if (r.ok) return { ok: true, plan: r.data };
        if (r.unauthorized) signOut();
        return { ok: false, message: r.message };
      },
      apply: async (leaseId, insuranceId) => {
        const r = await applyCoverage(api, token, leaseId, insuranceId);
        if (r.ok) return { ok: true, coverage: r.data };
        if (r.unauthorized) signOut();
        return { ok: false, message: r.message };
      },
    };
    // signOut is stable for the life of the session; the token is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, session?.token, api, record]);

  /*
   * Which card gateway each of the record's properties uses, and its GP
   * public key. One lookup per distinct property, once the record is in.
   * '' means "answered, no key" (the facility takes no card online);
   * missing means not answered yet.
   */
  const creds = useMemo(() => mergeApiCreds({ api_domain, app_id, api_key }, { baseUrl: '', appId: '', apiKey: '' }), [api_domain, app_id, api_key]);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    resolveCompanyIdFromSources('#19 my-account', { companyId: companyIdProp }, '')
      .then((id) => { if (!cancelled) setResolvedCompanyId(id); })
      .catch(() => { if (!cancelled) setResolvedCompanyId(''); });
    return () => { cancelled = true; };
  }, [companyIdProp]);
  const [gatewayKeys, setGatewayKeys] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!record || gpPublicKeyProp) return undefined;
    if (!creds.baseUrl || !creds.appId || !creds.apiKey || !resolvedCompanyId) return undefined;
    const ids = Array.from(new Set(
      (Array.isArray(record.leases) ? (record.leases as Array<{ unit?: { propertyId?: unknown } }>) : [])
        .map((l) => String(l.unit?.propertyId ?? '')).filter(Boolean),
    ));
    let cancelled = false;
    for (const pid of ids) {
      void fetchGatewayInfo(creds, resolvedCompanyId, pid, '[MyAccount]').then((g) => {
        if (cancelled) return;
        setGatewayKeys((prev) => ({ ...prev, [pid]: g?.publicKey ?? '' }));
      });
    }
    return () => { cancelled = true; };
  }, [record, creds, resolvedCompanyId, gpPublicKeyProp]);


  const properties = useMemo(
    () => (record ? propertiesFrom(record, propertyContacts) : PROPERTIES),
    [record, propertyContacts],
  );

  /*
   * "+ Add a Space" goes to a PROPERTY LANDING PAGE — the first property in
   * the sidebar, i.e. the one the tenant already rents at — built exactly as
   * the navigation bar builds its "Find Storage" links: the property's `slug`
   * from PropertiesInternal under `locationBasePath` (/storage-units/
   * california/bellflower/storage-outlet-bellflower-340079517). A tenant with
   * no match (no dmAPI in the editor or harness, a property the collection
   * does not list, a slug that does not parse) gets the first property the
   * collection lists instead, and failing that the base path itself — never a
   * dead button.
   */
  const [addSpaceHref, setAddSpaceHref] = useState<string>(() => normaliseBasePath(locationBasePath) || '/');
  useEffect(() => {
    let cancelled = false;
    const base = normaliseBasePath(locationBasePath);
    const firstId = properties[0]?.id ?? '';
    void readInternalProperties()
      .then((rows) => {
        if (cancelled) return;
        const withSlug = rows.filter((r) => parseSlug(str(r.slug)));
        const row = withSlug.find((r) => str(r.id).trim() === firstId) ?? withSlug[0];
        setAddSpaceHref(row ? `${base}/${str(row.slug).trim()}` : (base || '/'));
      })
      .catch(() => { if (!cancelled) setAddSpaceHref(base || '/'); });
    return () => { cancelled = true; };
  }, [properties, locationBasePath]);

  /*
   * Documents are the SELECTED SPACE's own (AccountSpace.documents, one list per
   * lease from leaseMapping). There used to be one account-wide list here,
   * flattened across every lease and de-duplicated BY NAME — so with six
   * leases each carrying a "Superlease", only the first lease's survived and
   * that same file was shown, and downloaded, for every space picked. The
   * panel reads space.documents when no list is passed.
   */

  /*
   * Download a lease document.
   *
   * Fetched rather than linked: the endpoint authenticates on a header, which a
   * browser does not send when following an href. The file comes back as a blob
   * and is handed to the browser as a save.
   *
   * The ids come from the CURRENT record on every click, never cached — a
   * document's id changes when it is re-signed and re-uploaded (seen live: the
   * Superlease id changed overnight), so a stale one 404s.
   */
  const [busyDocument, setBusyDocument] = useState('');

  const openDocument = async (doc: AccountDocument) => {
    if (!session || !doc.leaseId || !doc.documentId || busyDocument) return;
    // By id, not name: a lease files the same notice many times over, and a
    // name would mark every one of them as opening.
    setBusyDocument(doc.documentId || doc.label);
    setDocumentError('');
    try {
      const r = await fetchDocumentFile(
        api, session.token, doc.leaseId, doc.documentId, doc.filename || doc.label,
      );
      if (r.ok) { saveBlob(r.data); return; }
      if (r.unauthorized) {
        clearSession();
        window.location.href = loginUrl;
        return;
      }
      console.warn('[#19 my-account] document fetch failed:', r.detail ?? r.message);
      setDocumentError(r.message);
    } finally {
      setBusyDocument('');
    }
  };

  const saveContact = async (form: EditForm): Promise<boolean> => {
    if (!session || !record) {
      // Nothing loaded: there are no ids to match on, so a PATCH would ADD
      // rows rather than edit them. Better to do nothing than to duplicate.
      setSaveError('Your account is still loading. Please try again in a moment.');
      return false;
    }
    setSaving(true);
    setSaveError('');
    try {
      const r = await updateContact(api, session.token, updateFromEditForm(form, record));
      if (r.ok) {
        // Re-read rather than trusting the echo: the server may normalise what
        // it stored, and the next edit must carry ITS ids, not ours.
        const fresh = await fetchContact(api, session.token);
        if (fresh.ok) setRecord(fresh.data);
        return true;
      }
      if (r.unauthorized) {
        clearSession();
        window.location.href = loginUrl;
        return false;
      }
      setSaveError(r.message);
      console.warn('[#19 my-account] contact update failed:', r.detail ?? r.message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  /*
   * Keep the selection on a unit that exists. It starts undefined and settles
   * on the first real one; switching account replaces the whole list, and a
   * stale id would leave the panel on a unit the new contact does not rent.
   *
   * DECLARED AFTER `selectedId`, which it reads. It sat above it at first and
   * threw "Cannot access 'selectedId' before initialization" from inside the
   * find callback — a temporal dead zone, on every render, so the widget never
   * mounted at all.
   */
  const space = spaces.find((s) => s.id === selectedId) ?? spaces[0];

  // Declared after `space` — see the note above `space` on the dead zone.
  /*
   * The real payment path for Make a Payment — only with a session and a
   * record. Posts one payment per lease (the panel splits them), and after a
   * success re-reads the account so balances, invoices and cards on file are
   * what the server now says.
   */
  const paymentHandlers = useMemo<PaymentHandlers | undefined>(() => {
    if (!gated || !session || !record || !space) return undefined;
    const token = session.token;
    const explicit = (gpPublicKeyProp ?? '').trim();
    const looked = gatewayKeys[space.propertyId];
    const canLookUp = !!(creds.baseUrl && creds.appId && creds.apiKey && resolvedCompanyId);
    return {
      gpPublicKey: explicit || (looked !== undefined ? looked : (canLookUp ? undefined : '')),
      gatewayPending: !explicit && looked === undefined && canLookUp,
      savedCards: savedCardsFrom(record).filter((c) => c.propertyId === space.propertyId),
      pay: async (leaseId, body, idempotencyKey) => {
        const r = await payLease(api, token, leaseId, body, idempotencyKey);
        if (r.ok) {
          void fetchContact(api, token).then((fresh) => { if (fresh.ok) setRecord(fresh.data); });
          return { ok: true, receipt: r.data };
        }
        if (r.unauthorized) signOut();
        return { ok: false, message: r.message };
      },
    };
    // signOut is stable for the life of the session; the token is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, session?.token, api, record, space, gatewayKeys, creds, resolvedCompanyId, gpPublicKeyProp]);
  const [activityOpen, setActivityOpen] = useState(false);
  /* Make a Payment lists every space AT THE SAME PROPERTY as the unit whose
     Pay Now was clicked — all of them, each with its own tick, so the tenant
     can pay the lot at once or just one. It used to list only spaces with an
     outstanding balance across every property, which on a paid-up account
     (every live lease is paid through month-end) collapsed to the one unit
     clicked and left no way to pick the others. The panel pre-ticks the
     clicked unit and any neighbour that owes something. */
  const atProperty = space
    ? spaces.filter((s) => s.propertyId === space.propertyId)
    : [];

  /* The ONE selection action, shared by a unit block and its "Account Info"
     button — which is what links them. Picking a unit always shows ITS account
     info, never the payment screen of whichever unit happened to be open, so
     from the payment screen this doubles as the way back. */
  /*
   * Scroll the account panel into view when the pick moves to ANOTHER
   * PROPERTY. The sidebar cards stack below the panel on a phone and beside
   * it on desktop, so a tenant who taps a unit under the second property is
   * looking at the bottom of the page while the contacts it just switched to
   * sit at the top. A counter rather than a boolean, so two moves in a row
   * both scroll; it is consumed by the effect below, after the account panel
   * has rendered for the new unit — scrolling from the click itself would
   * target the panel of the previous view.
   */
  const [scrollRequest, setScrollRequest] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectUnit = (id: string) => {
    setSelectedId(id);
    // Never lands on the payment or edit screen of whichever unit happened to
    // be open, so from either of those this doubles as the way back.
    setView('account');
    // EVERY pick scrolls, not only a change of property: "Account Info" on a
    // unit lower down the sidebar is a request to see that unit's account
    // info, and on a phone — or on desktop with a long card stack — that
    // panel is above the fold the tap was made from.
    setScrollRequest((n) => n + 1);
  };
  useEffect(() => {
    if (!scrollRequest) return;
    const el = rootRef.current?.querySelector('.ma-account');
    if (!el) return;
    /*
     * window.scrollTo, not scrollIntoView. The two should be the same, but in
     * a phone viewport scrollIntoView({behavior:'smooth'}) was observed doing
     * nothing at all (Chromium, iPhone 14 profile) while scrollTo moved —
     * and the page scrolled fine on desktop either way, so the difference
     * would only ever have shown up on the device.
     *
     * The site's nav bar is position: fixed, so landing the panel flush with
     * the top would put its heading under the nav. Whatever fixed or sticky
     * element sits at the top of the viewport is measured and the panel is
     * placed just beneath it; a page with none gets a 16px breath.
     */
    const cover = (() => {
      let p: Element | null = document.elementFromPoint(window.innerWidth / 2, 2);
      while (p && p !== document.body) {
        const pos = getComputedStyle(p).position;
        if (pos === 'fixed' || pos === 'sticky') return p.getBoundingClientRect().bottom;
        p = p.parentElement;
      }
      return 0;
    })();
    const top = el.getBoundingClientRect().top + window.scrollY - cover - 16;
    // Slowly, as asked — unless the reader has turned animation off, in which
    // case the jump is what they asked for.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
  }, [scrollRequest]);

  /* The button is on every block when there is more than one unit, because it
     is how you switch between them; on a lone unit it appears only on the
     payment screen, as the way back. That is exactly what the three frames
     draw — 8815-117093 has two buttons, 8815-115354 none, 9030-31458 one. */
  const showAccountInfo = spaces.length > 1 || view !== 'account';

  /*
   * The signed-in contact's own first name, when there is a session.
   *
   * Precedence: an explicit prop (an editor overriding it) → the session →
   * the frames' sample. The session carries one `name` ("Jaweed Khan"), and the
   * greeting is "Hi {first},", so only the first word is taken.
   */
  const sessionFirst = session?.name?.trim().split(/\s+/)[0] ?? '';
  const name = orElse(userName, sessionFirst || USER.firstName);
  /*
   * Who they are signed in as — the identifier from the session.
   *
   * Same precedence as the name: explicit prop -> session -> the frames'
   * sample. Without the session value this line showed the demo address to a
   * real signed-in reader.
   */
  const email = orElse(userEmail, session?.signedInAs || USER.email);

  /* The promo swaps with the view — autopay on the default screen, supplies on
     the payment screen, as the two frames draw them. An editor override wins
     over both, which is why it is applied here and not in data.ts. */
  const promo = view === 'payment' ? PROMO_SUPPLIES : PROMO_AUTOPAY;
  const promoLabel = orElse(promoCta, promo.cta);

  /*
   * Nothing of the account is SHOWN while the token is being checked.
   *
   * But the layout IS rendered: the same tree, with `ma-wrapper--busy` turning
   * every block into a plain grey box and hiding everything inside it (see the
   * CSS). This used to be an empty wrapper, ~96px, that grew by a thousand-odd
   * pixels when the check answered — the whole page under it jumping. Drawing
   * the boxes from the real markup, rather than a hand-sized skeleton, keeps
   * them exactly the loaded size at every width, and the tree is not remounted
   * when the check passes, only uncovered. `inert` keeps the hidden controls
   * out of the tab order and the accessibility tree.
   *
   * Painting the account first would flash the sample content — someone else's
   * name and balances — at a visitor who is about to be redirected to /login.
   */
  const busy = authed === null;

  // Phone account menu (icon beside the greeting → bottom sheet). Its rows are
  // the page's own actions; see AccountSheet.
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const sheetItems = [
    { label: 'Pay Bill', onSelect: () => setView('payment') },
    ...(space ? [{ label: `Account Info Space ${space.number}`, onSelect: () => selectUnit(space.id) }] : []),
    { label: 'Logout', onSelect: signOut },
  ];

  return (
    <div ref={rootRef} className={`ma-wrapper${busy ? ' ma-wrapper--busy' : ''}`} aria-busy={busy || undefined}>
      {busy && <span className="ma-sr-only" role="status">Loading your account…</span>}
      {sheetOpen && <AccountSheet items={sheetItems} onClose={closeSheet} />}
      {/* React 18 has no boolean `inert`; an empty string is the attribute. */}
      <div className="ma-grid" {...(busy ? { inert: '' } : {})}>
        <h1 className="ma-greeting">Hi {name},</h1>
        {/* Phone only (CSS shows it ≤720px): opens the account bottom sheet. */}
        <button
          type="button"
          className="ma-submenu-btn"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          <SubmenuIcon />
        </button>
        {/* No Log out button here — the Figma frame has none; logging out is in
            the nav bar's My Account menu (#02). signOut is still used when the
            session is rejected (unauthorized). */}
        <div className="ma-logged-in">
          <span className="ma-logged-in__text">You’re logged in as {email}</span>
        </div>

        <div className="ma-main">
          <section className="ma-promo">
            <div className="ma-promo__text">
              <h2 className="ma-promo__title">{orElse(promoTitle, promo.title)}</h2>
              <p className="ma-promo__body">{orElse(promoBody, promo.body)}</p>
            </div>
            {promoUrl
              ? <Button tone="cta" href={promoUrl} className="ma-btn-40">{promoLabel}</Button>
              : <Button tone="cta" className="ma-btn-40">{promoLabel}</Button>}
          </section>

          {/* A signed-in contact with no leases is a real account, not a
              broken page: every panel below needs a space, so without one
              they are not mounted and this says why. "+ Add a Space" in the
              sidebar is the way forward. */}
          {!space && (
            <section className="ma-account" role="status">
              <div className="ma-account__body">
                <h2 className="ma-account__title">No active rentals</h2>
                <p className="ma-account__label">There are no spaces on this account yet.</p>
              </div>
            </section>
          )}
          {space && view === 'account' && documentError && (
            <p className="ma-pay__notice" role="alert">{documentError}</p>
          )}
          {space && view === 'account' && (
            <AccountInfoPanel
              space={space}
              onPayNow={() => setView('payment')}
              onEdit={() => setView('edit')}
              contact={realContact}
              alternate={realAlternate}
              onOpenDocument={gated ? openDocument : undefined}
              busyDocument={busyDocument}
            />
          )}
          {space && view === 'payment' && (
            <MakePaymentPanel
              spaces={atProperty.length ? atProperty : space ? [space] : []}
              space={space}
              onBack={() => setView('account')}
              initialResult={initialPaymentResult ?? null}
              coverage={coverageHandlers}
              payment={paymentHandlers}
            />
          )}
          {space && view === 'edit' && (
            <EditPanel
              space={space}
              onCancel={() => setView('account')}
              // Nothing to persist while the account API is absent — Save
              // returns to the display panel rather than pretending to write.
              initial={editInitial}
              saving={saving}
              saveError={saveError}
              /* Returns to the display panel only on a SUCCESSFUL save — a
                 failure keeps the form open with the error and the reader's
                 edits intact. Unconfigured (harness/editor) there is nothing
                 to save, so it closes as it always did. */
              onSave={async (form) => {
                if (!gated) { setView('account'); return true; }
                const ok = await saveContact(form);
                if (ok) setView('account');
                return ok;
              }}
            />
          )}

          {/* BILL PAY ONLY. It is a record of payments, which belongs beside
              the screen that takes one — on Account Info and Edit it was just
              a second thing competing with the panel's own purpose. */}
          {space && view === 'payment' && (
            <PaymentActivity
              /* The account's own invoices, newest first — or nothing. The
                 sample rows stay for the harness and the editor only; a
                 signed-in customer must never see payments that were not
                 theirs. */
              rows={record ? activityRows : PAYMENT_ACTIVITY}
              open={activityOpen}
              onToggle={() => setActivityOpen((v) => !v)}
            />
          )}
        </div>

        <aside className="ma-side">
          {/* One card per property, holding every unit rented there. Properties
              with no units are skipped rather than drawn empty. */}
          {properties.map((property) => {
            const units = spaces.filter((s) => s.propertyId === property.id);
            if (units.length === 0) return null;
            return (
              <PropertyCard
                key={property.id}
                property={property}
                units={units}
                selectedId={space?.id ?? ''}
                onSelect={selectUnit}
                showAccountInfo={showAccountInfo}
              />
            );
          })}
          <Button tone="cta" block className="ma-btn-40 ma-add" href={addSpaceHref}>+ Add a Space</Button>
        </aside>
      </div>
    </div>
  );
}
