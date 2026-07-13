# Ruby Quest — Software Requirements Document

> Source: `Ruby_Quest_Proposal_v2.pdf` (Digital Crib, 3/06/26)
> Companion docs: [user-flow.md](user-flow.md), [claude-prompt.md](claude-prompt.md)

This document specifies the technical build for Ruby Quest. Every requirement below is written to lean on infrastructure Ruby+ already ships — no reinvention of geofencing, wallets, ads, notifications, or ranking. Section 4 (Reuse Map) is the single most important part of this document; the rest cascades from it.

---

## 1. Purpose

Deliver a gamified in-person discovery mechanic that (a) increases measurable foot-traffic to partner merchants, (b) opens a new merchant ad product (`RUBY_QUEST_SPAWN`), (c) engages diaspora users months before travel, and (d) shipp fast by composing existing services.

---

## 2. Scope

**In scope (MVP):**
- Customer app: Quest tab (map, list, daily quests, leaderboard, prize inbox)
- Customer app: home / Deolu / business-detail integration points
- Business app: Ruby Quest section in Ads tab (buy spawn, view analytics, pause)
- Admin web: Spawn Manager, Reward pool CRUD, Leaderboard cycle, Prize fulfilment, Quarantine tab extension
- Backend: `RubyQuestModule` with spawn engine, claim resolver, quest engine, leaderboard cron, reward payload issuer, anti-fraud hooks

**Out of scope (v1):**
- Automated prize fulfilment (dinner vouchers etc. handled manually by ops via redemption codes in v1)
- Multi-collector rubies (every ruby is single-claim in v1)
- Team-play / group quests
- AR overlay (native `MapView` only, no ARCore/ARKit)
- Merchant self-serve custom reward payloads (admin-curated pool only in v1)

---

## 3. Personas

| Persona | Primary need |
|---------|-------------|
| **Explorer (customer)** | Fun reason to leave the house; wants the reward to feel real |
| **Diaspora traveller (customer)** | Something to look forward to before flying home; a way to "scout" the city |
| **Merchant** | Attributed foot-traffic; ROI on ad spend they can see |
| **Ops (admin)** | Ability to seed hero moments (Legendary drops), moderate abuse, fulfil prizes |
| **Finance (admin)** | Auditable reward liability + payout trail |

---

## 4. Reuse Map — What NOT to Rebuild

Ruby Quest composes existing systems. This table is authoritative — deviations require a written justification in the PR description.

| Need | Reuse | Where |
|------|-------|-------|
| Geofence detection at business arrival | `GeofenceCheckIn` schema + service | `backend/src/modules/reviews/geofence-checkin.*` (Phase 51) |
| Location + city resolution | `LocationsService`, `Location.centerPoint`, `2dsphere` index | `backend/src/modules/locations/*` |
| Business geo lookup / proximity | `Business.geoPoint`, `$geoNear` pipeline | `backend/src/modules/businesses/*` |
| Focal-point (resident vs visitor) | `useFocalPoint()` selector, `useLocationStore` | `customer/src/stores/location.store.ts` (P140) |
| Distance origin for filters | `resolveDistanceOrigin(userCoords, locationId)` pattern | `backend/src/modules/ask-ruby/services/search.service.ts` (P150) |
| Rewards / points ledger | `RewardsService.creditPoints()` (idempotent) | `backend/src/modules/rewards/*` (Phase 59, P94) |
| Wallet credit | `WalletsService.credit()` with ledger entry | `backend/src/modules/wallets/*` |
| Merchant ad purchase (IAP + Paystack + wallet) | `AdCampaign` + `IapAdProduct` catalogue + createFromIap flow | `backend/src/modules/ads/*` (P108, P109) |
| Push notifications | `NotificationsService`, `NotificationType` enum, device-token registry | `backend/src/modules/notifications/*` |
| In-app notifications feed | Existing notifications screen + card | `customer/app/(main)/notifications.tsx` |
| Analytics events | `analytics.track()` wrapper (Amplitude) | Both mobile apps (P102) |
| Map rendering (native map + pins + clusters) | `MapView` component pattern from events tab | `customer/app/(tabs)/events.tsx`, `EventMapMarker` |
| Bottom sheet UI | Existing `EventBottomSheetContent` pattern | `customer/src/components/events/*` |
| Business ad tier (Prime perks) | `BusinessAdSubscription` + `activeAdTier` cached field | `backend/src/modules/ad-subscriptions/*` (P120) |
| Ad campaign pause/resume | Existing pause/resume state machine | `AdCampaign` (P124) |
| Admin queue + moderation | Same table + drawer pattern as reviews moderation | `web/src/app/ruby-app/admin/reviews/*` |
| Cross-navigator back navigation | `?from=<pathname>` param honoured by business detail | `customer/app/(tabs)/business/[id].tsx` (P151) |
| Device fingerprint (anti-fraud) | `deviceFingerprintId` on User + reward-ledger entries | Phase 99 |
| Quarantine mechanism | `user.isQuarantined` flag, cluster alerts | Phase 99 |
| Weighted-shuffle (for spawn placement fairness) | `weighted-shuffle.ts` utility | `backend/src/common/utils/weighted-shuffle.ts` (P114) |

Anything not in this table is a candidate for a new primitive — but even those should follow existing folder / naming / testing conventions.

---

## 5. Functional Requirements

### 5.1 Spawn engine (backend cron + on-demand)

**FR-SPN-1** — A `RubyQuestSpawn` document represents one active ruby. Fields: `_id`, `businessId`, `locationId` (denormalised), `geoPoint` (denormalised from business.geoPoint), `rarity` (COMMON / RARE / LEGENDARY), `rewardConfigId`, `spawnedAt`, `expiresAt`, `status` (LIVE / CLAIMED / EXPIRED / REVOKED), `claimedBy` (userId, null until claimed), `claimedAt`, `checkInId`, `source` (AUTO_TIER / ADMIN_EDITORIAL / MERCHANT_AD), `sourceAdCampaignId?`, `sourceAdminUserId?`.

**FR-SPN-2** — A cron runs every 5 minutes. For each active `RUBY_QUEST_SPAWN` `AdCampaign`, checks whether the merchant's tier quota needs a new spawn (Common: 1/day, Rare: 1/3 days, Legendary: 1/week). If yes, creates a `RubyQuestSpawn` with the merchant's `business.geoPoint`.

**FR-SPN-3** — Editorial spawns are created via `POST /admin/ruby-quest/spawns`. Same schema, `source: ADMIN_EDITORIAL`. No merchant payment.

**FR-SPN-4** — Prime-tier subscription (P120) grants 1 free Common spawn per business per week. The tier auto-activate cron (P139) triggers a `RUBY_QUEST_SPAWN` seed on tier activation.

**FR-SPN-5** — An expiry sweep cron runs every minute, flips any `LIVE` spawn whose `expiresAt < now` to `EXPIRED`. Expired spawns disappear from the customer map on next refresh.

**FR-SPN-6** — Every spawn write validates `business.status === 'LIVE'` and `business.geoPoint` exists + coords are within Nigeria's bounding box. Rejects otherwise with a clear error surfaced to the admin form.

### 5.2 Discovery (customer)

**FR-DIS-1** — `GET /public/ruby-quest/near?lat=&lng=&radiusKm=&focalPointSource=` returns all `LIVE` spawns within the radius. Response envelope: `{ items, withinRadius, radiusKm, focalPoint }` (matches P140 envelope shape).

**FR-DIS-2** — Response items carry: `spawnId`, `rarity`, `rewardPreview` (short human string), `businessId`, `businessName`, `businessLogoUrl`, `distanceKm` (from focal point origin per P150), `expiresAt`. NO raw `rewardConfigId` — the customer must not be able to decompile the reward pool.

**FR-DIS-3** — The mobile map query respects the P140 focal point (resident GPS OR visitor picked city). Radius default 15 km, capped 25 km.

**FR-DIS-4** — Rubies already claimed by the user OR claimed by someone else are excluded server-side. No client-side filter.

**FR-DIS-5** — For each returned business, the endpoint also stamps `hasActiveSpawn: true` on the response for Home + Deolu + Business-detail badge decoration (via a lightweight `activeRubySpawns` map).

### 5.3 Claim (customer)

**FR-CLM-1** — `POST /user/ruby-quest/claims` with `{ spawnId, checkInId?, deviceFingerprintId }`. Auth required.

**FR-CLM-2** — Server checks in order, short-circuit on first fail:
1. `spawn.status === 'LIVE'` and `spawn.expiresAt > now`
2. `spawn.claimedBy === null` (via atomic `findOneAndUpdate({_id, claimedBy: null}, {$set: {claimedBy: userId, claimedAt: now, status: 'CLAIMED'}})`)
3. A matching `GeofenceCheckIn` exists — either provided via `checkInId` OR created server-side from a fresh location ping within `RUBY_QUEST_CHECKIN_MAX_AGE_S` (300s) at the spawn's coords ± `RUBY_QUEST_GEOFENCE_M` (60m).
4. User is not quarantined
5. Rate limit not exceeded (`RUBY_QUEST_MAX_CLAIMS_PER_HOUR` = 5; `PER_DAY` = 20)

**FR-CLM-3** — On success the server:
1. Resolves the `RubyRewardConfig` referenced by the spawn
2. Issues the reward via the appropriate primitive:
   - `POINTS` → `RewardsService.creditPoints({ userId, points, source: 'RUBY_QUEST_COLLECT', idempotencyKey: spawnId })`
   - `WALLET_CREDIT` → `WalletsService.credit({ userId, amount, type: 'RUBY_QUEST_REWARD', ref: spawnId })`
   - `SCRATCH_CARD` → creates a `ScratchCard` doc, returns pre-hashed values; user "scratches" client-side to reveal (server confirms)
   - `PERCENT_OFF` / `FREE_DELIVERY` → creates a `Promo` entry scoped to user
   - `MANUAL_PRIZE` → creates an `AdminPrizeQueue` row for ops fulfilment (leaderboard prizes take this path too)
3. Bumps daily-quest progress if applicable
4. Fires `RUBY_QUEST_COLLECT` analytics event with spawn rarity + business
5. Returns `{ claim: {...}, reward: {...} }`

**FR-CLM-4** — Idempotency: `spawnId` is the effective idempotency key. Retrying with the same spawnId returns the original claim response (200), never double-credits.

**FR-CLM-5** — Failure responses use existing error taxonomy: `NOT_AT_LOCATION`, `SPAWN_EXPIRED`, `ALREADY_CLAIMED`, `USER_QUARANTINED`, `RATE_LIMITED`. Never leak fraud-detection reasoning.

### 5.4 Daily quests

**FR-DQ-1** — A `DailyQuestTemplate` collection holds reusable templates (title, description, criteria, rewardConfigId). Seeded at boot with 5-8 templates.

**FR-DQ-2** — A cron at 04:00 Africa/Lagos picks 2-3 templates per user based on their prior activity (variety > repetition) and writes a `UserDailyQuest` doc for the day.

**FR-DQ-3** — `GET /user/ruby-quest/daily` returns the user's current quests + progress.

**FR-DQ-4** — Every claim (§5.3) triggers a `QuestProgressService.evaluate(userId, event)` call that updates matching in-flight quests and fires their completion reward if hit.

### 5.5 Leaderboard

**FR-LB-1** — A `LeaderboardEntry` collection holds `{ userId, cycleId, city, rubiesCollected, pointsEarned, rank, snapshotAt }`.

**FR-LB-2** — City is derived from the user's `lastKnownLocation` at claim-time. Users with no NG city AND foreign country → `DIASPORA` bucket.

**FR-LB-3** — Cycle ID is `YYYY-Www` (ISO week). Cycles cut at Sunday 23:59 Africa/Lagos.

**FR-LB-4** — `GET /user/ruby-quest/leaderboard?city=&cycle=` returns top 100 for a city / cycle plus the caller's own row (even if outside top 100).

**FR-LB-5** — Weekly cut cron: at Monday 00:00 Africa/Lagos, snapshot top 10 per city, create `AdminPrizeQueue` rows for each winner referencing an admin-configured `LeaderboardPrizeConfig`, notify winners via push + in-app notification.

### 5.6 Merchant

**FR-MER-1** — New `AdType.RUBY_QUEST_SPAWN` added to `AdCampaign` schema + `AD_TYPE_CONFIGS` (COMMON / RARE / LEGENDARY subtypes as `AdCampaign.rubyQuestTier`).

**FR-MER-2** — New IAP SKUs: `com.rubyplus.ads.rubyquest.common.v1`, `.rare.v1`, `.legendary.v1`. Paystack path uses existing paystack-ad-purchase flow.

**FR-MER-3** — Legendary tier purchase enters `PENDING_ADMIN_APPROVAL` (P139 pattern) — no spawns fire until admin approves.

**FR-MER-4** — `GET /business/ruby-quest/analytics` returns merchant's spawn stats: issued, collected, unique visitors, repeat visitors, collection rate, weekly trend.

**FR-MER-5** — Pause/resume follows existing `AdCampaign` pause/resume state machine (P124).

### 5.7 Admin

**FR-ADM-1** — `/ruby-app/admin/quest` — tabs: Spawn Manager, Rewards, Leaderboards, Prize Queue, Config.

**FR-ADM-2** — All create/edit/delete endpoints go through the existing `AuditService.log()` — every action leaves a durable audit-log entry.

**FR-ADM-3** — Reward pool CRUD writes `RubyRewardConfig` — schema below.

**FR-ADM-4** — Prize queue: admin marks each `AdminPrizeQueue` row as `PENDING → FULFILLED → REDEEMED`, with an optional note.

**FR-ADM-5** — Config tab surfaces the tunables (§8) with a "Save + hot-reload" mechanism using the same singleton-config pattern as `MerchantSupportConfig` (P135).

---

## 6. Data Model

New collections (Mongoose schemas — follow existing naming conventions):

```ts
// backend/src/modules/ruby-quest/schemas/ruby-quest-spawn.schema.ts
{
  businessId: ObjectId (indexed),
  locationId: ObjectId (indexed),
  geoPoint: { type: 'Point', coordinates: [lng, lat] },  // 2dsphere index
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY',
  rewardConfigId: ObjectId (ref RubyRewardConfig),
  spawnedAt: Date,
  expiresAt: Date (indexed),
  status: 'LIVE' | 'CLAIMED' | 'EXPIRED' | 'REVOKED' (indexed),
  claimedBy: ObjectId | null (indexed),
  claimedAt: Date | null,
  checkInId: ObjectId | null,
  source: 'AUTO_TIER' | 'ADMIN_EDITORIAL' | 'MERCHANT_AD' | 'SUBSCRIPTION_PERK',
  sourceAdCampaignId: ObjectId | null,
  sourceAdminUserId: ObjectId | null,
  createdAt, updatedAt
}
// Compound index: { status: 1, expiresAt: 1 } (expiry sweep)
// Compound index: { locationId: 1, status: 1, geoPoint: '2dsphere' } (map query)
```

```ts
// ruby-reward-config.schema.ts
{
  name: string,
  description: string,
  type: 'POINTS' | 'SCRATCH_CARD' | 'FREE_DELIVERY' | 'PERCENT_OFF' | 'WALLET_CREDIT' | 'MANUAL_PRIZE',
  value: number | null,           // points count, ngn credit, percent, etc.
  allowedRarities: Array<'COMMON' | 'RARE' | 'LEGENDARY'>,
  weight: number,                 // for the weighted-shuffle picker
  redemptionInstructions: string,
  isActive: boolean,
  createdAt, updatedAt
}
```

```ts
// ruby-quest-claim.schema.ts (denormalised for analytics + audit — spawn also stores claim, this is the append-only log)
{
  spawnId: ObjectId (indexed),
  userId: ObjectId (indexed),
  businessId: ObjectId,
  rarity: string,
  rewardConfigId: ObjectId,
  rewardType: string,
  rewardValueSnapshot: any,
  checkInId: ObjectId,
  deviceFingerprintId: string,
  claimedAt: Date (indexed),
  cycleId: string (indexed),      // for leaderboard aggregations
  city: string,
  ledgerEntryId: ObjectId | null,
  scratchCardId: ObjectId | null,
  promoId: ObjectId | null,
  prizeQueueId: ObjectId | null
}
```

```ts
// daily-quest-template.schema.ts
{
  key: string (unique),
  title: string,
  description: string,
  criteria: {
    type: 'COLLECT_N_TODAY' | 'VISIT_NEW_BUSINESS' | 'VISIT_N_CATEGORIES' | 'COLLECT_RARITY',
    target: number,
    rarity?: string,
    minCategories?: number
  },
  rewardConfigId: ObjectId,
  isActive: boolean
}

// user-daily-quest.schema.ts
{
  userId: ObjectId (indexed),
  templateKey: string,
  progress: number,
  target: number,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED',
  dayId: string,                  // 'YYYY-MM-DD Africa/Lagos'
  completedAt: Date | null,
  claimedRewardAt: Date | null
}
// Compound index: { userId: 1, dayId: 1 }
```

```ts
// leaderboard-entry.schema.ts
{
  userId: ObjectId (indexed),
  cycleId: string (indexed),      // 'YYYY-Www'
  city: 'LAGOS' | 'ABUJA' | 'PORT_HARCOURT' | 'DIASPORA' (indexed),
  rubiesCollected: number,
  pointsEarned: number,
  rank: number | null,            // populated at cycle cut
  snapshotAt: Date | null
}
// Unique compound: { userId: 1, cycleId: 1 }
// Index: { cycleId: 1, city: 1, rank: 1 } (leaderboard read)
```

```ts
// admin-prize-queue.schema.ts
{
  userId: ObjectId (indexed),
  source: 'LEADERBOARD_TOP10' | 'LEGENDARY_CLAIM' | 'MANUAL',
  rewardConfigId: ObjectId | null,
  rewardDescription: string,
  redemptionCode: string (unique),
  status: 'PENDING' | 'CONTACTED' | 'FULFILLED' | 'REDEEMED' | 'CANCELLED' (indexed),
  fulfilmentNote: string,
  fulfilledBy: ObjectId (adminUser),
  fulfilledAt: Date | null,
  createdAt
}
```

New enum additions to `common/interfaces`:
- `AdType.RUBY_QUEST_SPAWN`
- `NotificationType.RUBY_APPROACH`, `RUBY_LEGENDARY_SPAWNED_IN_YOUR_CITY`, `LEADERBOARD_WINNER`, `RUBY_QUEST_PRIZE_READY`
- `LedgerEntryType.RUBY_QUEST_REWARD`
- `RewardEntryType.RUBY_QUEST_COLLECT` (in `RewardsService`)
- `AuditAction.RUBY_QUEST_SPAWN_CREATED`, `RUBY_QUEST_SPAWN_REVOKED`, `RUBY_QUEST_LEADERBOARD_CUT`, `RUBY_QUEST_PRIZE_FULFILLED`

**No new fields on the User schema.** Every per-user state (quest progress, leaderboard entry) lives in its own collection.

---

## 7. API Contracts

### Customer

```
GET  /public/ruby-quest/near               -> { items: SpawnCard[], withinRadius, radiusKm, focalPoint }
POST /user/ruby-quest/claims               -> { claim, reward }
GET  /user/ruby-quest/daily                -> { quests: UserDailyQuest[] }
GET  /user/ruby-quest/leaderboard          -> { top: Row[], me: Row | null, cycle, city }
GET  /user/ruby-quest/history              -> { items: Claim[], pagination }   // "My rubies"
GET  /user/ruby-quest/prizes               -> { items: AdminPrizeQueue[] }     // pending prize inbox
```

### Business (merchant)

```
GET  /business/ruby-quest/analytics        -> weekly stats + trend
POST /business/ruby-quest/subscribe        -> creates AdCampaign with type RUBY_QUEST_SPAWN
POST /business/ruby-quest/pause/:campaignId
POST /business/ruby-quest/resume/:campaignId
```

### Admin

```
GET  /admin/ruby-quest/spawns              -> filterable list
POST /admin/ruby-quest/spawns              -> editorial spawn
PATCH /admin/ruby-quest/spawns/:id         -> edit / revoke
GET  /admin/ruby-quest/rewards             -> CRUD reward pool
POST /admin/ruby-quest/rewards
PATCH /admin/ruby-quest/rewards/:id
GET  /admin/ruby-quest/leaderboards        -> current + historical
POST /admin/ruby-quest/leaderboards/cut    -> manual cycle cut
GET  /admin/ruby-quest/prize-queue
PATCH /admin/ruby-quest/prize-queue/:id    -> mark FULFILLED / REDEEMED
GET  /admin/ruby-quest/config              -> tunables
PATCH /admin/ruby-quest/config
```

All responses conform to the platform's existing `{ success, data, meta }` envelope. Paginated endpoints return `{ items, pagination }`.

---

## 8. Business Rules & Tunables

Every constant below lives in a `RubyQuestConfig` singleton doc (hot-reload via admin), NOT hard-coded:

| Constant | Default | Notes |
|----------|---------|-------|
| `RUBY_QUEST_MAP_RADIUS_KM` | 15 | Matches P140 |
| `RUBY_QUEST_APPROACH_M` | 200 | Approach push trigger |
| `RUBY_QUEST_GEOFENCE_M` | 60 | Collect radius |
| `RUBY_QUEST_CHECKIN_MAX_AGE_S` | 300 | Claim vs check-in staleness |
| `RUBY_QUEST_MAX_CLAIMS_PER_HOUR` | 5 | Per user |
| `RUBY_QUEST_MAX_CLAIMS_PER_DAY` | 20 | Per user |
| `RUBY_QUEST_COMMON_EXPIRY_H` | 48 | |
| `RUBY_QUEST_RARE_EXPIRY_H` | 12 | |
| `RUBY_QUEST_LEGENDARY_EXPIRY_H` | 4 | |
| `RUBY_QUEST_TIER_COMMON_CADENCE_D` | 1 | 1 spawn / day |
| `RUBY_QUEST_TIER_RARE_CADENCE_D` | 3 | |
| `RUBY_QUEST_TIER_LEGENDARY_CADENCE_D` | 7 | |
| `RUBY_QUEST_LEADERBOARD_TOP_N` | 10 | Prize slots per city |
| `RUBY_QUEST_ONE_SPAWN_PER_BUSINESS` | true | Only one LIVE spawn per business at a time |
| `RUBY_QUEST_ANTI_SPOOF_MAX_M_PER_S` | 50 | Sanity cap on user velocity between GPS pings; flag if exceeded |

Rarity-mix within a city (auto-tier spawn engine): 70% Common, 25% Rare, 5% Legendary. Legendary spawns via merchant ad always require admin approval regardless of quota.

---

## 9. Integrations (recap)

See §4 (Reuse Map). Additionally:
- **Deolu (backend)**: `SearchService` and `topForLocation` responses gain an optional `hasActiveRubySpawn: boolean` per merchant, populated from an in-memory map keyed on businessId (fetched once per request from a lightweight `LIVE` spawn count aggregation cached 30 s).
- **Business ranking**: no changes. Rubies do not alter ranking; they decorate.
- **Wallet ledger UI (admin + mobile)**: `RUBY_QUEST_REWARD` gets a purple 💎 icon and shows the spawn business name.

---

## 10. Non-Functional Requirements

### 10.1 Performance
- `GET /public/ruby-quest/near` p95 < 250 ms with 500 active spawns in the queried radius.
- Map render: pin drop < 100 ms after data arrives; cluster recompute < 16 ms per zoom change.
- Claim POST p95 < 400 ms (including reward issuance).

### 10.2 Availability
- Spawn engine cron: `CronLockService`-guarded (same pattern as transcoding, P71) — safe under multi-replica.
- Expiry sweep: same.
- Weekly cut: `CronLockService` + idempotency on `cycleId` (retries never double-award prizes).

### 10.3 Security & anti-fraud
- Every claim writes `deviceFingerprintId` (P99) into `RubyQuestClaim`.
- Anti-spoof: server checks the delta between consecutive check-ins for the same user; > `RUBY_QUEST_ANTI_SPOOF_MAX_M_PER_S` flags for review (does NOT reject in v1 — false-positive risk).
- Cluster alerts (P99) get a new signal type `RUBY_QUEST_HOARDING` — flags when 3+ users on the same `deviceFingerprintId` all claim in the same city within 24 h.
- Quarantined users' claims fail with generic `TEMPORARILY_UNAVAILABLE` — no fraud tell.

### 10.4 Privacy
- Leaderboard rows show `firstName` + initial of `lastName` only. No email, no phone.
- Diaspora bucket is opt-out from the profile settings.
- Location data used only for the claim-time check-in; no continuous background tracking.

### 10.5 Offline behaviour
- Map view degrades to last-cached spawn set with a "Reconnecting…" banner.
- Claim: local retry queue; the reward drops only when the network round-trip succeeds.

### 10.6 Telemetry
Every event via `analytics.track()` (P102 Amplitude):
- `ruby_quest.map_opened`
- `ruby_quest.pin_tapped { rarity, distanceKm }`
- `ruby_quest.approach_notified`
- `ruby_quest.checkin_recorded`
- `ruby_quest.claim_attempted`
- `ruby_quest.claim_succeeded { rarity, rewardType }`
- `ruby_quest.claim_failed { reason }`
- `ruby_quest.daily_quest_completed { templateKey }`
- `ruby_quest.leaderboard_viewed { city }`
- `ruby_quest.prize_notified`

---

## 11. KPI Dashboard Extensions

Add a Ruby Quest card to `admin/analytics` reading from the existing analytics service:
- Active spawns (live count, by city, by rarity)
- Collections today / this week
- Collection rate by rarity + by source (AUTO_TIER vs MERCHANT_AD vs ADMIN_EDITORIAL)
- Foot-traffic attribution: unique business visits triggered by a spawn
- Top 5 merchants by Quest-derived foot traffic
- Leaderboard participation by city
- Diaspora engagement (weekly retention)

---

## 12. Rollout Plan

**Phase P152-A (Backend foundation)** — 2-3 days
- Module scaffold, schemas, config singleton, seed reward pool
- Spawn engine cron (AUTO_TIER + ADMIN_EDITORIAL paths)
- Expiry sweep
- Discovery + claim endpoints (no reward issuance yet, log-only)
- Unit tests for atomic claim resolver

**Phase P152-B (Reward wiring)** — 1-2 days
- Wire reward payload issuers (points → wallet → scratch card → promo → prize queue)
- Idempotency spec passes
- Rate-limit spec passes

**Phase P152-C (Customer mobile)** — 3-4 days
- Quest tab (map + list + bottom sheet)
- Claim animation + reward reveal
- Daily quests strip
- Leaderboard screen
- Prize inbox
- Home + Deolu + business-detail decoration points

**Phase P152-D (Business mobile)** — 1-2 days
- Ruby Quest section under Ads tab
- Subscribe / pause / resume
- Analytics card

**Phase P152-E (Admin web)** — 2 days
- Spawn Manager
- Reward pool CRUD
- Leaderboards + Prize queue
- Config editor
- Audit-log integration

**Phase P152-F (Weekly leaderboard + integrations)** — 1-2 days
- Weekly cut cron
- Prize queue winner-award flow
- Deolu + home integration decorations
- Analytics dashboard card

**Phase P152-G (Anti-fraud + polish)** — 1-2 days
- Cluster alert signal
- Anti-spoof velocity check
- Push notification wiring (approach + legendary + winner)
- End-to-end verification matrix

**Phase P152-V (Verify + OTA + backend deploy)** — 0.5 day
- TS check all repos filtered to touched files
- Manual smoke matrix (§13)
- Deploy backend + OTA customer + OTA business + admin web

Total: **12-15 dev days**. First shippable slice (customers can actually collect a spawn admin-seeded via the admin page) at end of P152-C, ~1 week in.

---

## 13. Verification Matrix (Manual smoke)

| Scenario | Expected |
|----------|----------|
| Admin seeds Legendary at Cafe Neo Lekki | Spawn visible on Lagos-region customer maps within 30 s |
| Customer 20 km away | Spawn NOT in customer's radius query |
| Customer arrives Cafe Neo, taps ruby | Reward credited, spawn CLAIMED, disappears from other users' maps |
| Second user arrives 30 s later | Sees "Already claimed" and pin gone |
| User in visitor mode (GPS in Ikeja, city picked Lekki) | Sees Lekki spawns on map (focal-point respected) |
| User's phone GPS abroad (9000 km) | Home doesn't crash; Quest tab shows the "Enable precise location" empty state OR the visitor city if picked |
| Airplane mode at claim tap | Local retry succeeds when network returns, no double-credit on retry |
| Merchant buys Common spawn | AdCampaign created, first spawn appears within 5 min |
| Prime-tier merchant | Gets free Common spawn without paying (subscription perk) |
| Legendary merchant purchase | Enters PENDING_ADMIN_APPROVAL; no spawn until admin approves |
| Sunday 23:59 → Monday 00:00 | Leaderboards cut; top-10 per city get prize notifications + prize inbox rows |
| User in top 10 opens app | Prize modal + support-chat CTA pre-filled with redemption code |
| Quarantined user attempts claim | Generic error, spawn NOT decremented |

---

## 14. Open Questions

1. **Reward economics** — needs finance sign-off on the ₦/point value + per-tier reward budget. Owner: finance.
2. **Legendary curation cadence** — how many admin-editorial Legendaries per city per week? Owner: ops.
3. **Prize fulfilment SLA** — how fast do leaderboard winners receive their prize? v1 is manual; SLA TBD.
4. **Diaspora country list** — is it any non-NG country, or restricted to a whitelist (UK, US, Canada, etc.)?
5. **Anti-spoof enforcement threshold** — v1 flags only. When do we start hard-rejecting?

Blockers on any of these do not block P152-A and P152-B (both are wiring-only).
