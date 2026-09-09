// ===========================================================================
// The Edit panel — Figma 8815-115876. Opened by "Edit" on the Account Info
// panel, and it replaces that panel in place (same card slot, same width).
//
// Three sections under the space heading:
//   Account Settings         a tinted block: email, mobile, Change Password
//   Mailing Address          a lookup field, then Address / City / State / ZIP,
//                            then "Apply change to all spaces"
//   Additional Information   the alternate-contact toggle and, under it, that
//                            contact's name, email, phone and address
// …then a tinted action bar with Cancel and an orange Save.
//
// EVERY field is the shared kit's <FormField>. The frame's ".Form 2.0"
// component IS the kit's field — same 56px box, same 8px radius, same floating
// label with a red required marker, and its green "filled" state is the kit's
// `state="success"`, which draws --hb-ada-green and the tick. Nothing here
// re-implements an input.
//
// The two address lookups render as `type="search"` fields, matching the
// frame's empty search-icon boxes. They are NOT wired to @shared/Address-
// Autocomplete: every other figure on this screen is static demo content, and
// a demo panel should not be firing Places lookups at a live proxy. Wrapping
// each in <AddressAutocomplete> is the one-component change when the panel
// gets real data.
// ===========================================================================

import { useState } from 'react';
import { Button, Checkbox, FormField } from '@shared/ui';
import { EDIT_ACCOUNT_NOTE, EDIT_DEFAULTS } from './data';
import type { AccountSpace, EditForm } from './data';

export function EditPanel({
  space,
  onCancel,
  onSave,
}: {
  space: AccountSpace;
  onCancel: () => void;
  /** Nothing is persisted yet — the parent just returns to the display panel. */
  onSave: (form: EditForm) => void;
}) {
  const [form, setForm] = useState<EditForm>(EDIT_DEFAULTS);
  const set = <K extends keyof EditForm>(key: K) => (v: EditForm[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  /* The frame draws every filled field green. That is the kit's success state,
     which means "this validated" — so it is derived from the value rather than
     hardcoded, and a field the tenant empties drops back to its resting look
     instead of staying green while blank. */
  const filled = (v: string) => (v.trim() ? 'success' as const : 'default' as const);

  return (
    <section className="ma-edit">
      <div className="ma-edit__body">
        <h2 className="ma-edit__title">{space.title}</h2>

        {/* ── Account Settings ─────────────────────────────────────────── */}
        <div className="ma-edit__account">
          <h3 className="ma-edit__label">Account Settings</h3>
          <p className="ma-edit__note">{EDIT_ACCOUNT_NOTE}</p>

          <div className="ma-edit__stack">
            <FormField
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              state={filled(form.email)}
              autoComplete="email"
            />
            <FormField
              label="Mobile Phone"
              type="tel"
              required
              value={form.mobile}
              onChange={set('mobile')}
              state={filled(form.mobile)}
              autoComplete="tel"
            />
          </div>

          <Button tone="dark" className="ma-btn-40 ma-edit__password">Change Password</Button>
        </div>

        {/* ── Mailing Address ──────────────────────────────────────────── */}
        <div className="ma-edit__section">
          <h3 className="ma-edit__label">Mailing Address</h3>

          <FormField
            label="Mailing Address"
            type="search"
            required
            value={form.mailingLookup}
            onChange={set('mailingLookup')}
          />

          <div className="ma-edit__row">
            <FormField
              label="Address" required value={form.address} onChange={set('address')}
              state={filled(form.address)} autoComplete="address-line1"
            />
            <FormField
              label="City" required value={form.city} onChange={set('city')}
              state={filled(form.city)} autoComplete="address-level2"
            />
          </div>
          <div className="ma-edit__row">
            <FormField
              label="State" required value={form.state} onChange={set('state')}
              state={filled(form.state)} autoComplete="address-level1"
            />
            <FormField
              label="ZIP" required value={form.zip} onChange={set('zip')}
              state={filled(form.zip)} autoComplete="postal-code"
            />
          </div>

          <Checkbox
            checked={form.applyToAll}
            onChange={set('applyToAll')}
            className="ma-edit__check"
          >
            Apply change to all spaces
          </Checkbox>
        </div>

        {/* ── Additional Information ───────────────────────────────────── */}
        <div className="ma-edit__section">
          <h3 className="ma-edit__label">Additional Information</h3>

          <Checkbox
            checked={form.hasAlternate}
            onChange={set('hasAlternate')}
            className="ma-edit__check"
          >
            I am providing an alternate contact
          </Checkbox>

          {/* The frame draws this ticked, with the fields below it. Unticking
              hides them rather than leaving an alternate contact half-entered
              that the tenant has just said they do not have. */}
          {form.hasAlternate && (
            <div className="ma-edit__stack">
              <div className="ma-edit__row">
                <FormField
                  label="First Name" required value={form.altFirst} onChange={set('altFirst')}
                  state={filled(form.altFirst)} autoComplete="given-name"
                />
                <FormField
                  label="Last Name" required value={form.altLast} onChange={set('altLast')}
                  state={filled(form.altLast)} autoComplete="family-name"
                />
              </div>
              <div className="ma-edit__row">
                <FormField
                  label="Email" type="email" required value={form.altEmail} onChange={set('altEmail')}
                  state={filled(form.altEmail)}
                />
                <FormField
                  label="Phone" type="tel" required value={form.altPhone} onChange={set('altPhone')}
                  state={filled(form.altPhone)}
                />
              </div>

              <FormField
                label="Address"
                type="search"
                required
                value={form.altLookup}
                onChange={set('altLookup')}
              />

              <div className="ma-edit__row">
                <FormField
                  label="Address" required value={form.altAddress} onChange={set('altAddress')}
                  state={filled(form.altAddress)}
                />
                <FormField
                  label="City" required value={form.altCity} onChange={set('altCity')}
                  state={filled(form.altCity)}
                />
              </div>
              <div className="ma-edit__row">
                <FormField
                  label="State" required value={form.altState} onChange={set('altState')}
                  state={filled(form.altState)}
                />
                <FormField
                  label="ZIP" required value={form.altZip} onChange={set('altZip')}
                  state={filled(form.altZip)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar ───────────────────────────────────────────────────
          Cancel is drawn as plain bold text, not a button box — but it IS a
          button, so it focuses and activates from the keyboard. */}
      <div className="ma-edit__actions">
        <button type="button" className="ma-edit__cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="ma-paynow" onClick={() => onSave(form)}>Save</button>
      </div>
    </section>
  );
}
