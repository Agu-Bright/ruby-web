# M-Shared-1 verification blocker — 2026-07-24

## M8 first-time Paystack Inline subscription

The current `POST /business/ads/subscription/paystack/initialize` backend contract returns `{ authorizationUrl, reference }` and is explicitly implemented for the mobile WebView flow. The web plan requires Paystack Inline JavaScript and forbids a WebView-style iframe or redirect to that URL.

The web client safely supports the saved-card path (`/paystack/subscribe-with-saved-card`) and all subscription management operations, but cannot enable a first-time card subscription without a browser-safe initialization contract.

**Required backend action:** provide a web-specific initialization endpoint that returns the Paystack Inline access code/configuration needed to open `PaystackPop.setup(...)`, while preserving server-created plan/subscription metadata and the existing `paystack/verify` reference flow. Alternatively, explicitly approve a different Paystack-first browser contract and update `PLAN.md` before implementation. Do not expose secret keys to the browser or redirect merchants into the mobile authorization URL.

---

## 2026-07-25 status update

- **M12 location selector:** partially resolved. `GET /locations/public?type=CITY` plus `POST /locations/public/validate-coordinates` are now used by M14's shared `LocationSelector`; reuse it in branch creation next.
- **M13 KYC surface:** owner document uploads are resolved for DRAFT onboarding. The existing authenticated media upload plus owner business update writes CAC, government-ID and licence URLs, while returned admin-only review statuses remain read-only. Add the same component to post-onboarding Settings next.

## What is blocked

Final local verification of the shared Leaflet + Socket.IO slice.

## What was tried

1. Ran `npx tsc --noEmit -p tsconfig.json`. It exceeded the 60-second command window without emitting diagnostics.
2. Started `npm.cmd run dev` in the project. The process remained running, but `http://localhost:3000/business/dashboard` returned `ERR_CONNECTION_REFUSED`; no listener appeared on port 3000.
3. Ran `npm.cmd run dev` in the foreground for a further 60 seconds to capture startup output. It also exceeded the command window without producing output.
4. The browser smoke-test tab was closed after the failed local connection attempt.

## Required next action

Run the two commands from a normal local terminal with no 60-second command cap, then test with an authenticated business account and a matching mobile session:

```powershell
npx tsc --noEmit -p tsconfig.json
npm run dev
```

For realtime, change an order and booking status in either client and confirm the other client refreshes immediately. The expected pre-existing type errors remain the three stale `.next/types/.../auto-payouts/...` errors referenced in `PROGRESS.md`; any errors in M-Shared-1 files should be fixed before release.

---

## M2/M3 tracking stretch follow-up — 2026-07-24

The same environment limitation applies after the delivery and AT_HOME map work: the full TypeScript command exceeded the 60-second runner cap with no emitted diagnostics. `next dev` still has not exposed port 3000 to the in-app browser.

When the local terminal is available, also validate browser geolocation deliberately: open an active AT_HOME booking, click **Share live location**, approve the browser permission prompt, and confirm the customer/mobile tracking surface receives the position. Do not grant browser location permission automatically during automated testing.

---

## M5 service visibility gate — 2026-07-24

**RESOLVED 2026-07-25 (Claude).** The backend already exposes owner-authenticated `GET /business/:id` (businesses.controller.ts:402) with `.populate('subcategoryId')` (businesses.service.ts:690, 703, 714), which returns the required `subcategoryId.businessModel` + `sellsProducts` fields. No backend change is needed.

Client-side resolution:
- Added `api.businessMe.getBusinessProfile(id)` + `api.businessMe.listMyBusinesses()` in `src/lib/api/client.ts`.
- Extended `SelectedBusiness` type in `business-auth-context.tsx` with hydrated fields: `businessModel`, `sellsProducts`, `subcategoryId`, `categoryId`, `locationId`.
- Added `refreshBusinessProfile()` context method, called automatically on login + mount to merge the populated fields into localStorage without blocking the login redirect.
- New `useBusinessVisibility()` hook in `src/lib/business-auth/use-business-visibility.ts` returns `{ showProducts, showServices, businessModel, isReady }` mirroring mobile `useCategoryProfile()`.
- `BusinessSidebar` filters Products/Services from the Catalog group based on this hook; whole group is dropped if both are hidden. During hydration (`isReady === false`) both stay visible so the sidebar doesn't jerk when data lands.

The service editor's `locationId` / `categoryId` requirement now has population support through `SelectedBusiness` as well — remaining work is only wiring those fields into the create payload where they're currently hard-coded/missing.

---

## M11 remote browser push — 2026-07-24

The business notification controller accepts `POST /business/notifications/device` with `{ token, platform: 'web' }`, but the notification delivery implementation is Expo-device-token based. It exposes no VAPID public key, browser subscription endpoint, or web-push sender. The web dashboard can safely request browser permission and register its service worker, but it cannot manufacture a valid remote browser token or receive server-originated push notifications.

**Required backend action:** add a VAPID-backed web-push subscription contract (public key + subscription persistence + delivery), or explicitly document a compatible token bridge. Once available, wire `PushManager.subscribe()` to the registration endpoint and deep-link notification clicks in `public/business-sw.js`.

## M12 branch location selector — 2026-07-24

`POST /business/:id/branches` correctly requires an existing `locationId`, coordinates and a full address. The current business session intentionally persists only `_id`, `name` and `status`, and there is no merchant-safe location discovery endpoint or hydrated selected-business location. The web form therefore exposes the required ID rather than inventing one.

**Required backend/auth action:** provide a merchant-readable location hierarchy or include the selected business's populated `locationId` and permitted child locations in the business login/profile response. The form can then offer a name-based location picker while preserving the backend contract.

## M13 merchant KYC surface — 2026-07-24

CAC document fields are accepted in the business create/update DTO and verified only by the admin endpoint. There is no merchant-side KYC document upload/status endpoint beyond the values supplied during registration, and no customer-facing verification endpoint should be repurposed for it.

**Required backend action:** expose an owner-authorised KYC/CAC status endpoint and, if post-registration changes are intended, a document upload/update workflow with clear verification state. Until then, the dashboard must not imply it can submit or verify KYC itself.

---

## Local TypeScript verification — 2026-07-25

Re-ran the required `npx tsc --noEmit -p tsconfig.json` command from the web repository. It cannot start because PowerShell reports that `npx` is not recognised on PATH. This is more fundamental than the earlier time-cap issue: Node/npm/npx are not available to this execution environment.

**Required environment action:** install or expose a compatible Node.js toolchain to this shell, then run the TypeScript command and `npm run dev` from a normal terminal. No TypeScript or browser runtime result is being claimed in the meantime.
