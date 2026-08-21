# Hummingbird Rental Flow API — reference and gap analysis

Source: `api_docs_rental_flow.docx` (repo root), read in full 2026-08-20.
Cross-checked against the live Storage Outlet tenant the same day.

This file is the map between **what the guide specifies** and **what
`src/widget-rental-flow-2step/` actually does**, so nobody has to re-derive it
from the .docx again.

---

## Conventions

Every call is:

```
{baseUrl}/applications/{appId}/v2/companies/{companyId}/...
X-storageapi-date: <unix seconds>
X-storageapi-key:  <API_KEY>
```

and every response is wrapped:

```json
{ "applicationData": { "<appId>": [ { "status": 200, "data": { … } } ] } }
```

`unwrap()` in `api.ts` peels that envelope. **`data` is an object everywhere
except API 1, where it is an array.**

### Host

The guide says `prod.edge.tenant.dev`; our `config.json` says `edge.tenant.dev`.
**Both work** — APIs 1, 2, 3 and 6 were called successfully against
`edge.tenant.dev` on 2026-08-20. Do not "fix" the host without a reason.

### Version

**Every endpoint in the guide is `v2`.** Our writes and some reads still use
`v1` (`hold`, `lease-set-up`, `reserve`, `units/available`). The v1 calls work
today, so they have not been churned — but see API 7: the extra parameters may
only exist on v2, which is the most likely explanation for promotions
"not applying" to a lease-set-up quote in the past.

---

## The eleven endpoints

| # | Endpoint | Method | Our status |
|---|----------|--------|------------|
| 1 | `companies/{co}/space-management/space-types` | GET | **done** |
| 2 | `properties/{p}/space-groups` | GET | not used — we walk `rate-management` |
| 3 | `properties/{p}/space-groups/{sg}/groups` | GET | used, no `cost=true` |
| 4 | `properties/{p}/offers?unitGroupId=` | GET | used |
| 5 | `units/{u}/hold` | POST | used (v1) |
| 6 | `properties/{p}/insurances?unit_type_ids=[…]` | GET | **done** |
| 7 | `units/{u}/lease-set-up` | POST | **done** (v1, see caveat) |
| 8 | `units/{u}/reserve` | POST | used (v1) — `move_in_cost` shape wrong |
| 9 | `units/{u}/documents/finalize` | POST | **done** (ClickWrap / Super Lease only) |
| 10 | `units/{u}/lease` | POST | **done** |
| 11 | `leases/{l}/payment-methods/{pm}/autopay` | PUT | **done** |

---

### 1. Space types

Returns the company's space types: `unit_type_id`, `unit_type_name`,
`display_name`, `have_coverage`, `show_on_website`.

`unit_type_id` is the join key for APIs 3 and 6.

**Live (Storage Outlet, 2026-08-20):**

| id | name | coverage |
|---|---|---|
| `wNjG5IpNvK` | storage | 1 |
| `7kjVKsgVB5` | parking | 1 |
| `wgjYkcxgvz` | Residential | 1 |
| `k3BEpHgdjA` | Commercial | 1 |
| `56v1gtopjy` | wine | 1 |

> **Names disagree across endpoints — always match on the ID.** A unit row's
> `type` reads `commercial_storage` where the space type and the coverage plan
> both say `Commercial`. `unit_type_id` is identical on all three.

Ours: `fetchSpaceTypes()`.

### 2. Space group profiles

Lists the property's space groups with `id`, `name`, `is_default`, `num_spaces`.
The **`Website Group`** is the public one.

Ours: **not used.** We resolve the group by walking the `rate-management`
payload for `space_group_profile.id`. On Bellflower that yields `7jP5qtVeBg`,
named `Website Group` — the same answer. `@shared/spaceGroups` already does the
name match properly for #05/#06; the rental flow should eventually use API 2 the
same way.

### 3. Space types & tiers

`?cost=true` (guide says required) plus optional `amenities` /
`amenity_names` filters. Returns `spaceGroupProfile.<spaceTypeId>.groups[].tiers[]`,
where **`tier_id` is the `unitGroupId`** that API 4 wants.

Pricing rules from the guide:
- vacant spaces exist → `vacant.min_price`; otherwise `units.min_price`
- promo price = `round(costs.rent − round(costs.charges.discounts))`

> `spaceGroupProfile.<type>.insurance` is documented here but is **`[]` on every
> tenant** — three empty arrays on Bellflower, 2026-08-20. Coverage comes from
> **API 6**, not from here. Reading this array is what made step 2 show
> "confirmed at checkout" forever.

Ours: `fetchSpaceGroups()` — used only for `extractSelectionContext`.

### 4. Offers

`?unitGroupId={tier_id}`, optional `amenities` / `promotions` filters.

Returns 3 offers (`good` / `better` / `best`) when Value Tier is on, else 1. A
sold-out slot comes back with `unit_id: null, price: null`.

Per offer: `unit_id`, `price`, `unit_type_id`, `space_mix_id`, `value_tier`,
`promotions[]`, `amenities[]`, `costs{}`, and **`dossier.token`** — a JWT that
lets Hummingbird validate the quoted price in API 7.

Ours: `fetchSelectionFromOffers()`. Now carries `promotionIds` and `offerToken`.
`space_mix_id` is **not** captured yet and API 9 requires it.

### 5. Hold

`POST units/{u}/hold` → `{ "hold_token": "…" }`. Valid **15 minutes**.

Observed behaviour not in the guide:
- POST on an already-held unit → inner status **409**
- while held, the unit **disappears** from `units/available`; recovery is
  refetch → pick another → hold that
- `DELETE units/{u}/hold/{token}` releases (undocumented, works)

Ours: `holdUnit()` / `releaseHold()`, v1.

### 6. Coverage options

`GET properties/{p}/insurances?unit_type_ids=[id1,id2]` — bracketed, comma
separated, URL-encoded whole.

Per plan: `id`, `name`, `coverage` (**string**, e.g. `"2000.00"`),
`premium_value`, `premium_type` (`"$"`), `unit_type`, `unit_type_id`, `status`.

**Live (Bellflower, all five types requested):** six plans — two `storage`
($20/$2,000 and $30/$3,000) and four `Commercial`. Hence the narrowing by
`unit_type_id`; an un-narrowed list offers a storage renter four plans that do
not apply.

Ours: `fetchProtectionPlans()` + `plansForUnitType()`. A plan is offered only
when active with a usable coverage and a **flat-dollar** premium — a percentage
premium cannot print as "$N/mo" and is dropped rather than mislabelled.

### 7. Lease set-up (the quote)

```json
POST units/{u}/lease-set-up
{
  "hold_token":  "…",
  "insurance_id":"…",
  "promotions":  [{"promotion_id":"…"}],
  "start_date":  "2026-02-25",
  "token":       "<dossier token>"
}
```

Returns `details` with `rent`, `bill_day`, `Invoices[]`, `Charges`, `Discounts[]`.

Two numbers matter and they are **not** the same:

- `total_due` — gross, before discounts
- **`balance` — the net amount actually payable.** In the guide's example
  `total_due: 21.43` against `balance: 15`.

Passing `insurance_id` adds a `"Protection Plan $2000 Coverage"` line to
`Charges.Detail` — this is how coverage reaches the total.

Ours: `fetchMoveInQuote(ctx, unit, opts)` sends all five documented fields.

> **Caveat.** We POST to **v1**, where these extra parameters are undocumented
> and unproven. `postLeaseSetUp()` therefore retries with a `hold_token`-only
> body if the full one is rejected, and logs loudly — a rent-only breakdown
> beats no breakdown. **If the console shows that warning, move this call to v2.**

> Our parser reads `Invoices[0].total_due`. Per the guide it should probably read
> `balance`. #14 already uses `balance` from its own `configure` call. Not
> changed yet — it needs a live comparison on a held unit.

### 8. Reserve

```json
POST units/{u}/reserve
{ "hold_token", "contacts":[…], "platform", "start_date",
  "move_in_cost": {…}, "promotions":[…], "tracking":{…} }
```

→ `{ lease_id, reservation_id, tenants[] }`

`move_in_cost` has a **specific shape** built from the API 7 result:

```json
{"data":{"rental":{"amount":21,"costType":"reservation",
 "start":1772089977,"end":1772089977,"total":21,
 "costs":[{"amount":9.64,"costType":"discount","description":"50% OFF FIRST MONTH",
           "start":1772089977,"end":1772089977,"total":9.64}]}}}
```

`costType` ∈ `rent` | `discount` | `other` | `tax`; dates are **unix seconds**.

> **Known gap.** `reserveViaEdge()` echoes `d.move_in_cost ?? d.details ?? d`
> straight from lease-set-up, which is not this shape. Deliberately left alone
> for now — the reserve path is shipping and is out of scope of the rental work.

`tracking.touchpoints[]` carries attribution (`platform_source`,
`referrer_channel`, `referrer_request_url`, `referrer_timestamp`). Not sent.

### 9. Document signing

`POST units/{u}/documents/finalize`. Three modes:

- **Traditional** — response has `signed: false` and a signing `url` per
  document, to iframe or open. Afterwards *the integrator* must produce a public
  PDF URL and feed it to API 10.
- **ClickWrap** — acceptance checkbox; signed internally.
- **Super Lease** — one document for all leases, ClickWrap internally.

With ClickWrap/Super Lease the response is `signed: true` plus
`documents[]` of `{document_type, filename, src, version}` — **that array is
required input to API 10.**

Required payload beyond the contact: `space_mix_id` (API 4), `bill_day`
(API 7), `web_rate` (non-prorated monthly rent), `total_payment_amount`,
`costs[]` (same array as reserve), `payment_method`, `start_date`, and
`metadata` with the shopper's **`ip`, `user_agent` and `location`**.

Optional: `deliveryMethod` (`hand_delivery` | `email` | `mail`), `discount_id`
(required if a promotion applies), `vehicle_info`, military and relationship
contacts (alternate / authorized / lien_holder).

Ours: `finalizeDocuments()`.

> **Traditional signing is NOT supported.** It needs a signing UI and, per the
> guide, the integrator must then host the signed PDF and hand back a public
> URL — which a browser widget cannot do. A `signed: false` response therefore
> fails with a message telling the shopper to contact the office, and logs the
> signing URLs. **If a company is configured for Traditional signing, online
> rental does not work for it.**

> `ip` and `location` in `metadata` are sent EMPTY. Neither is knowable in the
> browser without calling a third-party geolocation service, which would leak
> the shopper to an unrelated host. Hummingbird sees the real IP on the request.

Ours: `finalizeDocuments()`. TenantInc re-sent this call's payload on
2026-08-21 with the instruction **"ignore the fields you don't have data for"**,
which is how the optional blocks are treated below.

**Sent when the shopper fills them:** `Military` (`active` + `date_of_birth`),
`Relationships[]` as `type: "alternate"`, `vehicle_info`, `discount_id`,
`deliveryMethod` (defaults to `email`), and `source` — Hummingbird's record of
the originating application, `"Mariposa Website Application"` per their sample.

**Not sent, and why:**

| field | reason |
|---|---|
| `Business` | their payload shows `"Business": {}` — an empty object with no documented fields, so the business name and address the form collects have nowhere to go |
| `driver_license`, `_exp`, `_state`, `ssn` | the form does not ask for them yet — this is the ID-verification data, see below |
| `Relationships` `authorized` / `lien_holder` | the form offers one alternate contact only |
| `vehicle_info` details | we capture the type; make, model, year, VIN, plate, insurance and registered owner are not asked for |
| `Military` detail | branch, rank, unit, service dates, commanding officer are not asked for |
| ACH `payment_method` | the bank form is not wired to the API |

> **ID verification.** There is no verification endpoint anywhere in the guide.
> What exists is `driver_license` / `driver_license_exp` / `driver_license_state`
> / `ssn` **as fields on the contact** — so "verifying ID" means capturing the
> licence with the tenant, not calling a service. The SuccessStep's "Verify ID
> Now" button has nothing to call.

### 10. Lease finalization

`POST units/{u}/lease`. **One endpoint, two flows:**

- reservation → rental: pass **`reservation_id`**
- direct rental: pass **`hold_token`**

Plus `contacts[]`, `documents[]` (from API 9), `payment_method`, `start_date`,
`promotions[]`, `platform`, `tracking`, `pending`, `additional_months`.

→ `{ lease_id, payment_id, payment_method_id, Invoices[], tenants[] }`

**All documents must be signed before this succeeds.**

Ours: `finalizeLease()`. We send `hold_token` (direct rental); the
`reservation_id` branch is implemented but unused, because Reserve and Rent are
separate journeys in this widget.

### 11. Autopay

`PUT leases/{l}/payment-methods/{pm}/autopay`, empty body. Only when
auto-charge is enabled, and only after API 10 returns the ids.

Ours: `enableAutopay()`, driven by the "Autopay Enrollment" checkbox. **A
failure here is reported as a successful rental with a warning**, never as a
failed one — the lease and the payment are already done by that point.

---

## Open questions for TenantInc

1. **Card handling — settled for the test release.** APIs 9 and 10 take raw
   `card_number` / `cvv2` / `exp_mo` / `exp_yr` in the JSON body, and the guide
   offers no tokenized alternative. **TenantInc confirmed (2026-08-20) that
   sending the card in the request is expected for this test release**, so the
   rental does exactly that and the Global Payments hosted-fields integration
   was removed rather than kept as a second, incompatible payment route.

   Worth revisiting **before a production launch with real cards**, since the
   card number passes through a bundle served from public GitHub Pages. If it
   is revisited, the change is small and localised: `cardPaymentMethod()` builds
   the object, and `finalizeDocuments()` / `finalizeLease()` are the only two
   callers — moving them behind the proxy would keep the PAN out of the browser
   without touching the UI.
2. **v1 vs v2** for `hold` / `lease-set-up` / `reserve` — is v1 deprecated, and
   does v1 `lease-set-up` honour `insurance_id` / `promotions` / `start_date`?
3. **`total_due` vs `balance`** — confirm `balance` is what to charge.
4. Which signing mode is configured for this company: Traditional, ClickWrap or
   Super Lease? It changes whether we need signing UI at all.

## How the rent path is wired

`rentSpace()` runs 9 → 10 → 11 and returns a soft result carrying the STAGE it
failed at, because the three failures mean different things:

| stage | what happened |
|---|---|
| `documents` | nothing was charged |
| `lease` | the charge may or may not have gone through — never auto-retry |
| `autopay` | the rental SUCCEEDED; only recurring enrolment did not |

Inputs and where each comes from:

| field | source |
|---|---|
| `hold_token` | API 5, held when step 2 opens |
| `space_mix_id` | API 4 offer → `SelectionContext.spaceMixId` |
| `bill_day`, `web_rate` | API 7 → `MoveInQuote.billDay` / `.rent` |
| `total_payment_amount` | `MoveInQuote.totalDue` |
| `costs[]` | `quoteToCosts()` — `costType` derived, not passed through |
| `discount_id`, `promotions` | the offer's promotion ids |
| card + billing address | the static `CardForm` |
| contact | step 2's own fields (the shopper may have edited them) |

> **There is one payment path.** Global Payments Hosted Fields was removed on
> 2026-08-20: it tokenizes the card inside GP's iframes and charges through
> GP's own REST API (`/transactions/creditsales`), so it can neither supply
> `card_number` to these calls nor take the money through Hummingbird. Two
> gateways, one transaction — the guide is the one we follow.

> After a real lease the confirmation no longer shows the placeholder access
> code — the lease response carries none, and inventing one after a real charge
> would be a lie the tenant acts on. It falls back to the guide's no-code
> variant instead.

## Not in the guide but in our code

`generate-move-in-invoice`, `leases/{id}/insurance`, `contacts/{id}/payment-link`
are Kangaroo proxy endpoints with no counterpart here. The documented rent path
is lease-set-up → finalize → lease. Confirm whether the proxy wraps these or
should be retired.
