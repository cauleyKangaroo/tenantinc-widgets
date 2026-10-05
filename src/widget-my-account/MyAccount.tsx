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

import { useEffect, useMemo, useState } from 'react';
import './MyAccount.css';
import { Button } from '@shared/ui';
import { AccountInfoPanel } from './AccountInfoPanel';
import { EditPanel } from './EditPanel';
import { MakePaymentPanel } from './MakePaymentPanel';
import { PaymentActivity } from './PaymentActivity';
import { PropertyCard } from './PropertyCard';
import { readSession, clearSession } from '@shared/accountSession';
import { fetchMe, loginApiReady, type LoginApiConfig } from '@shared/accountApi';
import { PAYMENT_ACTIVITY, PROMO_AUTOPAY, PROMO_SUPPLIES, PROPERTIES, SPACES, USER } from './data';

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
   * Opens on the payment screen instead of Account Info. For the harness and
   * for a "Pay Bill" link that should land straight on it; the DEFAULT is the
   * account view. 'edit' is reachable from the panel, not normally a landing.
   */
  initialView?: View;
  /**
   * My Account proxy base, from the Duda JS tab's `login_api_base` site text —
   * the SAME value #17 is given.
   */
  login_api_base?: string;
  /** Duda's `data.siteId` — the proxy identifies the caller by it. */
  siteId?: string;
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
  login_api_base = '',
  siteId = '',
  inEditor = false,
  loginUrl = '/login',
}: MyAccountProps) {
  const [view, setView] = useState<View>(initialView);

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
  const [selectedId, setSelectedId] = useState(SPACES[0]?.id);
  const [activityOpen, setActivityOpen] = useState(false);

  const space = SPACES.find((s) => s.id === selectedId) ?? SPACES[0];
  /* Make a Payment lists EVERY space with something outstanding, not just the
     one whose Pay Now was clicked — see the panel's header note. A space with a
     zero balance has nothing to pay and would only be an unticked distraction. */
  const outstanding = SPACES.filter((s) => s.balance.amount.replace(/[^0-9.]/g, '') !== ''
    && Number(s.balance.amount.replace(/[^0-9.-]/g, '')) > 0);

  /* The ONE selection action, shared by a unit block and its "Account Info"
     button — which is what links them. Picking a unit always shows ITS account
     info, never the payment screen of whichever unit happened to be open, so
     from the payment screen this doubles as the way back. */
  const selectUnit = (id: string) => {
    setSelectedId(id);
    // Never lands on the payment or edit screen of whichever unit happened to
    // be open, so from either of those this doubles as the way back.
    setView('account');
  };

  /* The button is on every block when there is more than one unit, because it
     is how you switch between them; on a lone unit it appears only on the
     payment screen, as the way back. That is exactly what the three frames
     draw — 8815-117093 has two buttons, 8815-115354 none, 9030-31458 one. */
  const showAccountInfo = SPACES.length > 1 || view !== 'account';

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
   * Nothing renders while the token is being checked.
   *
   * Painting the account first would flash the sample content — someone else's
   * name and balances — at a visitor who is about to be redirected to /login.
   */
  if (authed === null) {
    return <div className="ma-wrapper" aria-busy="true" />;
  }

  return (
    <div className="ma-wrapper">
      <div className="ma-grid">
        <h1 className="ma-greeting">Hi {name},</h1>
        {/* The line and its Log out control are one flex row, so the button
            sits with the sentence it belongs to and wraps under it rather than
            being squeezed when the email is long. */}
        <div className="ma-logged-in">
          <span className="ma-logged-in__text">You’re logged in as {email}</span>
          {/* Clears the stored session BEFORE navigating. An href alone would
              leave the token in storage and the next visit would walk straight
              back in. */}
          <Button
            tone="dark"
            fill="outline"
            className="ma-btn-40"
            onClick={signOut}
          >
            Log out
          </Button>
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

          {view === 'account' && (
            <AccountInfoPanel
              space={space}
              onPayNow={() => setView('payment')}
              onEdit={() => setView('edit')}
            />
          )}
          {view === 'payment' && (
            <MakePaymentPanel
              spaces={outstanding.length ? outstanding : [space]}
              space={space}
              onBack={() => setView('account')}
            />
          )}
          {view === 'edit' && (
            <EditPanel
              space={space}
              onCancel={() => setView('account')}
              // Nothing to persist while the account API is absent — Save
              // returns to the display panel rather than pretending to write.
              onSave={() => setView('account')}
            />
          )}

          {/* BILL PAY ONLY. It is a record of payments, which belongs beside
              the screen that takes one — on Account Info and Edit it was just
              a second thing competing with the panel's own purpose. */}
          {view === 'payment' && (
            <PaymentActivity
              rows={PAYMENT_ACTIVITY}
              open={activityOpen}
              onToggle={() => setActivityOpen((v) => !v)}
            />
          )}
        </div>

        <aside className="ma-side">
          {/* One card per property, holding every unit rented there. Properties
              with no units are skipped rather than drawn empty. */}
          {PROPERTIES.map((property) => {
            const units = SPACES.filter((s) => s.propertyId === property.id);
            if (units.length === 0) return null;
            return (
              <PropertyCard
                key={property.id}
                property={property}
                units={units}
                selectedId={selectedId}
                onSelect={selectUnit}
                showAccountInfo={showAccountInfo}
              />
            );
          })}
          <Button tone="cta" block className="ma-btn-40 ma-add">+ Add a Space</Button>
        </aside>
      </div>
    </div>
  );
}
