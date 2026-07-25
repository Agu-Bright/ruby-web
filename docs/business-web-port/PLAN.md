# Ruby+ Business App → Web Port — Milestone Plan

## Context

The user wants the entire `ruby-business-app` (Expo SDK 54, 112 route files, 17 feature domains) replicated inside `ruby-plus-web` (Next.js 15 + Tailwind), **minus new-account registration** — merchants sign up on mobile, then log in on web to manage everything. This is a multi-month build; the plan below breaks it into 15 shippable milestones (M0–M15) each of which can go to production independently.

**Why on web:** merchants have asked to manage their store from a laptop — larger data tables, easier menu bulk-edits, faster catalog uploads, real keyboard for chat responses, side-by-side wallet + analytics review. The mobile app stays the primary surface for on-the-go ops (scanner, mobile-first order acceptance, camera-mandatory reviews).

**Intended outcome:** business owners visit `business.rubyplus.net/login`, sign in with credentials issued via the mobile app, and land on the same dashboard shell they're used to — every mobile tab and every push-navigated screen replicated to feature parity, with native APIs cleanly swapped for web equivalents.

## Constraints & non-goals

- **No new-account registration.** Existing `/business/register` and `/business/verify-otp` marketing/signup pages stay live and unchanged; the new dashboard sits under a separate `(dashboard)` route group that requires an existing session.
- **No IAP on web.** iOS StoreKit / Play Billing don't apply to browsers. Every SKU that mobile purchases via IAP (ad campaigns, Ruby Quest tiers, ad subscriptions on iOS) uses Paystack + wallet on web — the backend already supports both payment sources for all these products.
- **No native Apple Sign-In on non-Safari browsers.** Google Sign-In is required across all browsers (Google Identity Services JS). Apple JS SDK is optional and only rendered on Safari.
- **Business-pending gate honored.** Merchants in DRAFT / PENDING_REVIEW / REJECTED / SUSPENDED land on the same "logout only" screen as mobile — same UX, same copy, so no divergence.
- **Multi-branch + staff in scope** (M12) — this is core merchant behaviour, not an optional add-on.
- **Onboarding-completion in scope** (M14) — merchants who signed up on mobile but never finished setup can complete it from the web (CAC upload, bank account, hours, media, location). Only new-account creation is off-limits.
- **Deployable-per-milestone.** Every milestone is a full shippable slice; M0 alone gets a merchant to a working dashboard skeleton with auth + shell + branch switcher.

## Architecture decisions (locked in)

**Route structure** — mirror the admin `(auth)` / `(dashboard)` split, add a `(public)` group for the existing marketing/onboarding pages so the new dashboard's auth guard doesn't apply to them:

```
src/app/business/
  (public)/               # existing marketing + signup pages moved here
    page.tsx              # marketing landing
    register/page.tsx     # keeps existing signup flow
    verify-otp/page.tsx
    success/page.tsx
    [slug]/page.tsx       # public business profile (customer-facing)
  (auth)/
    login/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    business-pending/page.tsx   # DRAFT/PENDING_REVIEW/REJECTED/SUSPENDED gate
    layout.tsx            # thin, no dashboard shell
  (dashboard)/
    layout.tsx            # BusinessDashboardShell — sidebar + topbar + auth guard + branch switcher
    page.tsx              # dashboard home
    orders/page.tsx
    orders/[id]/page.tsx
    ... (see per-milestone screen lists)
```

**Auth infrastructure — parallel, not extended.** Fork `src/lib/auth/auth-context.tsx` to `src/lib/business-auth/business-auth-context.tsx` with its own localStorage keys (`ruby_business_access_token`, `ruby_business_refresh_token`, `ruby_business_user`, `ruby_business_selected_business`). Do NOT overload the admin `AuthContext` — leaking admin RBAC helpers into merchant screens is a category of bug not worth the DRY savings.

**API client — parameterize, don't fork.** Add a `redirectOnAuthFailure: string` option to `src/lib/api/client.ts`'s `request<T>()` helper so the same client can drive `/ruby-app/admin/login` for admin calls and `/business/login` for business calls. Namespace the endpoints: `api.businessAuth.*`, `api.businessOrders.*`, etc. — additive, doesn't touch existing `api.*` shape.

**Realtime.** Reuse the existing `socket.io-client` dep. One `BusinessSocketsProvider` mounted at the dashboard-shell level connects the 7 namespaces (`/chat`, `/notifications`, `/bookings`, `/orders`, `/businesses`, `/delivery`, `/disputes`) once per session and exposes hooks per namespace — mirror of `src/services/socket.ts` on mobile.

**Push notifications.** Web Push (VAPID). Service worker at `public/business-sw.js` handles push events + deep-links. Registration flow mirrors the mobile `push-notifications.ts` deep-link table — `orderId` → `/business/orders/{id}`, `bookingId` → `/business/bookings/{id}`, etc. Skip devices where `Notification.permission` was denied — same "silent no-op" pattern as mobile Expo Go fallback.

## Native → web substitution matrix (applies globally across every milestone)

| Native API (mobile) | Web replacement | Milestones affected |
|---|---|---|
| `expo-iap` (StoreKit / Play) | Paystack Inline JS + wallet only | M7, M8 |
| `expo-notifications` | Web Push (VAPID + service worker) | M0 (foundation), M11 |
| `expo-camera` (QR scanner) | `html5-qrcode` (already used on admin events scanner) | M9 |
| `react-native-maps` | Leaflet + `react-leaflet` (already in web repo, used by `MapLocationPicker` + `BusinessesClusterMap`) | M0 (branch pin), M2, M3, M7 (push-blast radius preview), M9, M14 |
| `expo-apple-authentication` | Apple JS SDK, Safari-only, feature-detect | M0 |
| `expo-auth-session` (Google) | Google Identity Services JS (`google.accounts.id.initialize`) | M0 |
| `react-native-view-shot` | `canvas.toDataURL()` + `<a download>` link | M6 (QR share, receipts) |
| `expo-secure-store` | `localStorage` for tokens (accept web's security posture; option to migrate to httpOnly cookies later) | M0 |
| `expo-haptics` | Silent no-op — no CSS/JS analog worth the code | Every screen |
| `expo-clipboard` | `navigator.clipboard.writeText` | M12 (referral), M6 (merchant code) |
| `expo-image-picker` | `<input type="file" multiple accept="image/*">` + drag-drop dropzone | M4, M5, M7, M9, M14 |
| `expo-document-picker` | `<input type="file" accept=".pdf,.jpg,.jpeg,.png">` | M13 (KYC), M14 (CAC) |
| `expo-image-manipulator` | Canvas-based resize + `HTMLCanvasElement.toBlob()` | M4, M5, M7, M9, M14 |
| `@react-native-community/datetimepicker` (in bottom sheet) | `<input type="datetime-local">` on desktop; `flatpickr` or `react-day-picker` for polish | M9, M12 |
| `expo-video` (notification embeds, splash) | `<video>` HTML5 | M11 |
| `react-native-qrcode-svg` (merchant QR) | `qrcode.react` (already used on admin) | M6 |
| `react-native-webview` (Paystack 3DS + subscription checkout) | Paystack Inline JS — no iframe/WebView needed on web | M6, M8 |
| `expo-file-system` (`File(uri).arrayBuffer()`) | Direct `Blob` from `<input>` + presigned R2 PUT | M0 (upload service), M4-M14 uploaders |
| `react-native-google-places-autocomplete` | Google Places JS API Autocomplete | M0 (business location), M14 |
| `expo-location` (`reverseGeocodeAsync`) | Browser `navigator.geolocation.getCurrentPosition` + Google Geocoding JS | M0, M14 |

**Rule of thumb:** every new mobile-parity screen begins by re-mapping its native imports to this table. If a native dep is missing from this table, stop and add it — don't ship without an intentional substitution.

---

## Milestones

Each milestone lists (a) scope, (b) screens/routes, (c) critical files to create, (d) reused primitives from `ruby-plus-web`, (e) native-web substitutions in play, (f) verification steps, (g) shippable-independently flag.

### M0 — Foundation: auth, shell, business-pending gate, sockets, uploads

**Scope:** No product screens yet. Get a merchant from `business.rubyplus.net/login` to a working, empty dashboard shell with sidebar nav, topbar, branch switcher, socket connections, push registration, and an upload pipeline every later milestone can plug into.

**Screens:** `(auth)/login`, `(auth)/forgot-password`, `(auth)/reset-password`, `(auth)/business-pending`, `(dashboard)/page.tsx` (skeleton), `(dashboard)/layout.tsx`.

**Critical files (new):**
- `src/lib/business-auth/business-auth-context.tsx` — fork of admin context with separate localStorage keys
- `src/lib/business-auth/use-business-auth.ts` — hook exports (`useBusinessAuth`, `useLoginBusiness`, `useLogoutBusiness`)
- `src/lib/business-api/client.ts` OR extend `src/lib/api/client.ts` with `redirectOnAuthFailure` — pick after quick spike; leaning "extend + namespace"
- `src/app/business/(dashboard)/layout.tsx` — sidebar + topbar shell, mirror of `ruby-app/admin/(dashboard)/layout.tsx` structure; BranchSwitcher in topbar; auth guard + business-status gate
- `src/app/business/(auth)/{login,forgot-password,reset-password,business-pending,layout}.tsx`
- `src/lib/business-sockets/business-sockets-provider.tsx` — connects 7 namespaces on login, exposes per-namespace hooks; mounted at dashboard layout
- `src/lib/business-push/register-web-push.ts` + `public/business-sw.js` — VAPID registration + service worker with `push` + `notificationclick` handlers routing to deep links
- `src/lib/business-upload/upload-service.ts` — presigned-URL R2 uploader with canvas compression per context (`logo`/`cover`/`gallery`/`product`/`service`/`general`); parity with mobile `src/services/upload.service.ts`
- `src/components/business/BusinessSidebar.tsx` — nav groups: Overview / Commerce / Catalog / Marketing / Communication / Finance / Analytics / Settings
- `src/components/business/BranchSwitcher.tsx` — dropdown, persists `selectedBusinessId` in localStorage
- `src/components/business/BusinessPendingScreen.tsx`

**Reused primitives:** `<AuthProvider>` pattern from admin, `Modal`, `Drawer`, `PageHeader`, `StatCard`, `ToastProvider`, `NotificationDropdown` shell, `useApi`/`useMutation`, ruby-* Tailwind palette.

**Native subs:** localStorage tokens (SecureStore), Google Identity Services (Google OAuth), Apple JS SDK (Safari-only, feature-detected), Web Push (expo-notifications).

**Verification:**
1. Merchant logs in via email/password → JWT stored → dashboard shell renders
2. Merchant with PENDING_REVIEW status → redirected to `business-pending`
3. Merchant switches branch → BranchSwitcher stores selection; API calls carry the branch id
4. Sockets connect on login, disconnect on logout, reconnect on token refresh
5. Web Push registers on first opt-in; test push from admin fires notification with deep-link
6. Middleware `SUBDOMAIN_ALIAS_PREFIXES.business` verified so `business.rubyplus.net/orders` rewrites correctly

**Shippable:** Yes — dashboard exists, later milestones populate it.

### M1 — Dashboard home + daily operations

**Scope:** The `(tabs)/index.tsx` home screen. StatCards, engagement chips, banners, review preview, Chat FAB, daily-ops open/offline toggle.

**Screens:** `(dashboard)/page.tsx` (full), `(dashboard)/daily-operations/open-day/page.tsx`.

**Critical files (new):**
- `src/components/business/dashboard/{DashboardHeader,StoreStatusBar,NewOrdersBanner,PendingBanner,LocationFixBanner,ReadyToOpenCard,PayViaRubyBanner,ReferAndEarnLink,HelpMeRegisterCard}.tsx`
- `src/components/business/dashboard/StatCardRow.tsx` — orders / bookings / wallet stat cards
- `src/components/business/dashboard/EngagementChart.tsx` — Recharts area/bar, 7/14/30d chips
- `src/components/business/dashboard/ReviewPreviewCard.tsx`
- `src/components/business/chat/ChatFAB.tsx`
- `src/components/business/daily-operations/InventoryProductItem.tsx`, `ServiceAvailabilityItem.tsx`
- `src/lib/business-api/daily-operations.ts` — hooks `useTodayStatus`, `useOpenDay`, `useGoOffline`, `useUpdateInventory`
- `src/lib/business-api/analytics.ts` — hooks `useDashboardStats`, `useBusinessEngagement`

**Reused primitives:** `StatCard`, Recharts (already used on admin finance).

**Verification:** All banners appear conditionally under the same triggers as mobile. StatCards match mobile totals within 60 s cache. Open-day flow flips status LIVE.

**Shippable:** Yes.

### M2 — Orders + Delivery Tracking

**Scope:** Orders list, order detail, delivery live-tracking map, order lifecycle actions (accept / reject / status transitions / cancel), realtime updates.

**Screens:** `(dashboard)/orders/page.tsx`, `(dashboard)/orders/[id]/page.tsx`, `(dashboard)/orders/[id]/track-delivery/page.tsx`.

**Critical files (new):**
- `src/lib/business-api/orders.ts` — hooks `useOrders`, `useRecentOrders`, `usePendingOrdersCount` (30 s poll), `useOrderDetail` (10 s poll), `useAcceptOrder`, `useRejectOrder`, `useUpdateOrderStatus`, `useOrderStatusCounts`, `useOrderStats`
- `src/lib/business-api/delivery.ts` — hooks `useDeliveryJobs`, `useDeliveryJob`, `useDeliveryJobByOrder` (socket-primary, poll fallback)
- `src/components/business/orders/{OrderCard,FilterChips,OrderProgressStepper,RiderInfoCard,RouteCard}.tsx`
- `src/components/business/delivery/{LiveTrackingBanner,RiderMapMarker}.tsx` — Leaflet marker with pulse ring + rotation
- `src/components/business/delivery/DeliveryMap.tsx` — Leaflet map with pickup/dropoff/rider markers; SSR-safe dynamic import
- Socket wiring: `useOrdersRealtime` + `useDeliveryRealtime` hooks in `business-sockets-provider`

**Reused primitives:** `DataTable`, `StatusBadge`, `Modal`, existing Leaflet setup from `MapLocationPicker`.

**Native subs:** `react-native-maps` → Leaflet; `expo-notifications` new-order alert → Web Push.

**Verification:** New order fires push + updates list within socket latency. Delivery map shows rider marker within 20 s of Glovo webhook. Delivery-tracking screen matches mobile parity (map, rider card, ETA countdown, degradation banner).

**Shippable:** Yes — highest merchant value after dashboard.

### M3 — Bookings

**Scope:** Bookings list (3 tabs), booking detail, booking tracking (professional going to customer for AT_HOME), realtime, confirm/cancel/reschedule.

**Screens:** `(dashboard)/bookings/page.tsx`, `(dashboard)/bookings/[id]/page.tsx`, `(dashboard)/bookings/[id]/tracking/page.tsx`.

**Critical files:** hooks (`useBookings`, `useBookingDetail`, `useConfirmBooking`, `useUpdateBookingStatus`, `useCancelBooking`, `useRescheduleBooking`, `useBookingStats`), `BookingCard`, booking-realtime hook, `BookingTrackingMap` (Leaflet with professional's live coords).

**Reused primitives:** same as M2.

**Verification:** Booking status transitions fire realtime updates. AT_HOME booking tracking mirrors mobile's location-broadcast contract (professional's device pushes coords via `bookingSocketService.broadcastLocation` — merchant sees on map).

**Shippable:** Yes.

### M4 — Catalog: Products

**Scope:** Full product CRUD with variations, add-ons, images (multi-upload + primary selection), availability windows, nutritional info (restaurant subcategory only).

**Screens:** `(dashboard)/products/page.tsx` (grid + filter + search), `(dashboard)/products/create/page.tsx`, `(dashboard)/products/[id]/page.tsx`.

**Critical files:**
- `src/lib/business-api/products.ts` — `useProducts`, `useProductDetail`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useProductCategories`
- `src/components/business/products/{ProductCard,ImagePickerGrid,CategoryPicker,VariationBuilder,VariationPresetPicker,AddOnBuilder,NutritionalInfo,AvailabilityWindow}.tsx`
- `src/components/business/common/CommissionPreview.tsx` — live preview under price input (parity with mobile P58-59 commission disclosure)
- Extend upload-service with `ProductImage` array shape

**Native subs:** `expo-image-picker` → drag-drop dropzone + file input; `expo-image-manipulator` → canvas compression.

**Reused primitives:** `SearchableSelect`, `Modal`, `Drawer`, `ImageUpload` (adapt for multi-upload with primary flag).

**Verification:** Full CRUD works; images upload direct-to-R2; commission preview matches server calculation.

**Shippable:** Yes.

### M5 — Catalog: Services (respect the P55-3 gate)

**Scope:** Same shape as M4 for services — with `AvailabilitySlotBuilder`, `CancellationPolicyCard`, `TemplateFields` for subcategory-specific fields.

**Screens:** `(dashboard)/services/page.tsx`, `create/page.tsx`, `[id]/page.tsx`. Sidebar entry hidden when `!profile.hasServices` (mirror mobile gate).

**Critical files:** `useServices`, `useServiceDetail`, `useCreateService`, `useUpdateService`, `useDeleteService`, `useToggleServiceStatus`; `AvailabilitySlotBuilder`, `CancellationPolicyCard`, `TemplateFields`, `DynamicCustomFields`.

**Verification:** Slot builder handles per-day availability with capacity. Cancellation policy round-trips. Template fields render conditionally per subcategory.

**Shippable:** Yes (behind visibility gate).

### M6 — Wallet, DVA, Bank Accounts, Payouts, Payments, Merchant QR

**Scope:** Everything money-adjacent. Wallet index + transactions + detail + fund; DVA card; bank accounts list + add + resolve + set-primary; payouts list + detail + request; payment surfaces (card charge, saved cards, bank transfer, USSD) via Paystack Inline JS — NOT WebView; merchant QR (qrcode.react).

**Screens:** `(dashboard)/wallet/{page,transactions,transaction/[id],fund,qr-code}`, `(dashboard)/payouts/{page,detail/[id],request}`, `(dashboard)/bank-accounts/{page,add}`, `(dashboard)/payment/{card-input,bank-transfer,ussd,status}`.

**Critical files:**
- Hooks: `useBusinessWallets`, `useWalletDetail`, `useWalletTransactions`, `useWalletPeriodStats`, `useFundBusinessWallet`, `useDvaDetails`, `useBankAccounts`, `useCreate/Delete/SetPrimary/UpdateBankAccount`, `useBankList`, `useResolveBankAccount`, `usePayouts`, `useCreatePayout`, `useCancelPayout`, `useSavedCards`, `usePaymentStatus` (5 s poll), `useChargeCard`, `useSubmitPin`, `useSubmitOtp`, `useBankTransfer`, `useUssdCharge`, `useChargeSavedCard`, `useDeleteSavedCard`
- `src/lib/business-payments/paystack-inline.ts` — Paystack Inline JS wrapper (`PaystackPop.setup({...})`), replaces WebView flow
- `src/components/business/wallet/{WalletCard,DvaCard,BankAccountSheet,QuickAmountChips,TransactionItem}.tsx`
- `src/components/business/payment/{CardBrandIcon,CardNumberInput,CvvInput,ExpiryInput,OtpInputModal,PinInputModal,PaymentMethodCard,PaymentStatusIndicator,SavedCardItem}.tsx`
- `src/components/business/wallet/MerchantQrCode.tsx` — qrcode.react + canvas share/download (view-shot replacement)
- `src/components/business/wallet/TransactionReceiptDownload.tsx` — `html2canvas` or `canvas` DOM-to-image + `<a download>`

**Native subs:** WebView Paystack → Paystack Inline JS; view-shot → html2canvas + download link; qrcode-svg → qrcode.react.

**Verification:** Fund flow round-trips card charge + 3DS + wallet balance update. Bank account resolve calls Paystack lookup. Payout request → PENDING → COMPLETED via webhook. Merchant QR downloads as PNG. Transaction receipt shareable.

**Shippable:** Yes — critical infrastructure.

### M7 — Ad Campaigns (create, list, detail, push blast, organic reels)

**Scope:** Standalone ad-campaign creation (FEATURED_LISTING, SLIDESHOW_AD, EXPLORE_REELS_AD, FEATURED_REVIEWS, PUSH_NOTIFICATION), campaign list, detail, pause/resume/cancel/rerun. Push-blast composer with radius on Leaflet map + 180-char body + quota meter. Organic reel upload (video via file input, `<video>` preview).

**Screens:** `(dashboard)/ruby-ads/page.tsx` (subscription hub + campaigns), `(dashboard)/ads/create/page.tsx`, `[id]/page.tsx`, `push-blast/page.tsx`, `(dashboard)/reels/create/page.tsx`.

**Critical files:**
- Hooks: `useAdCampaigns`, `useAdCampaignDetail`, `useAdStats`, `useCreateAdCampaign` (wallet ONLY — no IAP), `usePauseAdCampaign`, `useResumeAdCampaign`, `useCancelAdCampaign`, `useRerunAdCampaign`, `useCreateOrganicReel`, `useMyOrganicReels`, `useAdProducts` (public catalogue)
- `src/lib/business-payments/paystack-recurring.ts` — Paystack Inline for one-shot ad purchases when merchant has no wallet balance
- `src/components/business/ads/{ActiveTierCard,TierCard,AdCampaignCard,QuotaMeter,PushBlastComposer,AdRadiusMap,VideoUploadDropzone}.tsx`

**Native subs:** IAP → deleted; wallet + Paystack Inline only. Video preview via `<video>`. Radius picker via Leaflet circle overlay (`L.circle()` with dynamic radius).

**Verification:** Ad create + wallet debit + campaign LIVE. Push blast quota decrements correctly. Reel upload writes to R2, is queued for backend transcoding (Phase 71 pipeline unchanged).

**Shippable:** Yes.

### M8 — Ad Subscriptions (Starter / Growth / Prime) + Ruby Quest

**Scope:** Subscribe / manage tier, change-tier flow with preview, pause / resume, schedule downgrade, set banner. Ruby Quest tier subscribe / pause / analytics.

**Screens:** `(dashboard)/ads/subscribe/page.tsx`, `manage/page.tsx`, `paystack-checkout/page.tsx` (replaced by Inline modal), `ruby-quest/page.tsx`.

**Critical files:**
- Hooks: `useAdSubscriptionStatus`, `useAdSubscriptionTiers`, `useSubscribeToTier` (wallet), `useInitializePaystackAdSub`, `useVerifyPaystackAdSub`, `useChangeTierPaystack`, `useChangeTierWallet`, `useSavedCard`, `useSubscribeWithSavedCard`, `usePreviewTierSwitch`, `useScheduleDowngrade`, `useCancelPendingDowngrade`, `useSetAdSubAutoRenew`, `usePauseSubscription`, `useResumeSubscription`, `useRequestPushBlast`, `useSetBanner`
- `useRubyQuestCampaigns`, `useRubyQuestMerchantAnalytics`, `useSubscribeRubyQuest`, `usePauseRubyQuest`, `useResumeRubyQuest`
- `src/components/business/ads-subscription/{TierGradientCard,TierComparison,DowngradePreview,SubscriptionStatusPill}.tsx`
- Paystack subscription flow via Inline JS (`PaystackPop.setup` with `plan` param + webhook verification)

**Native subs:** IAP → Paystack + wallet only. Paystack Inline replaces WebView.

**Verification:** Subscribe → PENDING → ACTIVE via Paystack webhook. Change-tier preview matches server calculation. Downgrade scheduled + cancellable. Banner upload + admin approval flow.

**Shippable:** Yes.

### M9 — Events (create, edit, analytics, ticket scanner)

**Scope:** Full merchant events surface. Create/edit event with ticket tiers + per-tier images, venue map picker (Leaflet), datetime pickers (HTML5). Event detail with submit/publish/withdraw/cancel. Ticket sales analytics. **Browser QR scanner** for door check-in via `html5-qrcode`.

**Screens:** `(dashboard)/events/page.tsx`, `create/page.tsx` (accepts `?id=` for edit), `[id]/page.tsx`, `analytics/[id]/page.tsx`, `scanner/[id]/page.tsx`.

**Critical files:**
- Hooks: `useMyEvents`, `useEventDetail`, `useCreateEvent`, `useUpdateEvent`, `useSubmitEvent`, `useWithdrawEvent`, `useCancelEvent`, `useEventTickets`, `useScanTicket`, `useEventPlatformFee`
- `src/components/business/events/{VenueMapPicker,PerksInput,TicketTierCard,TicketTierImageUpload,DateTimeRangePicker}.tsx`
- `src/components/business/events/TicketScanner.tsx` — wrap `@yudiel/react-qr-scanner` OR `html5-qrcode` (admin already uses one of these)

**Native subs:** `react-native-maps` VenueMapPicker → Leaflet (parity with admin `MapLocationPicker`). `expo-camera` scanner → `html5-qrcode`. DateTimePicker → `<input type="datetime-local">` or `react-day-picker` for polish.

**Verification:** Create event → submit → admin approves → LIVE. Ticket scanner reads real QR at ~15fps, dedupes double-scans, calls `POST /business/events/:id/scan`. Analytics matches admin ticket roster totals.

**Shippable:** Yes.

### M10 — Chat, Disputes, Support

**Scope:** Merchant chat conversations + threads, service card + booking card bubbles, create-booking-from-chat, image attachments, typing indicator. Disputes list + detail + create + reply. Merchant support config + WhatsApp card + admin support thread.

**Screens:** `(dashboard)/chat/page.tsx`, `chat/[id]/page.tsx`, `disputes/page.tsx`, `disputes/[id]/page.tsx`, `disputes/create/page.tsx`.

**Critical files:**
- Chat hooks: `useConversations`, `useConversation`, `useMessages` (infinite query), `useSendMessage`, `useCreateConversation`, `useChatUnreadTotal`, `useMarkChatRead`, `useDeleteChat`, `useCreateChatBooking`
- Dispute hooks: `useDisputes`, `useDisputeDetail`, `useAddDisputeMessage`, `useCreateGeneralDispute`, `findDisputeByRef`
- Support hooks: `useMerchantSupportConfig`, `useSupportThread` (admin thread realtime binding)
- `src/components/business/chat/{ChatInput,MessageBubble,SwipeableMessageBubble,TypingIndicator,ConversationCard,BookingCardBubble,ServiceCardBubble,CreateOrderModal,ImageViewModal}.tsx`
- `src/components/business/disputes/{DisputeCard,DisputeMessageThread,ResolutionCard}.tsx`
- `src/components/business/support/{TalkToRubyCard,ContactSupportButton,HelpMeRegisterCard}.tsx`
- Socket wiring: `useChatRealtime`, `useDisputesRealtime`

**Native subs:** Image picker → file input; swipe-to-reply haptics → silent no-op; clipboard → `navigator.clipboard`.

**Verification:** Messages arrive within socket latency. Typing indicator flips. Booking card in chat triggers `createChatBooking` flow. Dispute thread updates in real time. WhatsApp link opens correct number from live config.

**Shippable:** Yes.

### M11 — Notifications + Reviews + Analytics

**Scope:** In-app notification list with all types (order, booking, wallet, payout, dispute, business status, review, ads, chat, ad-subscription lifecycle emails). Web Push routing wired to full deep-link table. Reviews list with reply flow. Business analytics dashboard (Recharts).

**Screens:** `(dashboard)/notifications/page.tsx`, `(dashboard)/reviews/page.tsx`, `(dashboard)/analytics/page.tsx`.

**Critical files:**
- Notification hooks: `useNotifications`, `useUnreadCount`, `useMarkRead`, `useMarkAllRead`, `useRegisterDevice` (already in M0), `useRealtimeNotifications`
- Review hooks: `useBusinessReviews`, `useReviewStats`, `useReplyToReview`
- Analytics hooks: `useBusinessAnalytics`, `useBusinessEngagement`, `useBusinessReviewStats`
- `src/components/business/notifications/NotificationCard.tsx` — parity with mobile (embedded reel video via HTML5 `<video>`)
- `src/components/business/reviews/{ReviewCard,ReplyModal,ReviewFilters,QuickReplyChips}.tsx`
- `src/components/business/analytics/{RevenueAreaChart,OrdersByStatusChart,BookingsFunnelChart,TopProductsList,TopServicesList,EngagementFrame}.tsx`
- Extend service worker `notificationclick` handler with full deep-link table (already stubbed in M0)

**Reused primitives:** Recharts, existing `NotificationDropdown` shell (adapt for merchant).

**Verification:** Every notification type deep-links correctly. Review reply persists and shows on customer app. Analytics charts populate for at least revenue, orders, bookings, engagement, and top-selling items.

**Shippable:** Yes.

### M12 — Branches, Staff, Referrals

**Scope:** Multi-branch enable → parent business + child branches. Branch list + create + edit. Staff list + add + role management. Referrals (6-digit code display + share + stats).

**Screens:** `(dashboard)/branches/{page,enable,create,[id]}`, `(dashboard)/staff/{page,add,[id]}`, `(dashboard)/referral/page.tsx`.

**Critical files:**
- Hooks: `useBranches`, `useEnableMultiBranch`, `useCreateBranch`, `useUpdateCatalogMode`, `useStaffList`, `useAssignStaff`, `useUpdateStaffRole`, `useRemoveStaff`, `useBusinessReferralStats`
- `src/components/business/branches/{BranchCard,EnableMultiBranchModal,CreateBranchForm,CatalogModePicker}.tsx`
- `src/components/business/staff/{StaffCard,AddStaffForm,RolePicker}.tsx`
- `src/components/business/referral/{ReferralCodeCard,ReferralStatsCard,ShareLinkButton}.tsx`

**Native subs:** Branch location pin → Leaflet (parity with M0 pin); share → Web Share API (`navigator.share`) with copy-to-clipboard fallback.

**Verification:** Multi-branch enable creates parent business + first branch atomically. New branch inherits parent catalog per `catalogMode` (INHERIT / INDEPENDENT / MIXED). Staff role change round-trips.

**Shippable:** Yes.

### M13 — Profile, Settings, KYC, Verify-Phone, Change-Email/Password

**Scope:** Profile menu (Business / Finance / Account groups). Personal info edit. Change email (request → verify with OTP). Change password. Verify phone (OTP). Business preview (customer-eye). KYC verification (CAC, Gov ID, License uploads). Notification preferences. Legal, About.

**Screens:** `(dashboard)/profile/{page,personal-info,change-email,change-email/verify,verify-phone,business-preview,verification,notifications,legal,about}`, `(dashboard)/settings/change-password/page.tsx`.

**Critical files:**
- Auth hooks (from M0): `useUpdateProfile`, `useChangePassword`, `useRequestEmailChange`, `useVerifyEmailChange`, `useResendEmailChangeOtp`, `useCancelEmailChange`, `useSendPhoneOtp`, `useVerifyPhoneOtp`
- `src/components/business/profile/{ProfileMenu,PersonalInfoForm,ChangeEmailFlow,VerifyPhoneModal,BusinessPreviewCarousel,VerificationDocsUploader,NotificationPrefsForm}.tsx`
- File-input KYC uploader wraps `<input type="file" accept=".pdf,.jpg,.jpeg,.png">` + Paystack-Inline-style preview + presigned upload

**Native subs:** DocumentPicker → file input; OTP input → digit-per-field pattern (reuse mobile `OtpInput` layout in HTML).

**Verification:** Email change round-trips (old email confirms, new email verifies). Phone change requires OTP. KYC docs upload to R2 and show admin-review status. Business preview matches customer app's view of the business.

**Shippable:** Yes.

### M14 — Onboarding-Completion (DRAFT businesses only, NO new signup)

**Scope:** Merchants who registered on mobile but never finished can complete onboarding from the web. Reachable from Profile → "Finish setup". Reuses the mobile onboarding-hub checklist pattern. **Explicitly does NOT expose signup or new-account creation.**

**Screens (all under `(dashboard)/setup/`):** `onboarding-hub`, `personal-details`, `merchant-agreement`, `discount-agreement`, `verify-business`, `setup-settlement`, `setup-operation`, `select-category`, `select-subcategory`, `business-details`, `business-profile`, `upload-media`, `operating-hours`, `business-location`.

**Critical files:**
- `src/lib/business-onboarding/onboarding-store.ts` — Zustand persist store mirroring mobile `onboardingStore.getResumeRoute()` logic
- Every step gets its own component; hub renders progress + section-completion checklist + submit-for-review button
- Business-location step: Leaflet `MapLocationPicker` + Google Places Autocomplete (already available on admin)
- Business-details step: name-availability check (`api.business.checkName`)
- Setup-settlement: bank list + resolve + primary flag (M6 hooks)

**Native subs:** Every step uses M0-established file-input + Leaflet + HTML5 date picker patterns.

**Verification:** DRAFT merchant can complete every step from web, submit for review, land on `business-pending`. LIVE merchants never see this route (redirected to dashboard home).

**Shippable:** Yes — but low-priority; most merchants sign up + complete on mobile.

### M15 — Polish, PWA, Force-Update, Amplitude, Cross-Repo Verify

**Scope:** Non-feature work that makes the web port production-grade.

**Includes:**
- PWA manifest + service worker install prompt
- Force-update mechanism (build-hash check on every route change; toast prompt with "Refresh" button)
- Amplitude web wiring (`@amplitude/analytics-browser`) mirroring mobile `app='business'` tagging + PII strip
- `error.api_error` interceptor telemetry (mirrors mobile axios interceptor)
- Responsive polish — every screen tested at 320px / 768px / 1024px / 1440px
- Accessibility audit — ARIA on modals, keyboard-nav on tables, focus-trap on drawers
- Empty states + loading skeletons every screen
- Error boundaries per section (mirror mobile P138-2 tier structure)
- Merchant support "Talk to Ruby+ on WhatsApp" card wired to live `MerchantSupportConfig`
- Version-check + change-log toast on new deploy
- Full TS check across all 4 repos filtered to touched files
- E2E smoke matrix — 40-step user journey from login → order-accept → payout-request

**Verification:** Lighthouse ≥ 90 on PWA + performance + a11y. Zero TS errors. Cross-app smoke passes.

**Shippable:** Yes — the final polish gate.

---

## Cross-cutting patterns (apply globally across every milestone)

- **All merchant screens gated by** `useBusinessAuth()` + business status check in the `(dashboard)/layout.tsx`. A merchant flipped mid-session (webhook to `SUSPENDED`) is bounced to `business-pending` via socket-triggered redirect — mirror of mobile status watcher.
- **Every mobile hook has a matching web hook** in the same "domain module" file (e.g. `src/lib/business-api/orders.ts` exports every hook mobile's `useOrders.ts` does). API surface stays 1:1 — no invented client shapes.
- **Every mobile socket namespace** is wired in `BusinessSocketsProvider` and exposed via `useOrdersRealtime` / `useBookingsRealtime` / etc. Invalidations by `NotificationType` map ported verbatim from mobile.
- **Every mobile format helper** (`getOrderTotal`, `getItemName`, `getDeliveryStreet`, `getProductPrice`, `getServicePrice`, `formatDuration`, etc.) is ported to `src/lib/business-format.ts` with the same `x.newField ?? x.oldField` shape (see [backend↔frontend field mismatches memory](../memory/backend_frontend_field_mismatches.md)).
- **Every mobile deep-link** in `dispatchNotificationTap` has a matching web URL and the service worker `notificationclick` handler routes to it. No mobile-only navigation targets orphan on the web port.
- **Every mobile screen with a native dep** consults the substitution matrix above BEFORE implementation. If a substitution isn't listed, stop and add it.

## Anti-patterns to avoid

- **Do NOT** overload `AuthContext` with a business role discriminator. Fork it. Leaking admin RBAC concepts (`isSuperAdmin`, `hasLocationAccess`) into merchant code is a category of bug not worth the DRY savings.
- **Do NOT** implement IAP-style checkouts on web. If mobile buys something via IAP, on web it's Paystack + wallet. Full stop — trying to reuse the receipt-verification flow gets you into App Store policy territory unnecessarily.
- **Do NOT** use `react-native-webview`-style modal iframes for Paystack. Paystack Inline JS is a first-class DOM API — the checkout renders inline in a hosted popover, no iframe required. Simpler + supports 3DS natively.
- **Do NOT** re-invent the admin dashboard shell. Copy `ruby-app/admin/(dashboard)/layout.tsx`, swap sidebar nav + auth guard + branch switcher, keep the rest.
- **Do NOT** ship a milestone without full mobile-parity of its API contract. If mobile calls 12 endpoints for orders, the web business layer calls the same 12 — even if a specific screen only uses 8 today. Missing hooks strand later milestones.
- **Do NOT** support new merchant registration on web. The signup pages under `(public)/register` stay ONLY as marketing → "download mobile app" flow; never link to them from inside the dashboard.
- **Do NOT** silently drop native-only features (haptics, hardware back-button, etc.). Silent no-op is fine; but any feature the mobile app relies on (like the ticket scanner or QR share) must have an explicit web replacement listed in the substitution matrix.

## Effort estimate (rough, for planning)

| Milestone | Weeks | Cumulative |
|---|---|---|
| M0 Foundation | 2 | 2 |
| M1 Dashboard home | 1 | 3 |
| M2 Orders + delivery | 2 | 5 |
| M3 Bookings | 1.5 | 6.5 |
| M4 Products | 2 | 8.5 |
| M5 Services | 1.5 | 10 |
| M6 Wallet/payouts/payments | 3 | 13 |
| M7 Ad campaigns | 2 | 15 |
| M8 Ad subscriptions + Ruby Quest | 2 | 17 |
| M9 Events + scanner | 2 | 19 |
| M10 Chat + disputes + support | 2 | 21 |
| M11 Notifications + reviews + analytics | 2 | 23 |
| M12 Branches + staff + referrals | 1.5 | 24.5 |
| M13 Profile + KYC + settings | 1.5 | 26 |
| M14 Onboarding-completion | 1.5 | 27.5 |
| M15 Polish + PWA + verify | 2 | 29.5 |

**Total ~30 weeks single-engineer** on a straight sequential path. With two engineers pairing on independent domains (M2 + M4 concurrent, M6 + M9 concurrent, etc.) the calendar can compress to **~18-20 weeks** while keeping M0's foundation as the single blocker.

## Verification (end-to-end matrix)

Once M0-M15 land, a merchant should be able to:

| Step | Expected |
|---|---|
| Visit `business.rubyplus.net`, click Login | Land on `(auth)/login` |
| Enter email + password from mobile signup | Session created, redirected to dashboard home |
| Have LIVE status | See full dashboard shell + all sidebar entries |
| Have DRAFT status | Redirect to `business-pending` OR `setup/onboarding-hub` |
| Accept a new order | Push notification fires; order card appears in list; realtime updates |
| Track a delivery | Rider marker moves on Leaflet map within 20 s of provider webhook |
| Add a product with 4 images + 2 variations + commission preview | Images compressed client-side, upload to R2 direct, product created with correct schema shape |
| Fund wallet via card | Paystack Inline modal opens, 3DS completes, wallet balance updates within 60 s |
| Subscribe to Prime tier via Paystack | Inline checkout → webhook → tier ACTIVE, activeAdTier cached on Business |
| Create + submit an event with 3 ticket tiers + venue pin | Event LIVE after admin approval; ticket scanner reads real QR |
| Answer a chat message | Message arrives within socket latency; typing indicator on both sides |
| Request a payout | Payout PENDING → COMPLETED via webhook; receipt downloadable |
| Enable multi-branch, create 2nd branch | Parent + child created; BranchSwitcher shows both; catalog inheritance works |
| Complete KYC upload | Docs uploaded; admin sees them in verification queue |
| Receive a push notification | Deep-link opens correct screen (verified across all 15+ notification types) |
| Get suspended mid-session | Bounces to `business-pending` via socket |
| Log out | Tokens cleared; sockets disconnect; redirect to login |

Every row must pass before M15 is considered complete.
