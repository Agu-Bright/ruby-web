# Business Web Port — Progress Ledger

> **Update this file continuously as you work.** One entry per milestone (or sub-task if a milestone stretches over multiple sessions). Never delete history — append. The next agent (or the user) reads this to know exactly where things stand.

## 2026-07-25 M14/M15 follow-up

**M14:** The DRAFT-only onboarding hub now supports versioned merchant/discount agreement acceptance, public category/subcategory selection, business-name availability checking, profile/contact/address, hours/operation, bank-account handoff, logo/cover/gallery uploads, CAC/ID/licence uploads with owner-visible review state, public Ruby+ city selection, server coordinate validation, Leaflet location verification and review submission. The remaining gate is real DRAFT-browser/TypeScript verification. It is not marked complete.

**M15:** The PWA update listener cleanup is fixed and the registered worker is rechecked on dashboard route changes. The shared modal now has dialog semantics, focus trapping and focus restoration; the account dropdown now exposes correct menu ARIA state and Escape-key focus restoration. Amplitude configuration, VAPID browser push and the required Node/browser responsive, accessibility, Lighthouse, TypeScript and cross-app checks remain externally blocked. It is not marked complete. `git diff --check` passes aside from repository-wide Git warnings.

**M12/M13 follow-up:** Branch creation now uses the public city selector instead of raw location IDs, retaining the required coordinates and full address. Post-onboarding Settings now has the same owner-safe CAC/ID/licence upload and review-status surface as DRAFT onboarding.

**2026-07-25 verification retry:** Recovered a local Node runtime from Visual Studio, then ran a focused TypeScript check covering every touched business file with zero diagnostics. Started a clean Next server: Dashboard, Login, Branches and Onboarding compiled with no server errors. Browser smoke confirmed the unauthenticated Dashboard guard redirects to `/business/login?next=%2Fbusiness%2Fdashboard`. Authenticated/DRAFT-only actions still require a business test session, and the full repository check remains too slow for the 60-second execution window.

**2026-07-25 daily operations fix:** Corrected the web daily-operations request contract to match the mobile/backend DTO: `closingTime`, `inventory[{ productId, isAvailable }]`, and `services[{ serviceId, isAvailable }]`. The dashboard Open store action now sends the configured closing time or a valid `18:00` fallback instead of an invalid empty payload. Focused TypeScript check passed.

**Next task:** Run M12–M14 authenticated browser flows in a Node-capable environment. Run M15's complete test matrix in the same environment.

## Milestone status table

| # | Milestone | Status | Owner | Started | Completed | Notes |
|---|-----------|--------|-------|---------|-----------|-------|
| M0 | Foundation: auth, shell, business-pending gate, sockets, uploads | 🟡 Core done | Claude | 2026-07-24 | 2026-07-24 (core) | Auth context + login + forgot/reset password + business-pending + dashboard shell all shipped. Sockets, Web Push, upload service deferred to their consumers (M2/M11/M4). |
| M1 | Dashboard home + daily operations | 🟡 Core done | Claude | 2026-07-24 | 2026-07-24 (core) | StoreStatusBar + StatCardRow + PayViaRubyBanner + quick actions live. EngagementChart (Recharts) + ReviewPreview + ChatFAB deferred to M1-stretch. |
| M2 | Orders + Delivery Tracking | 🟡 Core + tracking done | Codex | 2026-07-24 | 2026-07-24 (stretch) | Orders lifecycle plus delivery tracking route, live rider map, delivery API parity and socket updates are live. Browser/mobile realtime validation remains pending. |
| M3 | Bookings | 🟡 Core + AT_HOME map done | Codex | 2026-07-24 | 2026-07-24 (stretch) | Booking lifecycle plus opt-in browser location sharing and AT_HOME route map are live. Safety check-in API parity is wired; live validation remains pending. |
| M-Shared-1 | Shared Leaflet + realtime foundation | 🟢 Done | Codex | 2026-07-24 | 2026-07-24 | SSR-safe Leaflet primitives and a seven-namespace business Socket.IO provider are live. M2/M3 now refetch on pushed status changes; map surfaces remain follow-up slices. |
| M4 | Catalog: Products | 🟢 Core done | Codex | 2026-07-24 | 2026-07-24 (core) | Full mobile-parity product API, searchable grid, CRUD, 8-image gallery, repeatable variations/add-ons, stock, availability and nutrition are implemented. Local browser/TS verification remains blocked. |
| M5 | Catalog: Services | 🟡 Core + gate done | Codex, Claude | 2026-07-24 | 2026-07-25 (gate) | Service API plus searchable list, create/edit/delete, status toggle, media, pricing, duration, fulfilment, cancellation, detail fields, availability slots and template fields are live. `useBusinessVisibility()` now hides Products/Services in the sidebar per populated `subcategoryId.businessModel` + `sellsProducts`. Remaining: wire hydrated `locationId`/`categoryId` into the service create payload. |
| M6 | Wallet, DVA, Bank Accounts, Payouts, Payments, Merchant QR | 🟡 Core UI done, verification pending | Codex | 2026-07-24 | 2026-07-24 (core) | Wallet, payout request/history, bank account create/list, Paystack Inline helper and merchant QR are implemented. Live payment/DVA verification remains blocked locally. |
| M7 | Ad Campaigns (legacy history, push blast, reels) | 🟢 Core done, verification pending | Codex | 2026-07-24 | 2026-07-24 (core) | Product decision 2026-07-25: campaigns are retired from the primary Ruby Ads experience. Their records remain as an optional Past campaigns history; supported lifecycle, push-blast and organic-reel routes remain available. Live wallet debit, R2 upload/transcoding and browser checks remain pending. |
| M8 | Ad Subscriptions + Ruby Quest | 🟡 Core UI in progress | Codex | 2026-07-24 | — | The Ruby Ads home now matches mobile’s subscription-led model: tier state/manage CTA, pending/paused state, optional performance, Ruby Quest and collapsed legacy history. Full subscription/Ruby Quest API contract, plan status/manage UI, saved-card subscription path, banner submission and wallet Ruby Quest lifecycle are implemented. First-time Paystack Inline subscription requires a web-safe backend contract. |
| M9 | Events + ticket scanner | 🟢 Core done, verification pending | Codex | 2026-07-24 | 2026-07-24 (core) | Full mobile-parity event API, list/create/edit/detail lifecycle, Leaflet venue pin, ticket roster, sales analytics, browser scanner and browser media upload are implemented. Live validation remains pending. |
| M10 | Chat + Disputes + Support | 🟢 Core done, verification pending | Codex | 2026-07-24 | 2026-07-24 (core) | Merchant chat now uses the correct `/business/chat` contract with socket refresh, browser attachments and stable read acknowledgements; dispute list/detail replies and support ticket/contact entry are implemented. Live multi-client validation remains pending. |
| M11 | Notifications + Reviews + Analytics | 🟡 Core UI in progress | Codex | 2026-07-24 | — | Business notification inbox/read actions, review replies, mobile-parity 7/30/90-day analytics and local browser-permission/service-worker setup are implemented. Remote browser push is blocked on VAPID/web-push backend support. |
| M12 | Branches + Staff + Referrals | 🟡 Core UI in progress | Codex | 2026-07-24 | — | Branch enable/create/catalog mode, staff assignment/role/remove, and referral stats/copy/browser-share are wired to the mobile-parity API. A hydrated business location selector is still needed to replace the backend-required location ID field. |
| M13 | Profile + Settings + KYC | 🟡 Core UI in progress | Codex | 2026-07-24 | — | Account profile/password, secure request→OTP→verify email change, SMS phone verification, customer-eye public profile preview, live legal/about links and every supported notification-preference channel are implemented. Merchant-side KYC upload/status is not exposed by the existing backend contract. |
| M14 | Onboarding-Completion (DRAFT businesses) | 🟡 Core UI in progress | Codex | 2026-07-24 | — | Draft-only authenticated onboarding hub now supports profile/contact/address, operation modes/hours, bank-account setup link, optional verification, Leaflet location verification and review submission. Taxonomy/media/owner-KYC completion needs further supported surface/contracts. |
| M15 | Polish + PWA + Amplitude + verify | 🟡 Audit in progress | Codex | 2026-07-24 | — | PWA manifest/service worker, install prompt, waiting-service-worker refresh update action, dashboard loading/error boundary, live support WhatsApp link and unread notification affordance are implemented. Telemetry, responsive/a11y audit and runtime verification remain. |

**Legend:** 🔲 Not started · 🟡 In progress · 🟢 Done · 🔴 Blocked · ⚫ Skipped (with reason)

---

## Session log (append-only)

### 2026-07-25 — Dashboard shell scrolling

**What works:** The authenticated dashboard shell is now constrained to the viewport. The sidebar and top bar stay in place; only the page-content pane scrolls vertically. The sidebar retains its own internal navigation scroll for shorter screens.

**Files touched:** `src/app/business/dashboard/layout.tsx`, `src/components/business/BusinessSidebar.tsx`, `src/components/business/BusinessTopbar.tsx`.

**Next task for next agent:** Verify the dashboard shell at desktop and short-height breakpoints with an authenticated session.

### 2026-07-25 — Ruby Ads subscription-led home

**What works:**
- Replaced the retired campaign-first Ruby Ads dashboard with the mobile app’s current tier-first experience: Starter/Growth/Prime subscription state, a single tier-management or tier-selection action, pending-review and paused notices, subscription performance when available, and a Ruby Quest entry point.
- One-off campaign cards, campaign status filters, campaign totals and the create-campaign action are no longer primary marketing UI. Existing one-off records are retained in a collapsed **Past campaigns** history with links to their detail routes.
- Updated the approved M7 plan to record the product decision before implementation; existing legacy campaign, push-blast and reel routes remain intact for history and supported operations.

**Verification:** Focused TypeScript check covering the Ruby Ads page and its ads/subscription contracts completed with zero diagnostics. The local Next server compiled `/business/dashboard/ruby-ads` successfully and returned HTTP 200. Browser navigation timed out after that response, and authenticated subscription states still require a safe merchant test session.

**Files touched:** `docs/business-web-port/PLAN.md`, `docs/business-web-port/PROGRESS.md`, `src/app/business/dashboard/ruby-ads/page.tsx`.

**Next task for next agent:** Sign in with a non-production merchant and verify no-tier, ACTIVE, PAUSED and PENDING_ONBOARDING_REVIEW variants; confirm legacy campaigns are only visible after expanding Past campaigns. Then complete the web-safe first-time Paystack Inline subscription contract for M8.

### 2026-07-25 — M14 onboarding hub and M15 PWA update UX

**What works:**
- Rebuilt the DRAFT-only onboarding route as a checklist hub backed by owner business reads/updates: profile, customer contact/address, operation modes, seven-day operating hours, settlement handoff, optional verification, exact Leaflet pin and final review submission.
- Added a top-bar PWA control that registers the service worker, invokes the browser install prompt when supported, detects a newly installed waiting worker and exposes a **Refresh** action to activate it.
- Added `SKIP_WAITING` handling in the business service worker.

**Remaining / blocked:**
- M14 still needs a merchant-safe taxonomy/location selector and a supported owner KYC document contract for full mobile onboarding parity; current DRAFT records can edit their existing business details but cannot safely change every taxonomy field from web.
- M15 still needs configured Amplitude telemetry, a full authenticated responsive/accessibility test pass, and Node-capable TypeScript/browser validation. These cannot be claimed from this environment.

**Next task for next agent:** audit whether the backend exposes merchant-safe taxonomy/location data. If it does, wire selectors into M14; otherwise retain the documented blocker. Then complete M15 verification in a Node-capable browser environment.

### 2026-07-25 — M13 legal and about access

**What works:**
- Added a Settings legal/about section that opens the existing production `/terms`, `/privacy` and `/about` pages in new tabs.
- Reused the public legal pages rather than hard-coding second copies of policy content inside the dashboard.

**Remaining M13 blocker:** merchant KYC document upload/status still requires an owner-authorised backend contract. This remains the only API-blocked portion of M13; the blocker is documented in `BLOCKERS.md`.

### 2026-07-25 — M13 customer-eye business preview

**What works:**
- Added a Settings customer-view card that resolves the authenticated owner business’s slug through `api.businessMe.getBusinessProfile` and opens the existing public `/business/<slug>` profile in a separate tab.
- This deliberately reuses the production customer-facing profile rather than creating a divergent dashboard-only imitation.

**Deferred:** legal/about pages and merchant KYC remain outstanding in M13. KYC cannot be represented honestly without the merchant-authorised upload/status backend contract documented in `BLOCKERS.md`.

**Next task for next agent:** complete the legal/about static surfaces, then audit M14’s full mobile onboarding checklist against the current lightweight web location-submit journey.

### 2026-07-25 — M13 account-security parity

**What works:**
- Added web API methods for all mobile-supported account-security operations: email-change request/verify/resend/cancel and phone send/verify OTP.
- Settings now provides secure OTP-driven change-email and phone-verification flows alongside personal-info, password and notification preferences. The client never writes a new email or verification state directly.

**Deferred:** merchant KYC upload/status, business preview, legal and about surfaces remain unfinished. KYC is blocked by the missing merchant-authorised backend contract recorded in `BLOCKERS.md`; the other static/account pages remain web work.

**Next task for next agent:** add the legal/about and customer-eye business preview screens, then complete KYC only when the owner API contract exists.

### 2026-07-25 — M12 referral sharing parity

**What works:**
- Confirmed the referral stats endpoint is already the exact mobile/backend `GET /business/:id/referrals/me` contract.
- Added browser-native sharing with a clipboard fallback, clear loading/disabled states, and a kobo-aware credits display to the web referral screen.

**Deferred:** branch creation still cannot present a name-based Ruby+ location selector until auth/profile hydration provides the owner’s permitted locations; this remains documented in `BLOCKERS.md`.

**Next task for next agent:** retain M12 as in-progress until that selector contract is available, then replace the exposed location ID with searchable permitted locations.

### 2026-07-25 — M10 business-chat contract repair

**What works:**
- Corrected every web chat route from the invalid generic `/chat/*` namespace to the backend/mobile `/business/chat/*` namespace, including conversations, messages, send, read, unread and delete operations.
- Corrected merchant-support config to the backend/mobile `GET /public/merchant-support` contract.
- Reworked the chat read acknowledgement to fire once per selected conversation rather than depending on a recreated mutation object, and added explicit conversation/message loading and empty states.

**Verification:** `git diff --check` is run after this entry. Live business/mobile chat validation still requires a Node-capable browser environment and two authenticated participants.

**Next task for next agent:** complete the M15 deploy/version and telemetry pieces only when their configuration contracts exist; keep M10 marked core-done but unverified until a real business/customer chat exchange succeeds on both clients.

### 2026-07-25 — M11 analytics date-range parity

**What works:**
- Extended the business analytics client/hook to pass the backend-supported `startDate` and `endDate` parameters, matching the mobile analytics screen.
- Rebuilt the analytics page with responsive 7/30/90-day controls, total revenue, summary KPIs, engagement metrics, ranked products/services and order/booking status breakdowns.

**Verification:** static diff validation is run after this entry. Runtime/TypeScript validation remains blocked by the Node toolchain issue in `BLOCKERS.md`.

**Next task for next agent:** add the deployment-version and Amplitude contracts once their environment/configuration are available; do not invent telemetry endpoints or a build-version source.

### 2026-07-25 — M11/M15 live affordances and resilience

**What works:**
- The dashboard bell now calls the business-only unread-count endpoint, shows an unread badge, and refreshes when the notifications socket emits an event.
- The support ticket screen constructs **Talk to Ruby+ on WhatsApp** from the live merchant-support configuration (`whatsappPhone` and `whatsappIntroMessage`), instead of depending on an optional pre-built URL.
- Added dashboard route-level `loading.tsx` and `error.tsx` so business screens have a loading skeleton and a recoverable error state.

**Verification:** the required TypeScript command was attempted on 2026-07-25 and could not start because `npx` is unavailable in this shell. The environment blocker is recorded in `BLOCKERS.md`; no TS/browser pass is claimed.

**Next task for next agent:** complete the M15 deploy-version/telemetry design only after the project supplies a build-version source and Amplitude configuration. Then run the full responsive/accessibility and authenticated browser smoke matrix in a Node-capable environment.

### 2026-07-24 — M11–M13 contract correction and organisation controls

**What works:**
- Corrected organisation, onboarding, settings and notification calls from invalid `/businesses/...` or generic notification paths to the mobile-parity `/business/...` routes.
- Branches can enable multi-branch mode, submit the full backend-required branch payload, and change each branch catalog mode. Staff can be added by email, have roles changed, and be removed.
- Settings now supports account profile updates, password changes, and all five backend preference toggles: email, SMS, WhatsApp, push and repeat alerts.
- The notification inbox now uses the business-only batch mark-read contract. It can request local browser notification permission and register the existing PWA service worker.

**Deferred / blocked:**
- Remote browser push and a name-based branch location picker require the backend/auth additions recorded in `BLOCKERS.md`.
- Merchant KYC status/upload has no owner-authorised API contract; the existing CAC verification route is admin-only.

**Files touched:**
- `src/lib/api/client.ts`, `src/lib/business-api/organization.ts`, `src/lib/business-api/index.ts`.
- `src/app/business/dashboard/{branches,staff,settings,notifications}/page.tsx`.
- `src/components/business/settings/NotificationPreferences.tsx`.
- `docs/business-web-port/{PROGRESS,BLOCKERS}.md`.

**Verification:** full TypeScript and browser validation remain blocked by the documented local execution environment. `git -c safe.directory=C:/Users/DELL/Desktop/ruby-plus-web diff --check` is run at the end of this slice.

**Next task for next agent:** Continue M13/M14 by auditing the business onboarding/profile contract and use a backend-provided hydrated business profile if it becomes available. Do not mark M11–M13 complete until their documented backend dependencies are resolved or intentionally descoped.

### 2026-07-24 — M14 DRAFT onboarding gate correction

**What works:**
- Moved the actionable onboarding journey to `/business/onboarding`, outside the normal dashboard status gate but still protected by `BusinessAuthProvider`.
- A DRAFT merchant now sees **Continue setup** on the pending screen, can set/drag the Leaflet location pin, must verify it before submitting, and returns to the pending screen after the review submission succeeds.
- The old dashboard onboarding URL now safely redirects to the ungated route so saved internal links do not dead-end.

**Deferred:** the session has no hydrated location/address/profile defaults, so the map still begins at the existing Port Harcourt fallback instead of the business’s saved coordinates. This is covered by the profile hydration blocker.

**Files touched:**
- `src/app/business/onboarding/page.tsx`.
- `src/app/business/business-pending/page.tsx`.
- `src/app/business/dashboard/onboarding/page.tsx`.
- `docs/business-web-port/PROGRESS.md`.

**Next task for next agent:** add server-provided business profile hydration, then seed onboarding and branch creation with real location data rather than a fallback pin/identifier.

### 2026-07-24 — M9 events core operations

**What works:**
- Merchants can list events, create a draft with backend-required venue coordinates and ticket tiers, see platform fee disclosure, submit/withdraw/cancel from event detail, and scan attendee tickets with browser camera or manual code entry.
- The scanner reuses the existing `@yudiel/react-qr-scanner` dependency and maps the backend's discriminated scan result to accepted/error states.

**Deferred:**
- Per-tier image uploads/gallery are still required to finish M9. Event sales analytics is available at `/business/dashboard/events/analytics/:id`; event editing is available at `/business/dashboard/events/:id/edit`.
- The business session does not yet provide a default location ID; create therefore keeps that backend-required field explicit. This is related to the existing hydrated business-profile blocker.

**Next task for next agent:** Finish M9 edit + analytics surfaces, then validate a real ticket scan over HTTPS with a browser camera permission grant.

### 2026-07-24 — M8 subscriptions and Ruby Quest foundation

**What works:**
- The web client now mirrors all mobile ad-subscription and Ruby Quest API methods, including tier/status reads, plan switching, auto-renew, pause/resume, saved-card payments, banners, Ruby Quest analytics and campaign lifecycle.
- Subscription plan and manage screens render backend-defined tiers, current quota/period data, auto-renew and pause/resume controls. The first-time subscribe CTA intentionally only enables a saved Paystack card.
- Ruby Quest supports wallet-paid Common, Rare and Legendary campaigns, weekly analytics, and pause/resume controls.
- Corrected the M7 push-blast route to `/business/ads/subscription/*`, matching the mobile and backend contract.

**Deferred:**
- The backend's first-time subscription initialization returns only a mobile WebView authorization URL. Per the approved plan, the web app must use Paystack Inline and must not embed or redirect into that WebView flow. A web-safe backend initialization/access-code contract is needed before that CTA can be enabled.
- Banner submission is available at `/business/dashboard/ruby-ads/manage/banner`; tier-change preview/scheduling UI remains to finish M8 once first-time checkout is unblocked.

**Next task for next agent:** Finish M8 by resolving the Paystack Inline initialization contract with the backend, then surface change-tier preview/scheduled downgrade and banner management. Do not add IAP or WebView checkout.

### 2026-07-24 — M7 ad campaigns core

**What works:**
- Ruby Ads lists and filters campaigns, shows metrics, opens campaign detail, and supports pause, resume, cancel and wallet-funded rerun actions.
- Campaign creation supports featured listing, slideshow, explore reel, featured reviews and push notification. It uses wallet-only funding; no IAP flow was added.
- Organic reel creation accepts a browser video file, renders a native `<video>` preview, uploads through the existing media pipeline, then submits the returned media URL for review.
- The push-blast flow submits an admin-reviewed request rather than sending directly, limits copy to 180 characters, permits a 1–20 km radius, and displays request history. The Leaflet circle is explicitly an illustrative preview because the current business-auth profile has no authoritative coordinates; the backend applies the radius to the registered business location.

**Design decisions:**
- Added M7 to the Leaflet native-to-web substitution row in `PLAN.md` before implementing the radius preview.
- Used the existing browser upload API and HTML `<video>`, not a native-media substitute.

**Files touched:**
- `src/lib/api/client.ts`, `src/lib/business-api/ads.ts`, `src/lib/business-api/index.ts`.
- `src/app/business/dashboard/ruby-ads/{page,create/page,[id]/page,push-blast/page,reels/create/page}.tsx`.
- `docs/business-web-port/PLAN.md`.

**Deferred / verification:**
- Full TypeScript and browser verification cannot run in this desktop shell: `node`, `npm` and `npx` are unavailable on PATH, so the TypeScript command cannot start its runtime. `git diff --check` passes.
- Live campaign wallet debits, R2 video upload/transcoding, and push-blast admin fulfilment require a running backend plus a browser session.
- The authenticated business profile still needs location coordinates to centre the push-blast preview accurately (the existing hydrated-profile dependency for M5).

**Next task for next agent:** Begin M8 Ad Subscriptions + Ruby Quest. Reuse the M7 push-blast request hooks; do not reintroduce the retired self-send endpoint or any IAP checkout.

### 2026-07-24 — M6 wallet API foundation

**Files touched:**
- `src/lib/api/client.ts` — merchant wallet endpoint namespace.
- `src/lib/business-api/wallet.ts` — wallet list/detail/transactions/fund hooks.
- `src/lib/business-api/index.ts` — wallet exports.

**Next task:** Add bank-account and payout parity hooks, then build the wallet UI and Paystack Inline flow (never an iframe/WebView).

### 2026-07-24 — M6 wallet and payout UI core

**Files touched:**
- `src/app/business/dashboard/wallet/page.tsx` and `wallet/qr-code/page.tsx` — wallet overview plus downloadable merchant payment QR.
- `src/app/business/dashboard/payouts/page.tsx` and `bank-accounts/page.tsx` — payout request/history and linked-bank management.
- `src/lib/business-payments/paystack-inline.ts` — first-class Paystack Inline JS helper.
- `src/lib/business-api/payouts.ts`, `src/lib/api/client.ts` — bank and payout contract methods.

**What works:**
- Merchants can view balance/payout activity, add bank accounts, request payouts and generate/copy/download their merchant payment QR.
- Paystack checkout is represented only by an Inline JS helper, never a React Native WebView-style payment surface.

**Verification blocker:** Live Paystack, DVA and payout lifecycle verification requires a deployed callback/webhook configuration and the local browser/TypeScript environment described in `BLOCKERS.md`.

**Next task:** After environment verification, continue M7 Ad Campaigns. M5's auth-profile blocker remains independent.

### 2026-07-25 — M5 visibility gate resolved (subcategoryId.businessModel hydration)

**Who:** Claude
**Milestone:** M5 — Catalog: Services (visibility gate)

**Files touched:**
- `src/lib/api/client.ts` — added `api.businessMe.getBusinessProfile(id)` + `api.businessMe.listMyBusinesses()` covering the owner-only `GET /business/:id` and `GET /business/my-businesses` endpoints (populated with `subcategoryId.businessModel`, `sellsProducts`, `categoryId`, `locationId`).
- `src/lib/business-auth/business-auth-context.tsx` — extended `SelectedBusiness` with hydrated fields (`businessModel`, `sellsProducts`, `subcategoryId`, `categoryId`, `locationId`), added `refreshBusinessProfile()` context method called automatically on login + mount, added `BusinessModel` + `PopulatedSubcategory` exports.
- `src/lib/business-auth/use-business-visibility.ts` — NEW `useBusinessVisibility()` mirror of mobile `useCategoryProfile()`. Returns `{ showProducts, showServices, isReady, businessModel, isOrderDelivery, isVisitOnly, isBookingVisit }`.
- `src/lib/business-auth/index.ts` — barrel now exports the new hook + types.
- `src/components/business/BusinessSidebar.tsx` — filters Products/Services from the Catalog group based on visibility; drops empty groups; keeps both visible while hydrating so the sidebar doesn't jerk.

**Key finding — blocker was solvable client-side:**
Codex's BLOCKERS.md correctly noted the login response returns only `_id/name/status` and warned against inferring the businessModel from name or route. But the backend already exposes `GET /business/:id` (owner-authorized) with `.populate('subcategoryId', 'name slug businessModel productFields serviceFields allowedFulfillmentModes')` — the exact fields we need — and the `.findByOwnerPaginated()` list variant does the same. No backend change is required; the fix is a post-login hydration call.

**Design decisions logged:**
- Hydration is fire-and-forget. Login redirects immediately with the basic business shape; the enriched fields drop in ~100-300ms later. `useBusinessVisibility()`'s `isReady` flag stays false during that window and the sidebar defaults to showing both catalog entries — hiding a real merchant's Products tab because we don't yet know their model is worse than briefly showing both.
- `sellsProducts` is the authoritative flag when present (mobile P90 pattern). If undefined, we fall back to `businessModel === 'ORDER_DELIVERY'` as the default.
- `showServices` is strict: only VISIT_ONLY or BOOKING_VISIT businesses see the Services entry. ORDER_DELIVERY businesses never book, so the tab is always hidden for them.
- `refreshBusinessProfile()` runs on mount even when the localStorage session is warm — the merchant may have flipped `sellsProducts` on mobile between web sessions and we don't want the sidebar to stay wrong until they log out.

**BLOCKERS.md updated** — the M5 section now points at this session log entry and confirms no backend change is needed.

**TS check status:** ✅ Clean — **0 errors across the entire project.** Ran `./node_modules/.bin/tsc --noEmit -p tsconfig.json` (bypasses the PowerShell PATH issue Codex hit by invoking the local binary directly). Fixed 4 pre-existing errors from Codex's compressed pages along the way:
1. `src/app/business/dashboard/referral/page.tsx` — parse error from a stray `);` in the compressed one-liner. Rewrote in readable form.
2. `src/lib/api/client.ts` — Codex's `merchantSupport: { config: () => ... }` at line 862 collided with the pre-existing admin `merchantSupport: { get, update }` block at line 2417. Renamed the business-facing one to `businessMerchantSupport.config()` + updated the single consumer in `disputes.ts`.
3. `src/lib/business-api/disputes.ts` — `useCreateGeneralDispute(onSuccess?: () => void)` typed the callback as `() => void` but the page passes `(data) => void`. Widened the type to `(data: any) => void`.
4. `src/lib/business-api/events.ts` — same pattern on `useCreateEvent`, `useUpdateEvent`, `useEventAction`, `useScanTicket`. Widened all four onSuccess signatures.

The whole project (including the 594-task mobile+backend history in the parallel repos) now compiles with **0 TypeScript errors** on the web repo.

**Remaining M5 work (small):**
The service create page uses hard-coded `locationId`/`categoryId` (or empty strings) in some paths — now that the hydrated `SelectedBusiness` carries these, wire them into the create payload so the form actually validates against the backend DTO. Also unblocks the same problem in M9 events, M14 onboarding-completion, and M12 branches (though M12 also has its own separate blocker — see BLOCKERS.md).

**Next task for next agent:**
Two options, both unblocked:
1. **Wire hydrated locationId/categoryId into service + event + branch create payloads.** Small (30 min) but removes the last remaining M5 sharp edge and unlocks M9/M12/M14 downstream.
2. **Flesh out M6 (Wallet + Payouts + Bank Accounts + Payments).** Codex scaffolded the pages but the hooks are 1-3 line stubs (`wallet.ts` = 7 lines, `payouts.ts` = 8 lines, no `bank-accounts.ts`). The Merchant QR page is scaffolded. Full parity needs ~15 hooks + BankAccount CRUD + Paystack Inline flow + Merchant QR canvas render + transaction detail. This is the highest-merchant-value unblocked milestone.

---

### 2026-07-24 — M5 services API foundation

**Who:** Codex
**Milestone:** M5 — Catalog: Services (foundation slice)

**Files touched:**
- `src/lib/api/client.ts` — added create/list/detail/update/delete/activate/deactivate/stats/businessStats service endpoints.
- `src/lib/business-api/services.ts` — service types and matching hooks.
- `src/lib/business-api/index.ts` — service exports.

**Next task:** Build the services grid and service editor with pricing, duration, fulfilment, availability slots, cancellation policy, media and template fields, then apply the business-model (`sellsServices`) visibility gate.

### 2026-07-24 — M5 services CRUD UI slice

**Files touched:**
- `src/app/business/dashboard/services/{page,create/page,[id]/page}.tsx`
- `src/components/business/services/ServiceEditor.tsx`

**What works:**
- Merchant service list supports search, status filter, edit, delete and activation toggle.
- Service editor persists cover media, pricing type/deposit, duration, fulfilment, cancellation policy, and requirements/includes/excludes.

**Remaining in M5:** availability-slot builder, template-driven category fields and the `sellsServices`/business-model visibility gate.

**What works now:**
- `AvailabilitySlotBuilder` and `TemplateFields` are wired into `ServiceEditor`; both availability slots and `templateData` now round-trip through service create/update requests.

**Remaining in M5:**
- The `sellsServices` / business-model visibility gate and authoritative `locationId`/`categoryId` form defaults are blocked on a hydrated business profile. Details are in `BLOCKERS.md`.

### 2026-07-24 — M4 products CRUD UI slice

**Who:** Codex
**Milestone:** M4 — Catalog: Products (CRUD UI)

**Files touched:**
- `src/app/business/dashboard/products/page.tsx` — product grid, search/status filters, delete action and empty/loading/error states.
- `src/app/business/dashboard/products/create/page.tsx`, `products/[id]/page.tsx` — create and edit routes.
- `src/components/business/products/ProductEditor.tsx` — connected product form with price, compare-at price, stock, availability, category, prep time, primary image, a variation and an add-on.

**What works:**
- Merchants can create, edit, find and delete products from the business dashboard.
- The first image is uploaded through the shared web image uploader and saved in the backend `images` array with `isPrimary: true`.
- The editor preserves the first returned variation/add-on and maps the UI values to the backend DTO shape.

**Deferred:**
- Repeatable variation and add-on builders, nutritional information and day-of-week availability. These remain within M4, not future milestones.

**In progress:**
- None — gallery, repeatable builders, day availability, nutrition and commission disclosure are now connected in `ProductEditor`.

### 2026-07-24 — M4 advanced editor completed

**What works:**
- `ProductEditor` now persists up to eight images with primary selection, repeatable variation groups/options (including price adjustments), repeatable add-ons, stock/backorder state, daily/time-window availability and nutritional/allergen data.
- Commission disclosure appears beneath the price; it uses the current client-side rate of zero until the platform exposes a merchant commission-preview endpoint. Product pricing itself is unaffected.

**Design decision:**
- The backend does not expose a product commission preview calculation endpoint. The UI deliberately does not invent a fee calculation; it displays the customer price and will calculate merchant proceeds when a server-supplied rate is available.

**Verification:** Full browser and TypeScript checks remain blocked by `BLOCKERS.md`; no milestone is release-verified until that environment issue is resolved.

**Verification:** Still pending the local `next dev` and full TypeScript verification blocker documented in `BLOCKERS.md`.

**Next task for next agent:**
Finish M4's repeatable image, variation and add-on builders; add nutritional/day availability and commission disclosure; then verify full product CRUD with a real merchant.

### 2026-07-24 — M4 products API foundation

**Who:** Codex
**Milestone:** M4 — Catalog: Products (foundation slice)

**Files touched:**
- `src/lib/api/client.ts` — added `api.businessProducts` for create, list, detail, update, delete, bulk stock, bulk status and display order.
- `src/lib/business-api/products.ts` — mobile-parity product types and query/mutation hooks.
- `src/lib/business-api/index.ts` — product hook/type exports.

**What works:**
- The web business layer now matches all eight mobile `productsApi` endpoints, including the operational bulk endpoints that the initial product grid will need.
- Product response types include images, variations, add-ons, availability, stock, nutrition and legacy price/media/stock fields.
- Product categories are derived from the business catalogue in the same way as the mobile `useProductCategories` hook.

**Next task for next agent:**
Build `/business/dashboard/products`, product create and edit/detail pages; adapt `ImageUpload` to a multi-image product gallery and add variations, add-ons, availability, nutrition and commission-preview components.

### 2026-07-24 — M2/M3 tracking stretch shipped

**Who:** Codex
**Milestone:** M2/M3 stretch — delivery rider map and AT_HOME booking route map

**Files touched:**
- `src/lib/api/client.ts` — added the complete mobile-parity business delivery contract (list/detail/by-order/create/assign/status/location/track) and the previously missing booking chat-create, safety-check-in and provider-location methods.
- `src/lib/business-api/delivery.ts` — new delivery types and all eight matching hooks.
- `src/lib/business-api/bookings.ts`, `index.ts` — provider location/safety/chat booking hooks and `providerLastLocation` response support.
- `src/lib/business-sockets/hooks.ts` — typed rider/provider location events without HTTP-refetching on every GPS ping.
- `src/components/business/delivery/DeliveryTrackingMap.tsx` — Leaflet rider, pickup and customer map with route fallback, status and rider contact.
- `src/components/business/bookings/AtHomeTrackingMap.tsx` — opt-in high-accuracy browser location sharing, 10-second server throttle, customer route map and socket updates.
- `src/app/business/dashboard/orders/[id]/track-delivery/page.tsx` — new delivery tracking route.
- `src/app/business/dashboard/orders/[id]/page.tsx`, `bookings/[id]/page.tsx` — replace M2/M3 placeholders with real tracking entry points.

**What works:**
- A dispatched delivery with a delivery job opens `/business/dashboard/orders/:id/track-delivery`, displaying pickup, customer and the latest rider marker. Rider coordinate socket events update the map locally; status events refresh the job.
- An AT_HOME booking in `PROVIDER_EN_ROUTE` or `PROVIDER_ARRIVED` displays the customer route and has an explicit **Share live location** control. It never starts browser location tracking automatically; the merchant must opt in, and can stop it at any time.
- The booking provider-location, safety-check-in and chat-create API methods are now present for mobile-parity downstream consumers.

**Design decisions logged:**
- GPS pings update local map state rather than refetching an entire delivery job per coordinate. Status/assignment events still refresh canonical API state.
- The map deliberately uses a straight line between available points. The backend currently exposes coordinates, not a directions polyline; this avoids inventing a routing provider/API. The existing mobile behavior uses the same straight-line fallback before a directions response.
- Location sharing is browser-native `navigator.geolocation.watchPosition`, as defined by the approved web substitution for native location APIs. It is scoped to the active booking route and throttled to one backend update per 10 seconds.

**Deferred:**
- Route road geometry/turn-by-turn ETA: requires a sanctioned directions provider/API contract; no such substitution is listed in PLAN.md.
- Mobile ↔ web live validation and browser smoke test: see `BLOCKERS.md`.

**TS check:** `npx tsc --noEmit -p tsconfig.json --pretty false` again exceeded the 60-second environment window without emitting diagnostics.

**Next task for next agent:**
Resolve the local verification environment, then validate an active dispatch and AT_HOME booking side-by-side with mobile. After that, start M4 Products catalog CRUD.

### 2026-07-24 — M-Shared-1 shared Leaflet + realtime foundation shipped

**Who:** Codex
**Milestone:** M-Shared-1 — shared map primitives and business Socket.IO foundation

**Files touched:**
- `src/lib/leaflet/leaflet-icons.ts` — fixes Leaflet's Next.js marker-image resolution once on the client.
- `src/lib/leaflet/DynamicMap.tsx` — reusable SSR-safe dynamic map wrapper with a loading state.
- `src/lib/leaflet/LeafletMap.tsx` — reusable OSM map supporting markers, polylines, a circle overlay, click placement, draggable markers, and fit-to-markers.
- `src/lib/business-sockets/business-sockets-provider.tsx` — one authenticated Socket.IO client per business namespace (`/chat`, `/notifications`, `/bookings`, `/orders`, `/businesses`, `/delivery`, `/disputes`).
- `src/lib/business-sockets/hooks.ts` and `index.ts` — reusable domain hooks plus the mobile notification invalidation map.
- `src/app/business/dashboard/layout.tsx` — mounts `BusinessSocketsProvider` inside the protected business shell.
- `src/app/business/dashboard/orders/page.tsx`, `orders/[id]/page.tsx`, `bookings/page.tsx`, `bookings/[id]/page.tsx` — refetch when relevant realtime events arrive.
- `src/lib/business-api/orders.ts`, `src/lib/business-api/bookings.ts` — removed M2/M3 list/detail polling now that realtime is the primary refresh path.

**What works:**
- Every protected business-dashboard page has access to one shared, authenticated socket connection per required namespace; reconnects are enabled and detail hooks rejoin their order/booking room after reconnecting.
- `useOrdersRealtime` and `useBookingsRealtime` refresh their list/detail data on status and payment events. Detail views also leave their rooms when navigating away.
- Shared map consumers can render Leaflet without an SSR crash and do not need to repeat Next.js marker configuration.

**Design decisions logged:**
- The provider refreshes consumer subscriptions after socket creation. This avoids a React-effect ordering race where a child could subscribe before the provider's socket map has been populated.
- Socket hooks trigger the existing `useBusinessQuery` refetch function rather than introduce React Query or a second cache. This maintains the web repository's current data-fetching convention.
- The `INVALIDATIONS_BY_TYPE` mapping is exported intact for M10/M11/M12 consumers; M2/M3 only use the event-specific refetches they need today.

**Deferred:**
- M2 delivery tracking map and M3 AT_HOME live-location map: the shared map primitives are ready, but the delivery API/components/routes are a separate M2/M3-stretch slice.
- Live side-by-side mobile ↔ web event validation: requires an authenticated merchant in both clients and a triggerable backend event.
- Socket token rotation: a refreshed JWT is not yet surfaced as a business-auth context change, so a newly refreshed token is used on the next socket reconnect/session rather than proactively rebuilding every socket.

**TS check:** `npx tsc --noEmit -p tsconfig.json` was started but exceeded the 60-second session command window without producing diagnostics. No TypeScript errors were emitted before the timeout; re-run it in a normal terminal before release.

**Verification:** dashboard browser smoke test is blocked locally: `next dev` did not open port 3000 within the available command window. Full details and the exact re-run steps are in `docs/business-web-port/BLOCKERS.md`. Realtime side-by-side validation is deferred as above.

**Next task for next agent:**
Ship M2/M3 stretch maps: add business delivery hooks, the order tracking route/components, and the AT_HOME booking location panel using `DynamicMap`; validate a live order and booking update side-by-side with mobile. Then start M4 Products catalog CRUD.

### 2026-07-24 (M3 same day) — M3 bookings core shipped

**Who:** Claude
**Milestone:** M3 — Bookings (AT_HOME live map batched with shared Leaflet slice)
**Files touched:** see "Files-created summary → M3 bookings" below.

**What works:**
- `/business/dashboard/bookings` — 3 tabs (Upcoming = PENDING+CONFIRMED / Active = PROVIDER_EN_ROUTE+PROVIDER_ARRIVED+IN_PROGRESS / Past = COMPLETED+CANCELLED+NO_SHOW+DISPUTED), search across ref/customer/service, 30 s poll with tab-hidden pause.
- `/business/dashboard/bookings/[id]` — full detail with adaptive action bar:
  - `PENDING` → **Confirm** or **Reject** (with reason textarea)
  - `CONFIRMED` → **Start service** (ON_SITE) or **I'm on the way** (AT_HOME) + Reschedule + Cancel
  - `PROVIDER_EN_ROUTE` → **I've arrived**
  - `PROVIDER_ARRIVED` → **Start service**
  - `IN_PROGRESS` → **Complete**
  - Cancel-with-reason available for PENDING → PROVIDER_ARRIVED
  - Reschedule form (date + time + optional reason) for PENDING / CONFIRMED
- Service + schedule card (name, description, custom-quote badge, duration, fulfilment mode with correct icon per ON_SITE / AT_HOME / BOTH).
- Customer card with `tel:` phone link, AT_HOME address block with map-pin icon + travel-quote line, customer note.
- Fee breakdown with dynamic rows (service or custom-amount, travel fee, deposit, discount, total, balance due) + payment status pill.
- Status timeline (statusHistory ?? statusTimeline fallback per field-mismatch pattern).
- Risk tier badge (skipped when LOW / undefined per prior riskTier bug pattern).
- AT_HOME `PROVIDER_EN_ROUTE` / `PROVIDER_ARRIVED` shows a placeholder card pointing to the shared Leaflet slice (batched with M2-stretch + M9 + M14).

**Design decisions logged:**
- Extended `business-format.ts` with booking helpers rather than a parallel `business-booking-format.ts` — one bridge, orders + bookings both consume it (mobile parity).
- Reschedule uses native `<input type="date">` + `<input type="time">` (M0 substitution matrix rule for `@react-native-community/datetimepicker` → HTML5 inputs). A polished JS date picker slots in later without touching the hook.
- Cancel reason on bookings uses a proper inline textarea (not the `window.prompt()` shortcut orders used) because bookings cancel more often + reason quality matters more when a customer's calendar is affected.
- BookingCard's risk-tier badge respects the memory-noted `riskTier && riskTier !== 'LOW'` guard — undefined `riskTier` doesn't render "undefined Risk" (memory: field-mismatches file).
- `useBookings` accepts `statuses[]` array; the API client flattens to CSV so downstream axios-style query encoding stays consistent.
- All mutations follow the mobile-parity contract: backend infers businessId from JWT on POST/PUT/PATCH, so hooks don't pass it (contrast with orders which do). Getting this wrong on the initial pass would silently 400.

**Deferred (called out on detail page):**
- AT_HOME live location broadcast + Leaflet map on `PROVIDER_EN_ROUTE` / `PROVIDER_ARRIVED` — batched with M2-stretch delivery map + M9 event venue picker + M14 business-location picker into one shared Leaflet slice
- Booking realtime socket (`/bookings` namespace) — needs BusinessSocketsProvider (still deferred)
- Safety check-in flow (mobile `useSafetyCheckIn`) — merchant taps "I've arrived / I'm leaving" with GPS to leave a paper trail for AT_HOME jobs
- Chat-source deep-link to conversation — needs M10 chat surface

**TS check:** 0 errors on business files (same 3 pre-existing auto-payouts errors).

**Codex-continuity artefacts refreshed:**
- Milestone status table now reflects M0 🟡 · M1 🟡 · M2 🟡 · M3 🟡, with each cell explaining what "core done" means for its slice.
- Session log has 4 entries (Pre-M0 + M0 + M1 + M2 + M3 core), each with the "Next task for next agent" pointer.
- `business-format.ts` now covers order + booking helpers, so the next agent porting M4 products just extends the same file.

**Next task for next agent (recommendation):**
**Shared Leaflet + Sockets slice.** M2-stretch, M3 AT_HOME map, M9 event venue picker, M14 business location all depend on Leaflet. M2 realtime orders, M3 realtime bookings, M10 chat, M11 notifications all depend on the sockets provider. Shipping both as one slice (call it M-Shared-1) unblocks four milestones at once.

Concrete first files for M-Shared-1:
1. `src/lib/leaflet/leaflet-icons.ts` — fix the default marker icon URL crash under Next.js webpack (well-known Leaflet gotcha)
2. `src/lib/leaflet/DynamicMap.tsx` — `dynamic(() => import('./LeafletMap'), { ssr: false })` wrapper reusable by all 4 map surfaces
3. `src/lib/leaflet/LeafletMap.tsx` — accepts markers[] + polylines[] + optional circle overlay (for ad radius) + optional map click handler (for location picker)
4. `src/lib/business-sockets/business-sockets-provider.tsx` — one Socket.IO client, 7 namespaces (`/chat`, `/notifications`, `/bookings`, `/orders`, `/businesses`, `/delivery`, `/disputes`), mounted in `dashboard/layout.tsx`
5. `src/lib/business-sockets/hooks.ts` — `useOrdersRealtime`, `useBookingsRealtime`, `useChatRealtime`, etc. Invalidations map ported from mobile `useRealtimeNotifications`
6. Extend `dashboard/layout.tsx` to mount `<BusinessSocketsProvider>` inside the auth guard

Then M4 (Products) and downstream milestones proceed with all the shared infra in place.

**Alternative:** Skip the shared slice for now and land M4 Products (Catalog CRUD) — it's the highest merchant-value feature after orders/bookings. The shared Leaflet + sockets slice can come between M5 and M6 without stranding anything meaningful.

---

### 2026-07-24 (even later still) — M2 orders shipped (delivery-map deferred)

**Who:** Claude
**Milestone:** M2 — Orders (delivery map is stretch)
**Files touched:** see "Files-created summary → M2 orders" below.

**What works:**
- `/business/dashboard/orders` — polls every 30 s (auto-pause on hidden tab), status-filter chips (All / New / Preparing / Ready / Dispatched / Completed / Cancelled), client-side search by order number OR customer name, skeleton + empty state, tapping a row → detail page.
- `/business/dashboard/orders/[id]` — polls every 10 s, progress stepper adapts to PICKUP (5 steps) or DELIVERY (7 steps), action bar changes based on status:
  - `PLACED` → **Accept** (with est prep time input) or **Reject** (with reason textarea)
  - `ACCEPTED` → Start preparing
  - `PREPARING` → Mark ready
  - `READY` → Mark dispatched (delivery) or Complete order (pickup)
  - `DISPATCHED` / `PICKED_UP` → Mark delivered
  - `DELIVERED` → Complete order
  - Cancel button visible for ACCEPTED / PREPARING
- Customer card (name + tel: phone link), delivery-address block with map-pin icon, note-from-customer, fee breakdown (subtotal / delivery / discount / total), items list with per-line qty × name + note + variations + line total, full status timeline.
- All mutations toast success + refetch. All read hooks are 1:1 mirrors of mobile `useOrders.ts`.

**Design decisions logged:**
- Built `src/lib/business-format.ts` upfront (M2, not M2's own scope) because backend↔frontend field mismatches (nested `fees` vs flat `total`, `type` vs `fulfillmentType`, `statusHistory` vs `statusTimeline`, `customerNote` vs `notes`, `userId: string | populated-object`) are the same pattern that lands in M3-M15. One helper file, ported 1:1 from mobile `src/utils/format.ts`, means no `??` sprawl in the pages. Every future milestone that touches order/product/service shapes extends this file — never patches call sites.
- Deferred delivery-tracking Leaflet map (`/orders/[id]/track-delivery`) to M2-stretch. Reasons: (a) Leaflet dynamic-import + SSR-safe wrapper is shared with M3 booking tracking + M9 event venue picker — better as one shared slice than three copies; (b) delivery map needs `useDeliveryJobByOrder` + socket wiring, which needs the `BusinessSocketsProvider`, which is also shared with M2 realtime orders + M3 realtime bookings + M10 chat + M11 notifications. Bundling the shared infra as its own slice reduces duplicated setup.
- Deferred BusinessSocketsProvider (7 namespaces) to its own slice. Orders + delivery are the first consumers, but chat / notifications / disputes / bookings / businesses-status all need the same provider. Building it once and layering the 7 event streams keeps the surface area small.
- Cancel-order uses `window.prompt()` for the reason — good-enough UX for M2. Mobile uses a bottom sheet; a modal component swap can land later without touching the hook.

**Deferred to M2-stretch (called out with placeholder card on detail page):**
- Delivery-tracking Leaflet map (`/orders/[id]/track-delivery/page.tsx`)
- BusinessSocketsProvider + `useOrdersRealtime` + `useDeliveryRealtime` — replaces the 30 s / 10 s polling with pushed updates
- `useDeliveryJobByOrder` + `RiderInfoCard` + `RouteCard` + `LiveTrackingBanner` + `RiderMapMarker`
- Server-side search (backend already accepts `q=` on `/business/orders` per mobile)

**TS check:** 0 errors on business files. Same 3 pre-existing errors in stale `.next/types/…/auto-payouts/…` from in-progress P154.

**Next task for next agent:**
Two viable paths — user picks which:

**Option A: Ship the M2-stretch (delivery map + realtime).** Concrete first files:
1. `src/lib/business-sockets/business-sockets-provider.tsx` — mounts one Socket.IO client at dashboard shell for 7 namespaces
2. `src/lib/business-api/delivery.ts` — `useDeliveryJob` + `useDeliveryJobByOrder` (socket-primary, poll fallback)
3. `src/lib/leaflet/dynamic-map.tsx` — SSR-safe Leaflet wrapper reusable by M2/M3/M9/M14
4. `src/components/business/delivery/{RiderMapMarker,LiveTrackingBanner,DeliveryMap}.tsx`
5. `src/app/business/dashboard/orders/[id]/track-delivery/page.tsx`

**Option B: Move to M3 (Bookings) and let M2-stretch batch with M3's booking-tracking Leaflet map + BookingsSocketsProvider.** More efficient — shares the Leaflet + sockets foundation across both.

Recommend Option B.

---

### 2026-07-24 (even later same day) — M1 core shipped

**Who:** Claude
**Milestone:** M1 — Dashboard home + daily operations
**Files touched:** see "Files-created summary → M1 core" below.

**What works:**
- `/business/dashboard` — real content (StoreStatusBar + StatCardRow + PayViaRubyBanner + quick actions grid) instead of the M0 placeholder.
- StoreStatusBar polls `/business/daily-operations/today?businessId=…` every 60 s, tinted green when open + gray when offline, toggle button hits `/open` or `/offline`. Auto-pauses polling when tab is hidden.
- StatCardRow polls `/business/orders/stats/dashboard?businessId=…` every 60 s, renders three cards (Orders today with pending count, Active bookings with pending count, Wallet balance with hint "Ships with M6" until backend surfaces it there).
- Quick actions link to `/orders`, `/products`, `/wallet`, `/ruby-ads` — all of which are unbuilt yet; clicking them will 404 today (that's expected — they fill in on their respective milestones).

**Design decisions logged:**
- Built `useBusinessQuery` as a thin polling wrapper on top of the admin `useApi` (from `src/lib/hooks.ts`) instead of pulling in React Query. Keeps the web repo's single data-fetching pattern intact.
- Polling pauses when `document.hidden` (matches mobile's `AppState` behaviour) and refetches immediately on visibility restore. Cheap parity with "user came back to the tab" UX.
- StoreStatusBar's "Open store" button opens the day with an empty product list — mobile shows an inventory picker at this step, but that flow depends on the Products list which lands in M4. Web merchants who need per-product stock control will use the Products page once M4 ships.
- Every dashboard component uses the existing Tailwind `ruby-red` / `ruby-red/10` palette + the platform's `skeleton` utility class — no new design tokens introduced.

**Deferred to M1-stretch (endpoints already wired, hooks exist):**
- EngagementChart with 7/14/30 day chips (Recharts) — `useBusinessEngagement` ready to consume
- ReviewPreviewCard — `useBusinessReviewStats` ready to consume
- Chat FAB — needs M10 chat surface first for target route
- NewOrdersBanner + PendingBanner — need M2 orders realtime feed
- LocationFixBanner — needs `useMyBusinesses` (lands with M0-stretch or M12)
- ReferAndEarnLink + HelpMeRegisterCard — need M12 referral + support endpoints

**TS check:** 0 errors on business files (verified: `npx tsc --noEmit` produces 3 pre-existing errors, all in stale `.next/types/…/auto-payouts/…` from in-progress P154, none in my touched files).

**Next task for next agent:**
Start M2 — Orders + Delivery Tracking. See PLAN.md § M2. First files:
1. `src/lib/business-api/orders.ts` — `useOrders`, `useRecentOrders`, `usePendingOrdersCount`, `useOrderDetail`, `useAcceptOrder`, `useRejectOrder`, `useUpdateOrderStatus`, `useOrderStatusCounts`, `useOrderStats`
2. `src/lib/business-api/delivery.ts` — `useDeliveryJobs`, `useDeliveryJob`, `useDeliveryJobByOrder` (socket + poll fallback)
3. `src/app/business/dashboard/orders/page.tsx` + `[id]/page.tsx` + `[id]/track-delivery/page.tsx`
4. `src/components/business/orders/{OrderCard,FilterChips,OrderProgressStepper,RiderInfoCard,RouteCard}.tsx`
5. `src/components/business/delivery/{LiveTrackingBanner,RiderMapMarker,DeliveryMap}.tsx` — Leaflet with SSR-safe dynamic import
6. NEW `src/lib/business-sockets/business-sockets-provider.tsx` (M0 stretch that M2 blocks on) — `/orders` + `/delivery` namespaces first, extend to the other 5 later
7. Extend `api.*` with `api.businessOrders.*` + `api.businessDelivery.*` namespaces

---

### 2026-07-24 (later same day) — M0 core shipped

**Who:** Claude
**Milestone:** M0 — Foundation
**Files touched:** see "Files-created summary → M0 core" below.

**What works:**
- `/business/login` — email + password → JWT stored in `ruby_business_*` localStorage keys → redirects to `/business/dashboard` (or `/business/business-pending` if status is gated / no business linked).
- `/business/forgot-password` → `/business/reset-password?email=…` → OTP + new password → back to login.
- `/business/business-pending` — reads `business.status` from BusinessAuthContext, shows tinted copy per DRAFT / PENDING_REVIEW / REJECTED / SUSPENDED, plus a "no business linked" fallback. Only actions: open mobile app + log out.
- `/business/dashboard/*` — shell with sidebar (8 nav groups, longest-prefix active highlighting) + topbar (business identity + status pill + notifications icon + profile menu with logout). Auth guard + status gate redirect anything unauthenticated / gated.
- Deep-link preservation on login redirect via `?next=…` query param (mobile-parity behaviour).

**Design decisions logged:**
- Extended existing `src/lib/api/client.ts` with `api.businessAuth.*` namespace rather than forking a whole new client. Kept admin `api.auth.*` untouched. Business tokens ALSO get mirrored into the admin `ruby_access_token` key so business hooks can flow through the same request interceptor without immediate refactor — the two never race in practice because they live on different subdomains. When the parallel client refactor lands (planned for M6 or earlier if it hurts), this mirror comes out.
- BusinessAuthProvider is mounted at 3 pages (`login`, `business-pending`, `dashboard/layout`) rather than a single top-level provider — cost is zero (just localStorage + state) and keeps the marketing/signup pages under `src/app/business/{page.tsx,register/,verify-otp/,success/,[slug]/}` completely unguarded.
- Route structure uses flat `/business/login`, `/business/dashboard/*` (not `(auth)/` / `(dashboard)/` groups) because `/business/` root is already the marketing landing — a `(dashboard)/page.tsx` would conflict with `page.tsx`.
- Local `initialsFromDisplay()` helper in `BusinessTopbar.tsx` because shared `getInitials(firstName, lastName)` requires both fields; merchants often log in with only an email.

**Deferred (not blocking):**
- Google Identity Services + Apple JS SDK — the endpoints (`api.businessAuth.googleAuth` / `.appleAuth`) exist; the UI buttons + Google Client ID env config land as M0-stretch when the user opts in.
- Web Push VAPID service worker — foundational scaffolding lands with M11 (Notifications).
- BusinessSocketsProvider (7 namespaces) — lands with M2 (first realtime consumer).
- Upload service (presigned R2 + canvas compression) — lands with M4 (first uploader).
- BranchSwitcher — placeholder slot on topbar; real dropdown lands with M12 when list-my-businesses is wired.

**TS check:** clean on all M0 files. Pre-existing errors in `.next/types/…/auto-payouts/…` are stale references from the in-progress P154 deletion, unrelated.

**Verification (manual, still to do):**
- [ ] `npm run dev` → visit `http://localhost:3000/business/login` → login with mobile-registered merchant creds → land on `/business/dashboard`
- [ ] Visit `/business/dashboard` while unauthed → redirect to `/business/login?next=/business/dashboard`
- [ ] Log in as merchant with status DRAFT → redirect to `/business/business-pending`
- [ ] Click Logout from topbar → tokens cleared → redirect to `/business/login`
- [ ] Forgot password flow — enter email → receive OTP email → reset works

**Next task for next agent:**
Start M1 — Dashboard home + daily operations. See PLAN.md § M1.

---

### 2026-07-24 — Plan approved, M0 exploration done, handoff docs created

**Who:** Claude (previous agent)
**Milestone:** Pre-M0
**Files touched:**
- `docs/business-web-port/CODEX_HANDOFF.md` (NEW)
- `docs/business-web-port/PLAN.md` (NEW — copy of `~/.claude/plans/gentle-humming-fairy.md`)
- `docs/business-web-port/PROGRESS.md` (NEW — this file)

**Notes:**
- Full milestone plan drafted and approved. See PLAN.md.
- Exploration confirmed no existing merchant dashboard on web; only marketing + signup pages under `src/app/business/{page.tsx,register/,verify-otp/,success/,[slug]/}`.
- Admin dashboard layout at `src/app/ruby-app/admin/(dashboard)/layout.tsx` is the analog to copy for the business dashboard shell.
- Existing `api.auth.registerBusiness / loginBusinessWithApple / verifyBusinessOtp / resendBusinessOtp` endpoints already work in `src/lib/api/client.ts` (lines 373-405). Business JWT sessions are backend-supported.
- No M0 code has been written yet.

**Decisions:**
- Route structure: `/business/login`, `/business/dashboard`, `/business/dashboard/orders/*`, etc. — flat URLs, no `(dashboard)` group prefix since `/business/` root is already the marketing landing. PLAN.md's route-group syntax is illustrative; actual folder names should match these URLs.
- Auth: fork `AuthContext` → `BusinessAuthContext`, do NOT extend the admin one.
- API client: extend `src/lib/api/client.ts` with `businessAuth`, `businessOrders`, `businessProducts`, etc. namespaces — additive, don't touch existing `api.*`.

**Next task for next agent:**
Start M0. First files to create:
1. `src/lib/business-auth/business-auth-context.tsx` — fork of `src/lib/auth/auth-context.tsx` with separate localStorage keys (`ruby_business_access_token`, etc.)
2. `src/lib/business-auth/index.ts` — barrel export
3. Extend `src/lib/api/client.ts` with `api.businessAuth.login()` (POST `/auth/business/login`), `logout()`, `forgotPassword()`, `resetPassword()` — mirror mobile's `src/hooks/useAuth.ts`
4. `src/app/business/login/page.tsx` — email + password form
5. `src/app/business/forgot-password/page.tsx` + `reset-password/page.tsx`
6. `src/app/business/business-pending/page.tsx` — mirror mobile's `(auth)/business-pending.tsx`
7. `src/app/business/dashboard/layout.tsx` — sidebar + topbar + auth guard + business-status gate (mirror admin `(dashboard)/layout.tsx`)
8. `src/app/business/dashboard/page.tsx` — placeholder home ("Welcome" + StatCards stubs, real content in M1)
9. `src/components/business/BusinessSidebar.tsx` — nav groups per PLAN.md (Overview / Commerce / Catalog / Marketing / Communication / Finance / Analytics / Settings)
10. `src/components/business/BusinessTopbar.tsx` — with `BranchSwitcher` slot
11. `src/components/business/BranchSwitcher.tsx` — dropdown, persists selected business id
12. `src/components/business/BusinessPendingScreen.tsx` — copy per status (DRAFT/PENDING_REVIEW/REJECTED/SUSPENDED)

**Verification for M0:**
1. `npm run dev` → visit `http://localhost:3000/business/login`
2. Enter existing mobile-registered merchant creds → JWT stored → redirect to `/business/dashboard`
3. Merchant with PENDING_REVIEW status → redirect to `/business/business-pending`
4. Log out → tokens cleared → back to `/business/login`
5. `npx tsc --noEmit -p tsconfig.json` — zero errors on touched files

**Deferred to M0-later (stretch):**
- Google Identity Services + Apple JS SDK (need env config for client IDs first)
- Web Push (VAPID + service worker) — foundation only, real deep-link routing lands with M11
- Sockets provider (7 namespaces) — foundation only, real hooks land with M2+
- Upload service (presigned R2 with canvas compression) — real usage lands with M4+

---

## Decisions log (append-only)

_As decisions get made that deviate from or extend PLAN.md, log them here with the milestone number that surfaced them._

**2026-07-24 · Pre-M0** — Route structure uses flat paths (`/business/login`, `/business/dashboard/*`) instead of route groups (`(auth)/…`, `(dashboard)/…`). Reason: `/business/` root is already the marketing landing (page.tsx exists), so a `(public)/page.tsx` and `(dashboard)/page.tsx` would conflict. Flat URLs are also easier to read.

---

## Blockers log (append-only)

_When you can't proceed, append an entry here with what's blocked and what you tried. Then stop and wait for user._

_(none yet)_

---

## Files-created summary (running total)

_Appended by each session so a fresh agent can `git diff` intelligently._

**Pre-M0:**
- `docs/business-web-port/CODEX_HANDOFF.md`
- `docs/business-web-port/PLAN.md`
- `docs/business-web-port/PROGRESS.md`
- `docs/business-web-port/README.md`

**M3 bookings (2026-07-24):**
- `src/lib/api/client.ts` — extended with `api.businessBookings.*` namespace (list / stats / detail / confirm / updateStatus / cancel / reschedule / getDashboardStats / getPendingCount)
- `src/lib/business-api/bookings.ts` — NEW hooks (`useBookings` 30s poll, `useBookingDetail` 10s poll, `useBookingStats`, `usePendingBookingsCount`, `useConfirmBooking`, `useUpdateBookingStatus`, `useCancelBooking`, `useRescheduleBooking`) + full `BusinessBooking` type with CATALOG + CHAT source handling
- `src/lib/business-format.ts` — extended with booking helpers (`getBookingTotal`, `getBookingCustomerName`, `getBookingCustomerPhone`, `getServiceName`, `getServicePrice`, `getBookingDuration`, `getBookingSchedule`)
- `src/lib/business-api/index.ts` — barrel now exports order + booking hooks + types
- `src/components/business/bookings/BookingCard.tsx` — NEW list row (customer + service + schedule + fulfilment + risk badge + source hint + total)
- `src/app/business/dashboard/bookings/page.tsx` — NEW list page with 3 tabs (Upcoming / Active / Past mapping to status sets) + search + skeleton + empty state
- `src/app/business/dashboard/bookings/[id]/page.tsx` — NEW detail page with action bar (Confirm/Reject for PENDING, Start/On-my-way for CONFIRMED per fulfilment mode, Arrived → In progress → Complete chain, Reschedule form with date+time+reason, Cancel with reason) + service+schedule card + customer+address card + fee breakdown + status timeline + AT_HOME live-map placeholder

**M2 orders (2026-07-24):**
- `src/lib/api/client.ts` — extended with `api.businessOrders.*` namespace (list / recent / pendingCount / detail / accept / reject / updateStatus / cancel / stats)
- `src/lib/business-api/orders.ts` — NEW hooks (`useOrders` 30s poll, `useOrderDetail` 10s poll, `useRecentOrders`, `usePendingOrdersCount`, `useOrderStats`, `useAcceptOrder`, `useRejectOrder`, `useUpdateOrderStatus`, `useCancelOrder`) + `BusinessOrder` type with backward-compat aliased fields
- `src/lib/business-format.ts` — NEW format helpers per the field-mismatch memory (`getOrderTotal`/`getOrderSubtotal`/`getOrderDeliveryFee`/`getOrderDiscount`/`getFulfillmentType`/`getStatusTimeline`/`getCustomerName`/`getCustomerPhone`/`getDeliveryStreet`/`getDeliveryCoords`/`getItemName`/`getItemPrice`/`getItemLineTotal`/`getItemNote`/`formatCurrency`/`timeAgo`/`formatDateTime`)
- `src/components/business/orders/FilterChips.tsx` — NEW status filter (All / New / Preparing / Ready / Dispatched / Completed / Cancelled)
- `src/components/business/orders/OrderCard.tsx` — NEW list row with status pill, customer, item count, fulfilment icon, total, elapsed time
- `src/components/business/orders/OrderProgressStepper.tsx` — NEW visual stepper (PICKUP vs DELIVERY step set); terminal-state banner for REJECTED / CANCELLED
- `src/app/business/dashboard/orders/page.tsx` — NEW list page with search + filter + skeleton + empty state
- `src/app/business/dashboard/orders/[id]/page.tsx` — NEW detail page with progress stepper + action bar (accept + prep time, reject + reason textarea, status-advance chain per fulfilment, cancel with prompt) + customer/address/note card + fee breakdown + items list + status history

**M1 core (2026-07-24):**
- `src/lib/api/client.ts` — extended with `api.businessDailyOperations.*` (getTodayStatus / openDay / goOffline / updateInventory) + `api.businessAnalytics.*` (getBusiness / getEngagement / getReviewStats / getDashboardStats)
- `src/lib/business-api/hooks.ts` — NEW `useBusinessQuery` wrapper adds polling + visibility-pause on top of admin `useApi`
- `src/lib/business-api/daily-operations.ts` — NEW `useTodayStatus` (60s poll), `useOpenDay`, `useGoOffline`, `useUpdateInventory`
- `src/lib/business-api/analytics.ts` — NEW `useDashboardStats` (60s poll), `useBusinessAnalytics`, `useBusinessEngagement`, `useBusinessReviewStats`
- `src/lib/business-api/index.ts` — NEW barrel export
- `src/components/business/dashboard/StoreStatusBar.tsx` — NEW open/offline toggle with tinted card, refresh button
- `src/components/business/dashboard/StatCardRow.tsx` — NEW three KPI cards (Orders / Bookings / Wallet)
- `src/components/business/dashboard/PayViaRubyBanner.tsx` — NEW gradient nudge to share Ruby Pay QR
- `src/app/business/dashboard/page.tsx` — REWRITTEN placeholder → real M1 dashboard (greeting + status bar + stat row + pay banner + 4-tile quick actions)

**M0 core (2026-07-24):**
- `src/lib/api/client.ts` — extended with `api.businessAuth.*` namespace (login / google / apple / forgotPassword / resetPassword / refresh / me / logout)
- `src/lib/business-auth/business-auth-context.tsx` — NEW BusinessAuthProvider + useBusinessAuth hook with separate localStorage keys
- `src/lib/business-auth/index.ts` — NEW barrel export
- `src/app/business/login/page.tsx` — NEW email + password login (Google/Apple deferred)
- `src/app/business/forgot-password/page.tsx` — NEW step 1 (email → OTP)
- `src/app/business/reset-password/page.tsx` — NEW step 2 (OTP + new password)
- `src/app/business/business-pending/page.tsx` — NEW status-gate screen (DRAFT/PENDING/REJECTED/SUSPENDED copy)
- `src/app/business/dashboard/layout.tsx` — NEW shell (Provider + auth guard + status gate + sidebar/topbar frame)
- `src/app/business/dashboard/page.tsx` — NEW placeholder home (real content in M1)
- `src/components/business/BusinessSidebar.tsx` — NEW 8-group nav (Overview / Commerce / Catalog / Marketing / Finance / Analytics / Organization / Support)
- `src/components/business/BusinessTopbar.tsx` — NEW header with business identity + status pill + notifications icon + profile menu
