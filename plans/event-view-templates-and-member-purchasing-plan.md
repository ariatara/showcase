# Event View templates and member purchasing

## Status and objective

Source implementation is complete and locally verified. The real PayPal sandbox release gate is blocked by missing merchant credentials and a registered HTTPS webhook endpoint. No application-database migration, real charge, commit, or deployment was performed.

Implementation refinement: keep the commerce DDL in migration 003; a fresh install runs the bootstrap schema followed by 003. Closely related services/routes may be consolidated to minimize code changes without reducing the agreed behavior.

## Implementation handoff

Signature is the default and Classic remains selectable in Create/Edit Event. Both use the existing galleries and shared member storefront. Saved template selection, Copy, pending uploads, stable product IDs/versions, member eligibility, multi-event carts, coupon/fee administration, and durable PayPal checkout/recovery are implemented.

To minimize changes, the original per-SF manifests below are consolidated as follows; they describe responsibilities rather than a requirement to create redundant files:

| Responsibility | Implementation |
|---|---|
| Member catalog, cart, coupons, fee pricing | `backend\Utilities\CommerceStore.js`, `CommerceMoney.js` |
| Reservations, checkout transitions, webhooks, recovery | `backend\Utilities\OrderService.js` |
| Member/admin/payment route orchestration | `backend\Routes\CommerceRoutes.js`, `Middlewares\CommerceAuthorization.js` |
| Provider protocol and worker | `backend\Services\PayPalClient.js`, `Configurations\Commerce.js`, `Jobs\ReconcilePayments.js` |
| Shared storefront, cart, checkout and admin styling | `frontend\css\Commerce.module.css` |
| Consolidated integration coverage | Backend `Commerce`, `CommerceAccess`, `CommerceSchema`, `MemberProducts`, `Orders` integration files; frontend `EventTemplates` and `MemberCommerce` browser files |

Validation completed: 32 backend unit tests, 26 frontend unit tests, 46 browser tests, and 20 distinct disposable-MySQL integration cases (full run plus focused follow-ups). Changed frontend lint, backend syntax, production build, and whitespace checks passed. Existing build asset/classic-script/chunk warnings remain. Browser payment flows use deterministic provider doubles; these results do not establish real PayPal approval, capture, or webhook delivery.

### Database rollout

Back up the database before applying DDL. Fresh installations run `datastore\Schema\BackendSchema.mysql.sql`, then `datastore\Migrations\003_event_commerce.mysql.sql`. Existing installations run migration 001 only if not already applied, then 002 and 003, in order. Do not rerun additive migrations blindly.

Migration 003 rejects invalid legacy product inventory/prices before adding commerce metadata. MySQL DDL implicitly commits: on failure, inspect the schema and correct the reported business data before resuming; do not treat the whole script as transactionally rolled back or mark it applied. A rollback must retain financial history and reservations, not drop the commerce tables.

### Payment configuration and operations

Server environment variables:

| Variable | Purpose |
|---|---|
| `PAYPAL_MODE` | `sandbox` by default; `live` only after the release gate |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Server-side application credentials |
| `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID` | Expected payee and registered webhook identity |
| `COMMERCE_APP_ORIGIN` | Browser origin and fixed return/cancel destination; defaults to `http://localhost:5173`; HTTPS required for live |
| `COMMERCE_PAYMENTS_ENABLED` | Must explicitly be `true` to create payments; leave disabled until sandbox verification |

Register the backend HTTPS endpoint `/payments/paypal/webhook` for order approvals and capture completion/pending/denial/refund/reversal events. Keep the application's existing API-origin deployment configuration consistent with `COMMERCE_APP_ORIGIN`; this implementation does not redesign the repository's localhost-based API configuration.

Run `npm --prefix .\backend run payments:reconcile -- 20` periodically with the same database/provider configuration. The batch is bounded (maximum 100), restart-safe, and drains its current order on SIGINT/SIGTERM. Exit code 1 or `reconciliation_required` needs operator attention. Do not release uncertain holds or create a replacement payment to resolve an ambiguous capture.

Orders expire locally after 30 minutes if definitively unpaid. Create/capture retries retain their action-specific request IDs and stop after five hours from local order creation, inside PayPal's documented default six-hour idempotency retention. Orders also freeze a fingerprint of merchant, environment, and application identity; restore the original configuration to reconcile an order if any of these change. Rotating the secret for the same application does not change this fingerprint.

Fees start disabled and are independently configured under Commerce settings. To pause sales, disable new payment creation while keeping the original provider configuration, webhook endpoint, and recovery worker available for existing orders.

### Remaining external release gate

Provide a sandbox merchant/buyer and server credentials, register the reachable HTTPS webhook, and demonstrate real create/approve/capture, cancellation, verified delivery, and recovery before enabling live purchasing. `backend\Tests\PayPal.sandbox.integration.js` is an opt-in, read-only check of an existing capture; it does not create or approve a payment. It requires `PAYPAL_SANDBOX_TEST=1`, `PAYPAL_SANDBOX_LOCAL_ORDER_ID`, `PAYPAL_SANDBOX_ORDER_ID`, and `PAYPAL_SANDBOX_TOTAL_CENTS`, alongside sandbox configuration.

Provider retention reference: https://developer.paypal.com/sdk/orders/v2/orders-create/

Create a professional Event View and an extensible template system, selectable per event in Create Event and Edit Event. The scope was expanded during clarification to include a member-only product storefront and a complete PayPal purchasing flow.

The previous gallery implementation and subsequent editor improvements are existing functionality, not work to redo. Preserve all current working-tree changes.

## Confirmed scope

| Topic | Decision |
|---|---|
| Initial templates | New professional **Signature**, plus the existing design as **Classic** |
| Default | Signature for new and existing events |
| Selection | Selectable template cards in both Create Event and Edit Event |
| Preview | Illustrative template cards; view the event after saving. No unsaved-content preview |
| Extensibility | Developer-built React templates; no visual template builder or uploaded executable templates |
| Event content | Existing banner, title, schedule, venue/map, upper/lower rich content, backgrounds, and galleries |
| Products | Member Products section in both templates |
| Visibility | Product details and prices restricted to signed-in members; public event content stays public |
| Eligibility | A purchased product must be assigned to a registered member belonging to the signed-in account whose membership category matches the product target |
| Cart | Products from multiple events in one checkout |
| Payment | PayPal, USD, one organization/payee |
| Discounts | Admin-managed percentage or fixed-USD codes; one coupon per order, no stacking, expiry and usage limits |
| Payment fee | Separately disclosed buyer-facing fee, configurable and disabled until a rate is set |
| Not included | Shipping, tax calculation, in-app refunds, guest checkout, non-member products, subscription billing, marketplace payouts |

The later checkout clarification supersedes the earlier display-only proposal. No Buy button may point to the existing placeholder checkout.

## Visual design

### Signature

An image-led, polished charcoal layout with warm orange accents, consistent gutters, restrained borders/shadows, and clear typography. This fits the existing dark navigation and authored hub content without forcing a new site-wide theme.

1. **Hero:** uploaded banner with a contrast gradient, one event-title `h1`, and responsive spacing. Use a minimum height with content-driven expansion, not fixed-height text boxes.
2. **Event essentials:** clearly separated start/end date and time, venue, and an accessible "View map" link when a valid map URL exists.
3. **Upper hub:** uploaded background as a restrained decorative layer, readable rich-text panel, followed by the existing ordered gallery.
4. **Lower hub:** the same visual system, independent content/background/gallery state.
5. **Member Products:** responsive cards with image, name, type, membership category, event date, USD price, availability, eligible-member selection, quantity, and Add to cart.
6. **Cart access:** a real cart link/count, without covering content or competing with the site's fixed navigation/footer.

Desktop content is centered with a maximum reading width; tablets and phones stack naturally. Preserve authored Quill formatting, including supported fonts and links. Do not render parsed block HTML inside a surrounding paragraph. Avoid invented event copy, stock photography, fake ratings, countdowns, or nonfunctional calls to action.

Public gallery behavior remains shared: 1/2/3 responsive columns, ten-image write limit per hub, original ordering, lazy thumbnails, uncropped accessible lightbox, keyboard controls, and explicit image errors.

### Classic

Extract the existing banner and orange/dark hub presentation without redesigning it. Append the same member-products section, styled to fit its container. Keep existing gallery geometry and content semantics.

### Template cards

Add an "Event View Template:" fieldset near URL/Visibility, following current Edit Event heading conventions. Each radio card has a small CSS-rendered layout illustration, name, description, selected treatment, and a Default badge on Signature. Cards are keyboard-operable and disabled while saving/uploading.

The selector changes only local `viewTemplate` state. Existing Save persists it. Switching templates must not reset content, images, products, or pending upload queues.

## Verified codebase constraints

| Finding | Evidence | Design consequence |
|---|---|---|
| Event loading and all layout are currently combined | `frontend\src\Components\UserAccess\ViewEvent.jsx` | Keep a single loader and extract presentation-only templates |
| Shared gallery already handles lightbox and lifecycle | `frontend\src\Components\UserAccess\EventImageGallery.jsx` | Reuse; do not implement another gallery |
| Event fields are explicitly allowlisted | `backend\Utilities\EventValidation.js`; `frontend\src\Utilities\EventValidation.js` | Extend both maps and validation; adding only a selector would lose the choice |
| Partial updates preserve omitted fields | `backend\Controllers\EventAccess.js` | Preserve this for the template field |
| Copy manually constructs an event payload | `frontend\src\Components\AdminAccess\Events.jsx` | Explicitly preserve template selection on Copy |
| Products have event URL and membership-category relations | `datastore\Schema\BackendSchema.mysql.sql` | Keep event/category ownership; use durable IDs for commerce |
| Product replacement deletes all rows and reinserts them | `backend\Utilities\MemberProductWrites.js` | Replace with ID-preserving updates and retirement before carts/orders depend on products |
| Product editor does not retain row IDs/versions | `frontend\src\Components\AdminAccess\EditMemberProducts.jsx` | Carry IDs and versions through reads, edits, and saves |
| Product price is currently `DECIMAL(10,0)` | `datastore\Schema\BackendSchema.mysql.sql` | Migrate to exact two-decimal USD storage without losing existing integer prices |
| Cart and checkout pages are placeholders | `ShoppingArea.jsx`; `ShoppingCheckout.jsx` | Implement real cart, order, payment, and confirmation behavior |
| No commerce tables or PayPal integration exist | Existing schema, backend routes, package manifests | Add bounded commerce infrastructure rather than imply an existing service |
| Verified JWT contains account identity, middleware currently exposes only roles | `UserAccess.js`; `Middlewares\TokenValidation.js` | Expose a validated principal; never take purchasing identity from a request email |
| Existing account routes allow multiple role types | `backend\Routes\AccountRoutes.js` | New commerce routes require Member plus ownership/category checks |
| Navigation and footer are fixed | `NavigationBar.jsx`; `FooterBar.jsx` | Reserve page space and test overlap without redesigning unrelated pages |
| Existing validation includes real MySQL integration | `backend\Tests\Events.integration.js` | Extend fresh/upgrade proofs and add commerce concurrency/recovery tests |

No successful prior design metrics or design-specific corrections were present in the session database. Current repository behavior is the source of truth.

## Architecture and contracts

### A. Template identity, storage, and rendering

- Stable IDs: `signature` and `classic`. API field: `viewTemplate`. Database column: `events.view_template VARCHAR(64) NOT NULL DEFAULT 'signature'`.
- The additive migration gives existing events Signature as requested; do not modify their content, gallery references, products, or publication status.
- New writes accept only registered IDs. Omitted create values use Signature; omitted update values preserve the stored choice. Explicit null, blank, non-string, overlength, or unknown write values receive a field-specific 400.
- Legacy reads with no template field resolve to Signature. An unknown stored ID renders Signature with a diagnostic; the admin selector shows an unavailable-template warning and requires an explicit valid selection before saving rather than silently rewriting it.
- Keep frontend template metadata and backend allowed IDs in small, dependency-free modules. Add a parity test. Do not add a catalog database, public catalog endpoint, runtime code imports from user input, or cross-package runtime dependency.
- `EventViewRenderer({ event, memberProducts })` chooses from a static component map. Template components accept normalized event data and the shared member-products section; they do not fetch event data or implement payments.
- Retain the existing public event route and published-only API. A selected template never grants access to drafts.
- Adding a template means adding its React/CSS implementation and card metadata, registering its component/allowed ID, and adding contract/browser coverage. No further schema migration is needed for a new ID.
- Shared event-view formatting must handle missing fields and date-only values without timezone day shifts. Keep the current date/time conventions for existing content; scope any corrective formatter to event views.

### B. Member catalog and identity

- Add authenticated commerce endpoints under `/account/commerce`; leave `/user/events/:event_url` free of product prices and member information.
- A validated principal comes from the signed cookie token. New commerce authorization validates the account and current Member role server-side, not `sessionStorage`.
- Catalog queries are scoped to a published event and active member products, with an explicit field projection. Do not call an admin product endpoint from the public page.
- Return only the signed-in account's eligible registered members. Require matching `membership_category = product.target` when adding a line and again when quoting/reserving/capturing.
- A cart line is identified by product ID and beneficiary member ID. Multiple eligible family members can have separate lines for the same product; inventory checks aggregate quantities per product.
- Anonymous visitors see a member sign-in prompt, not product details or prices. Signed-in non-members see a membership-required explanation. Members without a matching registered member cannot add that item.
- Do not invent membership renewal/dues rules: the current model has registration/category data, not a paid-through or expiry field.
- Existing upload storage policy remains unchanged. This feature enforces access to catalog data and prices; it does not introduce a separate private-media storage system.
- Authentication failures, catalog failures, empty results, and sold-out products are distinct UI states. Product failure must not replace the public event page with an error or masquerade as an empty catalog.

### C. Stable catalog and inventory

- Keep product IDs stable across edits. New rows get IDs; existing rows update only within their event. Missing rows are retired, not blindly deleted when commerce references exist.
- Add active/version metadata to products and carry it through the admin form. Zero remaining inventory is valid; negative inventory is not.
- Validate USD prices to two decimal places and use exact decimal strings at persistence boundaries. Existing whole-dollar values migrate unchanged.
- `inventory` represents remaining unsold units. Available quantity is inventory minus active reservations. Successful payment consumes inventory and its reservation atomically, once.
- Reject admin inventory changes below active reservations and stale version updates. Do not let saving an old form replenish units sold by another request.
- Event/product removal must not cascade away order history or active reservations. Retire products and return a clear conflict for destructive event operations with commerce references.
- Product changes after a cart addition are surfaced at checkout. Never silently substitute another product, beneficiary, event, price, or quantity.
- Checkout transactions lock products in stable ID order across events, recheck eligibility/publication/stock, and either reserve the whole cart or nothing.

### D. Cart, coupons, and payment fee

- Keep one server-persisted active cart per account, supporting multiple events. Do not rely on browser storage as the authority for prices or ownership.
- Add/update/remove operations use a cart version to detect stale tabs. Return authoritative lines and validation errors; do not silently remove unavailable lines.
- Initial technical bounds: 50 distinct product/member lines per cart and quantity 1-99 per line, additionally bounded by available inventory. Validate IDs, lengths, safe-integer monetary arithmetic, and payload size server-side.
- Prices and totals are recalculated from the database. A client-provided price, fee, discount, account identity, or eligibility flag has no authority.
- Coupon codes are normalized ASCII identifiers, at most 32 characters. Support percentage discounts represented in basis points or fixed USD amounts represented in cents, active state, validity window, global usage limit, and per-account usage limit. One cart-wide code applies to merchandise from all included events.
- Coupon administration is restricted to administrators. Reserve usage with the checkout and consume it once on payment; release it only when the order is definitively unpaid. Concurrent checkouts cannot exceed the configured limits.
- A fee settings record contains enabled state, percentage basis points, fixed cents, and a version. It starts disabled with zero rates.
- Exact formula:
  - `subtotal = sum(server unit price cents * quantity)`
  - `discount = validated coupon discount`, capped at merchandise subtotal
  - `discounted subtotal = subtotal - discount`
  - `payment fee = enabled ? round-half-up(discounted subtotal * basis points / 10000) + fixed cents : 0`
  - `total = discounted subtotal + payment fee`
- Percentage rounding occurs once at the order level using integer arithmetic. The fee is not itself discounted.
- Display subtotal, coupon deduction, payment fee, and final USD total before PayPal approval and again on confirmation. Label the configured buyer charge "Payment fee"; do not call it PayPal's actual processing cost.
- Persist the exact coupon, fee settings, and amount snapshots used by an order. Later configuration changes never rewrite a paid or already-approved order.
- A stale cart/settings/price quote requires review and a new confirmation; it must not silently charge a higher amount.
- PayPal requires a positive amount. Reject a coupon/fee combination producing a non-positive payable total with a clear message; free-order checkout is outside this scope.

### E. Orders and PayPal lifecycle

- Use PayPal Orders v2 with server-side OAuth, order creation, and capture. Redirect to the provider-supplied approval link; return/cancel routes are fixed application routes, not arbitrary client URLs.
- Use one purchase unit for the organization, containing snapshotted lines from multiple events. Reconcile the USD item total, discount, and buyer fee with PayPal's supported amount breakdown; do not treat the fee as a marketplace/platform payout.
- Store account-owned local order IDs, provider order/capture IDs, action-specific idempotency keys, and immutable line/amount snapshots. Duplicate requests with the same key and same payload return the original result; changed payloads with a reused key are conflicts.
- Send the local order ID as the provider correlation reference. If order creation times out before a provider ID is stored, recover using the same persisted create request ID within PayPal's supported idempotency window; beyond that window, require reconciliation rather than creating an uncorrelated second order.
- Suggested order states: creating payment, awaiting approval, capture in progress, payment pending, paid, cancelled, expired, failed, and reconciliation required. Record externally reported reversal/refund status without adding an in-app refund operation.
- Reserve inventory and coupon usage in a short database transaction before creating the provider order. Do not hold a database transaction open during PayPal network calls.
- The browser return or approval is not proof of payment. Mark paid only after server verification of completed capture, expected provider order, merchant/payee, USD currency, and the exact frozen total.
- A pending capture remains pending. Never fulfill it as paid, create another capture to "retry" uncertainty, or release its reserved stock merely because a request timed out.
- Both the authenticated capture endpoint and verified provider events converge on the same idempotent order transition service. Payment, inventory consumption, and coupon consumption commit together.
- Revalidate eligibility and publication before initiating capture. Once capture is in flight, later catalog, event, or membership edits must not erase or reject a verified payment: reconcile the frozen order and preserve its history. Block new purchases against changed eligibility instead.
- A verified approval event may trigger the same capture operation if the buyer does not return, but only while the local checkout remains eligible and reserved. Expired/cancelled orders cannot be captured by a later browser return.
- Verify webhook signatures through PayPal's verification endpoint using configured webhook identity. Keep verification errors distinct from valid events, deduplicate provider event IDs, and acknowledge only after durable handling. Do not download arbitrary certificate URLs or trust webhook headers alone.
- Check provider state when reconciling ambiguous operations. A bounded, restart-safe reconciliation command processes persisted unresolved orders and reservation expiry. Unknown capture outcomes retain reservations until resolved; never guess that they failed.
- Expiry/release and capture must use compare-and-set transitions/row locks so they cannot both win. Definitively unpaid orders release reservations and coupon usage once.
- Clear only the purchased cart snapshot after payment; additions made from another tab must remain in the active cart.
- Payment secrets remain server-side and environment-configured. Start in sandbox mode; missing configuration disables payment creation explicitly, without blocking public event viewing.
- Add origin/CSRF protection and bounded request handling to new cookie-authenticated write endpoints. Preserve existing role behavior while exposing the validated principal; never weaken admin authorization to support commerce.
- Confirmation and order-status endpoints are owner-scoped. Keep durable confirmation available after refresh, return navigation, and sign-in expiry.
- Capture/reversal/refund notifications update recorded payment state. No automatic restocking for a provider-dashboard refund is implied; fulfillment/refund administration is excluded.

### F. Database additions

One schema owner updates fresh bootstrap and creates ordered upgrade scripts:

- `002_event_templates.mysql.sql`: template column/default.
- `003_event_commerce.mysql.sql`: product price precision, stable-catalog metadata, and commerce tables.

Logical tables:

| Table | Purpose / essential invariant |
|---|---|
| `commerce_carts` | One active cart per account; optimistic version |
| `commerce_cart_items` | Product/member assignment and quantity; unique cart/product/member |
| `commerce_orders` | Owner, state, frozen totals/currency, versions, provider IDs, idempotency, expiry |
| `commerce_order_items` | Durable product/event/member and price snapshots, independent of later catalog edits |
| `commerce_reservations` | Per-order/product reserved quantities with explicit lifecycle |
| `commerce_coupons` | Unique normalized code and configured validity/usage rules |
| `commerce_coupon_redemptions` | Reserved/consumed/released usage; unique order redemption |
| `commerce_settings` | Versioned buyer-fee settings; fee disabled initially |
| `commerce_payment_events` | Deduplication and durable provider-event/reconciliation state |

Use InnoDB transactions, appropriate foreign keys, unique indexes, nonnegative amount/quantity constraints, and indexes for ownership/status/expiry queries. Store USD integer cents in order snapshots. Avoid cascading deletions of financial history.

Existing migration 001 remains unchanged. Upgrade tests cover databases from before 001 and the current gallery-era schema. Migration preflights report invalid legacy prices/inventory rather than silently fixing business data. No live migration is part of implementation validation.

## Endpoint outline

All names are implementation contracts, not promises that these endpoints already exist.

| Endpoint | Purpose |
|---|---|
| `GET /account/commerce/context` | Validated member context, own beneficiaries, CSRF material |
| `GET /account/commerce/events/:event_url/products` | Member-only active catalog for a published event |
| `GET /account/commerce/cart` | Own current cart and authoritative line status |
| `POST /account/commerce/cart/items` | Add product/beneficiary/quantity |
| `PATCH /account/commerce/cart/items/:id` | Change quantity with cart-version check |
| `DELETE /account/commerce/cart/items/:id` | Remove own line with version check |
| `POST /account/commerce/checkout/quote` | Authoritative coupon/fee/total calculation |
| `POST /account/commerce/checkout` | Reserve and create an idempotent local/PayPal order |
| `POST /account/commerce/orders/:id/capture` | Verify owner/provider state and capture idempotently |
| `POST /account/commerce/orders/:id/cancel` | Cancel/release only when capture is definitively absent |
| `GET /account/commerce/orders/:id` | Owner-only durable confirmation/status |
| `POST /payments/paypal/webhook` | Verified provider events; no browser authentication substitute |
| `/auth/commerce/coupons` and `/:id` | Admin list/create/update/deactivate coupons |
| `GET/PUT /auth/commerce/settings` | Read/update versioned fee settings |

Use the repository's `{ Status, Result, Error }` response pattern, with field errors where useful. Distinguish invalid input (400), missing identity (401 on new commerce endpoints), forbidden identity/eligibility (403), unavailable resources (404), stale versions/stock/quote conflicts (409), and provider/storage failures (appropriate 5xx). Paginate catalog/admin listings; never return an unbounded order history.

## Implementation todos and exact file ownership

IDs below are reflected into session SQL. No markdown checkboxes are used. Tests belong to the same unit as their behavior; final integration adds cross-unit coverage. New files are created only when this plan is approved.

### SF-00 - Establish additive schemas and disposable database fixtures

**Complexity:** complex. **Risk:** high. **Dependencies:** none.

Files:
- Modify `datastore\Schema\BackendSchema.mysql.sql`.
- Create `datastore\Migrations\002_event_templates.mysql.sql`.
- Create `datastore\Migrations\003_event_commerce.mysql.sql`.
- Create `backend\Tests\CommerceFixtures.js`.
- Create `backend\Tests\CommerceSchema.integration.js`.

Contract: fresh bootstrap and ordered upgrades produce the same template/catalog/commerce schema without losing existing records.

Acceptance:
- Existing events default to Signature; existing content, publication, prices, and image references survive.
- Stable catalog metadata, exact USD precision, unique ownership/idempotency constraints, and nonnegative monetary/inventory bounds are enforced.
- Fresh, current-schema upgrade, and pre-001 upgrade are exercised against uniquely named disposable databases.
- Preflight and rollback notes cover MySQL DDL implicit commits; a failed migration is not silently marked applied.
- Test connections and created databases are cleaned up on success and failure.

Failure blocks persistence and purchasing; do not substitute browser-only storage.

### SF-01 - Define event/template and form data contracts

**Complexity:** moderate. **Risk:** medium. **Dependencies:** SF-00.

Files:
- Create `backend\Utilities\EventTemplates.js`.
- Modify `backend\Utilities\EventValidation.js`.
- Modify `backend\Controllers\EventAccess.js`.
- Modify `backend\Tests\EventValidation.test.js`.
- Modify `backend\Tests\EventAccess.test.js`.
- Create `frontend\src\Utilities\EventTemplates.js`.
- Create `frontend\src\Utilities\EventTemplates.test.js`.
- Modify `frontend\src\Utilities\EventValidation.js`.
- Modify `frontend\src\Utilities\EventValidation.test.js`.

Contracts: `resolveEventTemplate(id)`, `prepareEventPayload(details)`, `eventFromRow(row)`, event write validation.

Acceptance:
- Both registered IDs round-trip; frontend/backend catalog parity is checked.
- Omitted create/update, legacy missing reads, malformed/unknown writes, and unavailable stored IDs follow the specified rules.
- Keep gallery CSV, drafts, publication validation, and date fields unchanged.
- Consolidate directly dependent product form validation here: IDs/versions, two-decimal price validation, and nonnegative inventory, without serializing local files.

Failure blocks template selection and affected form saves; no silent fallback on invalid writes.

### SF-02 - Make product editing safe for commerce references

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-00, SF-01.

Files:
- Modify `backend\Utilities\MemberProductWrites.js`.
- Create `backend\Utilities\MemberProductValidation.js`.
- Modify `backend\Controllers\AdminAccess.js`.
- Modify `backend\Tests\MemberProductWrites.test.js`.
- Create `backend\Tests\MemberProductValidation.test.js`.
- Create `backend\Tests\MemberProducts.integration.js`.
- Modify `frontend\src\Components\AdminAccess\EditMemberProducts.jsx`.
- Modify `frontend\src\Components\AdminAccess\AddMemberProducts.jsx`.

Contract: save/update/retire a product collection without changing existing IDs or destroying sales/reservation references.

Acceptance:
- Round-trip IDs and versions; reject cross-event IDs and stale writes.
- Retire omitted/deleted products, preserve referenced rows, and reject destructive event deletion with a clear conflict.
- Prevent negative inventory, inventory below reservations, and stale replenishment after a sale.
- Atomic validation/update: an invalid product must not partially replace a collection.
- Existing empty-list and product-save warning behavior remains explicit, with retirement replacing destructive deletion where necessary.

Failure blocks checkout; never retain delete-and-reinsert writes alongside orders.

### SF-03 - Add trusted member context and catalog access

**Complexity:** moderate. **Risk:** high. **Dependencies:** SF-00, SF-02.

Files:
- Modify `backend\Middlewares\TokenValidation.js`.
- Create `backend\Middlewares\CommerceAuthorization.js`.
- Create `backend\Controllers\MemberCatalogAccess.js`.
- Create `backend\Routes\MemberCatalogRoutes.js`.
- Create `backend\Tests\CommerceAuthorization.test.js`.
- Create `backend\Tests\MemberCatalogAccess.test.js`.

Contracts: validated principal/context and account-scoped eligible-member/catalog reads.

Acceptance:
- Missing/invalid tokens, non-members, foreign beneficiary IDs, and unpublished events are rejected.
- Token identity and database role/category checks are authoritative; clients cannot choose the purchasing account.
- New write protection supports Member and separately authorized admin commerce actions without weakening existing route roles.
- Product projection excludes account/private operational data; lists are bounded and errors differ from empty results.
- Tests cover existing middleware role consumers plus the new principal.

Failure blocks member storefront and purchasing, not public event content.

### SF-04 - Implement account carts and exact money primitives

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-00, SF-02, SF-03.

Files:
- Create `backend\Utilities\CommerceMoney.js`.
- Create `backend\Utilities\CartWrites.js`.
- Create `backend\Controllers\CartAccess.js`.
- Create `backend\Routes\CartRoutes.js`.
- Create `backend\Tests\CommerceMoney.test.js`.
- Create `backend\Tests\CartWrites.test.js`.
- Create `backend\Tests\CartAccess.test.js`.

Contracts: bounded multi-event cart CRUD, cart-version conflicts, exact USD cent conversion and rounding.

Acceptance:
- Foreign carts/items/members are inaccessible; beneficiary target matches are enforced.
- Empty, duplicate, excessive, fractional, negative, retired, unpublished, and sold-out cases are explicit.
- Aggregate inventory per product across beneficiaries; stale-tab edits cannot overwrite a newer cart.
- No client pricing is trusted and no arithmetic uses floating-point currency multiplication.

Failure blocks checkout; do not fall back to an unvalidated local cart.

### SF-05 - Implement coupon and fee administration/pricing

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-00, SF-03, SF-04.

Files:
- Create `backend\Utilities\CheckoutPricing.js`.
- Create `backend\Controllers\CommerceSettingsAccess.js`.
- Create `backend\Routes\CommerceSettingsRoutes.js`.
- Create `backend\Tests\CheckoutPricing.test.js`.
- Create `backend\Tests\CommerceSettingsAccess.test.js`.
- Create `frontend\src\Components\AdminAccess\CommerceSettings.jsx`.
- Create `frontend\css\CommerceSettings.module.css`.

Contracts: authoritative quote calculation, admin coupon CRUD/deactivation, versioned fee settings.

Acceptance:
- Default fee is disabled; enablement requires valid configured rates.
- Percentage/fixed coupons, expiry boundaries, per-account/global limits, invalid codes, no stacking, and non-positive totals are covered.
- Fee-after-discount arithmetic and cent rounding are exact; stale settings force quote review.
- Admin-only writes are CSRF protected; disabling/editing a coupon never rewrites existing orders.

Failure blocks discounted/fee-bearing checkout; do not silently ignore invalid codes or add undisclosed charges.

### SF-06 - Implement durable orders, reservations, and transitions

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-00, SF-02, SF-04, SF-05.

Files:
- Create `backend\Utilities\OrderWrites.js`.
- Create `backend\Utilities\OrderTransitions.js`.
- Create `backend\Tests\OrderWrites.test.js`.
- Create `backend\Tests\OrderTransitions.test.js`.
- Create `backend\Tests\Orders.integration.js`.

Contracts: reserve a complete cart, freeze an order, apply idempotent payment/release transitions, reconcile captured totals.

Acceptance:
- Multi-event stock and coupon holds are all-or-nothing under concurrent requests.
- Snapshot prices/beneficiaries/events/settings and reject changed ownership, eligibility, publication, or quote versions.
- Idempotency keys bind to account/action/payload; paid/cancelled transitions cannot race or double-consume stock.
- Provider uncertainty never releases potentially paid inventory; transaction boundaries exclude network waits.
- Failures and restarts preserve recoverable order state and close dedicated connections.

Failure blocks all payment creation.

### SF-07 - Implement the PayPal server adapter

**Complexity:** moderate. **Risk:** high. **Dependencies:** SF-04.

Files:
- Create `backend\Services\PayPalClient.js`.
- Create `backend\Configurations\Commerce.js`.
- Create `backend\Tests\PayPalClient.test.js`.
- Create `backend\Tests\PayPal.sandbox.integration.js`.

Contracts: OAuth token acquisition, create/get/capture order, capture lookup, and webhook-signature verification.

Acceptance:
- Sandbox/live hosts are explicitly configured; secrets never enter browser bundles, logs, or fixtures.
- Orders use exact USD amounts and consistent PayPal breakdowns with separate discount/fee values.
- Timeouts, malformed/provider error responses, rate limits, duplicate request IDs, pending captures, and amount/payee mismatches remain explicit.
- Retry only idempotent operations with the same persisted request ID; do not turn uncertain capture into failure/success by assumption.
- Opt-in sandbox checks are distinguished from mocked provider tests.

Failure disables purchasing explicitly; no mock-success production fallback.

### SF-08 - Orchestrate checkout and owner-scoped confirmation

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-03, SF-05, SF-06, SF-07.

Files:
- Create `backend\Controllers\CheckoutAccess.js`.
- Create `backend\Routes\CheckoutRoutes.js`.
- Create `backend\Tests\CheckoutAccess.test.js`.
- Create `backend\Tests\Checkout.integration.js`.

Contracts: quote, create checkout, capture, cancel, and get an owned order.

Acceptance:
- Reserve locally before the network call; persist provider identifiers and reconcile ambiguous creation/capture.
- Review quoted total/version before creating an approval flow; never accept client-computed amounts.
- Return approval does not imply paid; verify completed capture, merchant, currency, amount, and order correlation.
- Repeat clicks/returns cannot double-charge; cancellation cannot release a capture in flight.
- Confirmation exposes only the owner's frozen order and preserves a separately modified cart.

Failure leaves recoverable state and a truthful pending/error UI.

### SF-09 - Add verified webhooks and recovery processing

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-06, SF-07, SF-08.

Files:
- Create `backend\Controllers\PayPalWebhook.js`.
- Create `backend\Routes\PaymentWebhookRoutes.js`.
- Create `backend\Jobs\ReconcilePayments.js`.
- Create `backend\Tests\PayPalWebhook.test.js`.
- Create `backend\Tests\ReconcilePayments.test.js`.
- Create `backend\Tests\PaymentRecovery.integration.js`.

Contracts: verify/deduplicate provider events and reconcile persisted unresolved orders/reservations in bounded batches.

Acceptance:
- Forged, duplicate, out-of-order, wrong-payee, and mismatched-amount events cannot mark orders paid.
- Durable recording precedes acknowledgement; verification/storage outages remain retryable.
- Browser capture and webhook capture converge on one transition service.
- Expiry cannot race completed/pending/ambiguous capture into double stock release.
- Worker restarts and multiple invocations are safe; database/provider resources are released.

Failure blocks live checkout enablement, not template rendering.

### SF-10 - Build the member storefront and shared commerce client

**Complexity:** moderate. **Risk:** medium. **Dependencies:** SF-03, SF-04, SF-08.

Files:
- Create `frontend\src\Utilities\CommerceApi.js`.
- Create `frontend\src\Utilities\CommerceApi.test.js`.
- Create `frontend\src\Components\UserAccess\EventMemberProducts.jsx`.
- Create `frontend\src\Components\RouteManagement\MemberCommerceRoutes.jsx`.
- Create `frontend\css\EventMemberProducts.module.css`.
- Create `frontend\Tests\CommerceFixtures.js`.
- Create `frontend\Tests\MemberCommerce.spec.js`.

Contracts: credentialed commerce API client, member gating, catalog cards and Add to cart.

Acceptance:
- No metadata/prices flash for guests or non-members; server authorization remains decisive.
- Own eligible members, quantity bounds, sold-out/retired items, error/retry, and empty-catalog states are explicit.
- Additions work across events and do not reset the public event or galleries.
- CSRF material is sent for writes; stale responses on event/account changes cannot populate another context.

Failure prevents Add to cart while leaving public event details available.

### SF-11 - Extract Classic and build Signature

**Complexity:** complex. **Risk:** medium. **Dependencies:** SF-01, SF-10.

Files:
- Modify `frontend\src\Components\UserAccess\ViewEvent.jsx`.
- Create `frontend\src\Components\UserAccess\EventTemplates\ClassicEventTemplate.jsx`.
- Create `frontend\src\Components\UserAccess\EventTemplates\SignatureEventTemplate.jsx`.
- Create `frontend\src\Components\UserAccess\EventTemplates\EventViewRenderer.jsx`.
- Create `frontend\css\SignatureEventTemplate.module.css`.
- Create `frontend\src\Utilities\EventViewFormatting.js`.
- Create `frontend\src\Utilities\EventViewFormatting.test.js`.
- Create `frontend\Tests\EventTemplates.spec.js`.
- Modify `frontend\Tests\EventGallery.spec.js`.
- Modify `frontend\Tests\GalleryFixtures.js`.

Contracts: static template resolution and presentation-only rendering with a shared member-products slot.

Acceptance:
- Both templates show the same event data, ordered galleries, and member storefront; Signature is the default.
- Preserve Classic's existing orange/dark styling tests by explicitly selecting Classic in those fixtures.
- Verify Signature at 390, 768, 1440, and 1920 pixels, long titles/content, empty hubs, missing/broken imagery, and supported rich-text formats.
- Validate keyboard focus, map-link naming, no viewport overflow, readable contrast, and clearance from fixed navigation/footer.
- Unknown-template fallback is diagnostic, route changes clear stale event state, and draft/public access remains unchanged.
- Date-only display is stable across positive/negative timezone offsets; malformed/missing fields never show "Invalid Date."

Failure blocks the template feature; do not ship a selector with incomplete renderers.

### SF-12 - Wire template cards into event editing and copying

**Complexity:** moderate. **Risk:** medium. **Dependencies:** SF-01, SF-02, SF-11.

Files:
- Create `frontend\src\Components\AdminAccess\EventTemplateSelector.jsx`.
- Create `frontend\css\EventTemplateSelector.module.css`.
- Modify `frontend\src\Components\AdminAccess\CreateEvent.jsx`.
- Modify `frontend\src\Components\AdminAccess\EditEvent.jsx`.
- Modify `frontend\src\Components\AdminAccess\Events.jsx`.
- Modify `frontend\src\Utilities\SaveEvent.test.js`.
- Create `frontend\Tests\EventTemplateEditor.spec.js`.

Acceptance:
- Both forms default/select/save/reopen correctly; Copy preserves the selected template and remains a draft.
- Cards match current headings and square section outlines, use radio semantics, and expose only registered templates.
- Selection alone makes no network write and does not remount/reset image queues or product edits.
- Failed saves retain the choice; busy states block selection; unavailable stored IDs require explicit correction.
- Existing pending-upload and partial product-save warnings remain intact.

Failure blocks end-to-end template selection.

### SF-13 - Build cart, checkout, and durable confirmation UI

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-05, SF-08, SF-10.

Files:
- Modify `frontend\src\Components\UserAccess\ShoppingArea.jsx`.
- Modify `frontend\src\Components\UserAccess\ShoppingCheckout.jsx`.
- Create `frontend\src\Components\UserAccess\OrderConfirmation.jsx`.
- Create `frontend\css\Commerce.module.css`.
- Modify `frontend\src\Components\UserAccess\AccountLogin.jsx`.
- Modify `frontend\src\Components\UserAccess\NavigationBar.jsx`.
- Create `frontend\Tests\Checkout.spec.js`.

Acceptance:
- Multi-event cart groups lines by event/beneficiary and supports quantity/removal with version-conflict recovery.
- Coupon application, disabled/enabled fee, exact totals, expiry/stock changes, and explicit re-review are visible.
- Hosted PayPal approval/return/cancel works without relying on a success query parameter as payment proof.
- Refresh, duplicate clicks, pending payment, network timeout, stale login, and another tab's cart changes are recoverable.
- Sign-in returns only to validated local application paths; account switching cannot expose another cart/order.
- No shipping/tax/refund UI or fake success screen is introduced.

Failure blocks customer purchasing even if the API is complete.

### SF-14 - Wire routes, operations, and end-to-end release gates

**Complexity:** complex. **Risk:** high. **Dependencies:** SF-09, SF-11, SF-12, SF-13.

Files:
- Modify `backend\index.js`.
- Modify `backend\package.json`.
- Modify `frontend\src\App.jsx`.
- Modify `frontend\src\Components\AdminAccess\AdminDashboard.jsx`.
- Modify `backend\Tests\Events.integration.js`.
- Create `backend\Tests\Commerce.integration.js`.
- Create `frontend\Tests\EventCommerceLifecycle.spec.js`.

Acceptance:
- Register member/admin/provider routes with correct authorization/body handling; support required HTTP methods without broadening allowed origins.
- Replace placeholder cart/checkout routing, register confirmation and commerce settings pages, and preserve existing navigation/routes.
- Add an explicit bounded reconciliation command, including graceful shutdown and operational configuration validation.
- End-to-end: create/edit/select/copy/publish, member eligibility, multi-event cart, coupon/fee quote, PayPal approval/capture, confirmation, stock/coupon consumption, and saved event revisit.
- Fresh/current/pre-001 database paths and non-member/draft/foreign-order denial are verified.
- PayPal sandbox approval, real capture, verified webhook delivery, cancellation, and reconciliation are demonstrated separately from mocks.

Failure blocks live enablement. No partial checkout or unverified payment flow is presented as complete.

## Dependency order

Arrows point from prerequisite to dependent. Independent tasks can be worked separately without sharing file ownership; no agents or workflows are launched by this plan.

| Wave | Sub-features |
|---|---|
| 1 | SF-00 |
| 2 | SF-01 |
| 3 | SF-02 |
| 4 | SF-03 |
| 5 | SF-04 |
| 6 | SF-05, SF-07 |
| 7 | SF-06 |
| 8 | SF-08 |
| 9 | SF-09, SF-10 |
| 10 | SF-11, SF-13 |
| 11 | SF-12 |
| 12 | SF-14 |

Each source/test file above has one owner. Shared runtime registration is consolidated in SF-14. Earlier browser units use scoped fixtures; route-registration and full real integration are checked again in SF-14.

## Validation and completion

- Tests first within each sub-feature, using existing Node and Playwright tooling. No new test framework or payment SDK is required by this design.
- Run targeted checks during development; run the complete frontend/backend unit suites and relevant browser suites at integrated completion.
- `npm --prefix .\frontend test`
- `npm --prefix .\backend test`
- `npm --prefix .\frontend run test:e2e`
- ESLint on changed frontend JS/JSX, backend syntax checks, `npm --prefix .\frontend run build`, and `git --no-pager diff --check`.
- Opt-in MySQL integration creates/drops only uniquely named test databases; never run migration proof against the actual application database.
- Real database tests establish stable IDs, schema upgrades, exact prices, cross-event stock races, coupon usage races, idempotency, crash recovery, and immutable order history.
- Browser tests use anonymous/member/non-member/admin identities and actual DOM interaction, not only state mocks. Inspect representative template, selector, catalog, cart, checkout, and confirmation screenshots.
- Payment tests use deterministic provider doubles for failure/race scenarios plus separately verified PayPal sandbox create/approve/capture/webhook flows.
- Sandbox credentials, a configured sandbox merchant/buyer, and a reachable HTTPS webhook endpoint are required for provider proof. Their absence is a named validation blocker, not a reason to enable live payments or claim sandbox completion.
- Deployment order: additive schema, backend/supporting recovery command, frontend, then explicit payment enablement after sandbox and operational checks. The buyer fee remains disabled until configured.
- Migration/application rollback must preserve orders, snapshots, coupon use, and reservations. Prefer disabling new checkout creation while reconciling in-flight payments; never drop commerce records to roll back a UI.
- No commit, push, production migration, real charge, or deployment is authorized by this planning request.

## Design alternatives and risk review

### Candidate decompositions

Scores use dependency clarity/testability/risk mitigation/context fit/pattern alignment with weights 0.25/0.25/0.20/0.15/0.15.

| Candidate | Scores | Weighted | Decision |
|---|---|---|---|
| Contract/schema first, then commerce core and reusable presentation | .95/.95/.90/.85/.95 | .925 | Selected: stable identities and payment invariants precede new purchasing UI |
| Template/API first, retrofit storage and checkout later | .80/.80/.60/.85/.85 | .775 | Not selected: attractive UI can conceal destructive product saves and missing payment guarantees |
| PayPal spike first, then derive all schema/UI contracts | .75/.85/.95/.80/.75 | .823 | Provider sandbox checks remain a gate, but PayPal cannot resolve local ownership/product identity design |

### Five attacked failure modes

1. **Selection is discarded by an allowlist or Copy:** explicit mapping/default/omission tests in SF-01 and Save/Copy browser checks in SF-12.
2. **Event edit destroys products referenced by carts/orders:** stable IDs, retirement, versions, and protected deletion in SF-00/SF-02.
3. **Wrong account/member receives products or sees prices:** verified principal, current role, ownership/category checks at catalog/cart/reservation/capture boundaries in SF-03/SF-04/SF-06/SF-08.
4. **Concurrent captures, expiry, or retries oversell/double-charge:** durable idempotency, row locks, frozen amounts, verified provider state, one transition service, and reconciliation in SF-06 through SF-09.
5. **A polished default breaks legacy content or duplicates business logic:** Classic retained, static template contracts, shared galleries/storefront, isolated styling, timezone/accessibility tests in SF-11/SF-12.

### Defensive coverage binding

| Category | Mandatory coverage |
|---|---|
| Input bounds | Template IDs, price precision, quantity/cart limits, coupon codes, request sizes: SF-01/02/04/05/08 |
| Resource limits | Bounded catalog/cart/worker batches and provider timeouts: SF-03/04/07/09 |
| Error recovery | Distinct validation/auth/provider/pending states, no empty/success fallbacks: SF-03 through SF-14 |
| Durability | Transactional schema, immutable orders, event deduplication, restart recovery: SF-00/02/06/08/09 |
| Consistency | Schema parity, template parity, stock/coupon conservation, single capture: SF-00/01/02/06/09 |
| Boundary values | Empty/missing/unknown templates, zero stock, exact cent rounding, coupon expiry and usage limits: SF-01/02/04/05 |
| Performance | No database locks across network calls; indexed account/product/expiry queries: SF-00/04/06/07/09 |
| Resource lifecycle | Dedicated connections, abort/stale request handling, existing lightbox cleanup: SF-00/02/06/09/10/11 |
| Untrusted input | Identity, ownership, CSRF, parameterized SQL, static template resolution, verified webhooks: SF-01/03/04/06/08/09 |
| API misuse | Save-only template changes, version/idempotency binding, approval != payment, invalid transition rejection: SF-01/06/08/12/13 |

Presentation-only units do not own database durability or provider secrets; they consume the shared contracts and must not bypass them.

### Extension/ripple decisions

- **Static template registry rather than a template engine:** adds two view implementations and metadata/resolver modules; avoids executable user content, new build systems, and duplicated fetching/payment logic.
- **Frontend/backend ID lists with parity tests:** small explicit duplication fits the independent packages; avoids a shared runtime package or metadata API solely for two templates.
- **Stable product writes rather than preserving replacement semantics:** changes the product save path and editor metadata, but is required to keep cart, reservation, and order references correct.
- **One multi-event PayPal order for one merchant:** matches the cart requirement without introducing marketplace sellers or split payouts.
- **Server-persisted carts and idempotent order snapshots:** more storage than a browser cart, but required for membership ownership, checkout returns, concurrent tabs, and recoverable payments.
- **Server REST adapter and verified postback webhooks:** no mandatory new SDK or custom certificate-fetching layer; isolate provider behavior behind a testable module.

**Overall risk: high**, driven by the confirmed purchasing scope, not by the template selector. Medium/high-risk sub-features each include multiple defensive acceptance criteria. The template and storefront must not conceal incomplete commerce work.

## External contract references

Official PayPal sources used for the plan:

- Orders create/approval/capture flow: https://developer.paypal.com/api/rest/integration/orders-api/
- Order amount equation and positive-total requirement: https://developer.paypal.com/api/orders/v2/definitions/amount_with_breakdown
- Amount breakdown fields: https://developer.paypal.com/api/orders/v2/definitions/amount_breakdown/
- Idempotency reference for implementation verification: https://developer.paypal.com/api/rest/reference/idempotency/
- Webhook verification, acknowledgement, and sandbox guidance: https://developer.paypal.com/api/rest/webhooks/rest/

Verify current provider limits and enabled merchant capabilities during SF-07. No PayPal processing rate, live merchant configuration, or successful payment was inferred from documentation.
