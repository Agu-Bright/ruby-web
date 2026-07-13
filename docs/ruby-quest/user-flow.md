# Ruby Quest — User Flow Document

> Source: `Ruby_Quest_Proposal_v2.pdf` (Digital Crib, 3/06/26)
> Companion docs: [srd.md](srd.md), [claude-prompt.md](claude-prompt.md)

Ruby Quest is a city-wide, gamified discovery layer that turns Ruby+ browsing into a Pokémon-GO-style treasure hunt. Virtual **rubies** spawn at partner-business locations. Customers walk to the location, the app geofence-detects arrival, they tap the ruby to collect it, and a real wallet reward drops in.

The feature has to feel effortless from the customer side, low-friction for the merchant, and safe/auditable from the admin side. Every ruby collected is a real customer walking into a real store — that measurable foot-traffic is the product.

---

## 1. Actors

| Actor | Where they use it |
|-------|-------------------|
| **Customer** | Ruby+ customer mobile — a new **Quest** bottom tab, plus deep-links from home + Deolu |
| **Merchant** | Ruby+ business mobile — a new **Ruby Quest** section under the Ruby+ Ads tab (buy spawns, view attribution) |
| **Admin** | Ruby+ admin web — a new `/ruby-app/admin/quest` page (seed spawns, curate legendaries, prize fulfilment, reports) |
| **System (cron)** | Backend workers — auto-spawn cadence, expiry sweep, weekly leaderboard cut, anti-fraud batch |

---

## 2. Preconditions

- Customer is signed in (guest browsing is out of scope for MVP — collection requires an identity).
- Customer has granted **precise** location permission. Coarse-only permission surfaces a soft blocker card with a "Grant precise" CTA.
- Customer is in a covered city (Lagos, Abuja, Port Harcourt at launch; more added via `Location.isActive = true`).
- Business has `geoPoint` and `status: LIVE`. Spawns without a valid geoPoint are rejected at admin-create time.

---

## 3. Primary Customer Flow — Discover → Travel → Arrive → Collect → Reward

The full loop, exactly as the PDF describes it, one screen at a time.

### 3.1 Open the Quest tab
- Customer taps the **Quest** tab in the bottom nav (new fifth tab, replaces nothing).
- The tab shows an always-on red dot when there is at least one uncollected ruby within `RUBY_QUEST_MAP_RADIUS_KM` (default 15 km) of the customer's focal point — same focal-point store as home discovery (P140).
- First-open shows a one-screen onboarding sheet: "Ruby Quest — collect real rewards by visiting real places." One "Got it" button; never shown again.

### 3.2 Read the map
- Full-screen `MapView` centred on the focal point.
- Every active ruby within the radius renders as a coloured pin: **grey = Common, blue = Rare, red = Legendary**.
- Pins are clustered when zoomed out; a marker cluster of 3+ shows the count and a mixed-rarity badge.
- Tapping a pin opens a `RubyBottomSheet`:
  - Rarity name + reward preview ("Legendary — 1 free delivery + surprise wallet drop")
  - Business name, category, distance ("2.4 km away")
  - Countdown to expiry ("Vanishes in 3h 12m")
  - **Get directions** → in-app directions screen (existing `/directions`)
  - **View business** → `/(tabs)/business/[id]?from=/(tabs)/quest` (respects the P151 back-nav pattern)

### 3.3 Travel to the business
- Customer either uses the "Get directions" CTA (opens the in-app directions screen with the ruby coords), or hails a ride via the existing external-Uber button, or just walks.
- No app interaction required en-route. The Quest tab keeps working normally.
- Push notification fires opportunistically when the user comes within `RUBY_QUEST_APPROACH_M` (default 200 m) of any uncollected ruby: "You're close to a Rare ruby at Cafe Neo, Lekki." Throttled to at most one notification per business per hour.

### 3.4 Arrive
- On entering the business's `RUBY_QUEST_GEOFENCE_M` radius (default 60 m), the app writes a `GeofenceCheckIn` (same collection Phase 51 introduced) and stamps `checkInId` on the pending claim.
- The ruby pin on the map switches to an **"Ready to collect"** state (animated pulse).
- A local push notification fires: "Tap the ruby to claim your reward at Cafe Neo."

### 3.5 Collect
- Customer taps the ready ruby. A full-screen `RubyClaimSheet` opens.
- Client sends `POST /user/ruby-quest/claims` with `{ spawnId, checkInId, deviceFingerprintId }`.
- Server validates in order: spawn is `LIVE`, not expired, not already claimed, check-in exists ≤ 5 min old, user is not quarantined (`user.isQuarantined === false`), rate limit not hit.
- On success: server marks spawn `CLAIMED_BY = userId`, writes the reward via existing wallet/reward primitives, returns the reward payload.
- Client animates a **ruby-shatter → glitter → reward drop** sequence, then shows the reward card:
  - **Common** — `+X pts` (small; e.g. 50 pts = ₦50 via `PointsValuationService`)
  - **Rare** — `+X pts` + scratch card (reveals a variable-value discount or bonus points)
  - **Legendary** — one of a curated pool: free delivery for a week, half off next order, complimentary dessert, ₦5,000 wallet credit, weekend shortlet voucher
- The reward is credited synchronously — the claim response is the source of truth. No "please check your wallet in 24h."
- CTAs: "See reward in wallet", "Back to map".

### 3.6 Post-collect state
- Spawn disappears from the map for this user.
- Daily quest progress bumps if applicable ("Collect 3 rubies today: 1/3").
- Leaderboard entry recalculated on the fly (cached ~60 s).
- One-tap **Share** ("I just collected a Legendary at Cafe Neo on Ruby+ 💎") deep-links to a public claim receipt page — feeds the "Nigerian competitive culture" viral loop the PDF flagged.

---

## 4. Secondary Customer Flows

### 4.1 Daily Quests
- Bottom of the Quest tab: a horizontally scrollable strip of 2-3 active daily quests. Examples:
  - "Visit somewhere new" — collect a ruby at a business you've never visited (uses existing visit history)
  - "Collect 3 rubies today"
  - "Visit two categories today" (e.g. Restaurants + Nightlife)
- Each quest has a progress bar and a completion reward (bonus points, or one guaranteed Rare spawn refresh).
- Quests reset at 04:00 Africa/Lagos daily.
- No penalty for missing them.

### 4.2 Weekly Leaderboard
- Accessed from a persistent "Leaderboard" chip on the Quest tab top-bar.
- Four tabs: **Lagos · Abuja · Port Harcourt · Diaspora**.
  - Diaspora tab: aggregates all users whose `lastKnownLocation` country ≠ NG in the current week.
- Rows show rank, avatar, first name, rubies collected this week, total points earned.
- The current user's own row sticks to the top even when off-screen.
- Cycle ends Sunday 23:59 Africa/Lagos. A cron cuts the snapshot, awards top-10 prizes, resets.
- Top-10 winners get a system notification + admin-issued prize (dinner-for-two voucher, spa day, weekend at a shortlet — fulfilled manually by ops in v1).

### 4.3 Prize Claim
- When a leaderboard winner opens the app after the cycle cut, an in-app modal shows the prize + a redemption code + a "Contact concierge to redeem" CTA that opens the existing support chat pre-filled with `PRIZE_REDEMPTION:{code}`.
- Admin marks each prize `REDEEMED` from the admin page.

### 4.4 Diaspora pre-plan
- Users whose account is flagged diaspora (either self-identified in profile OR detected via `lastKnownLocation` country ≠ NG) see the Quest map for their **selected Nigerian city** (visitor mode from P140) even before travelling.
- They can "Save for later" a ruby to their wishlist — same wishlist collection Phase 51 introduced. When they arrive in-country, saved rubies surface first.
- Diaspora leaderboard runs independently — competitive without pitting travellers against residents.

---

## 5. Merchant Flow

### 5.1 Buy a Ruby Quest spawn
- In business mobile app → **Ruby+ Ads** tab → new **Ruby Quest** section.
- Merchant sees three tier options: **Common** (₦N/day, 1 spawn/day), **Rare** (₦N/day, 1 spawn every 3 days), **Legendary** (₦N/day, admin-approval-gated, 1 spawn/week max).
- Payment via existing IAP or Paystack/wallet (same rails as `AdCampaign` creation).
- On purchase, an `AdCampaign` of new type `RUBY_QUEST_SPAWN` is created linked to the business. Cron auto-spawns rubies at the business's `geoPoint` per the tier cadence.
- Prime-tier subscribers (P120) get 1 free Common spawn per week baked into their subscription — no separate purchase needed.

### 5.2 View foot traffic
- Same section: an analytics card shows this week's **spawns issued**, **collections**, **collection rate**, **unique visitors**, **repeat visitors**.
- Every collection also increments the existing business `viewCount` / analytics events so the merchant's existing engagement dashboard reflects Quest-driven traffic naturally.

### 5.3 Kill switch
- Merchant can pause their active spawns from the same card (no refunds; unspent days convert to campaign credit). Same pause/resume pattern P124 introduced.

---

## 6. Admin Flow

### 6.1 Editorial spawns
- `/ruby-app/admin/quest` — the primary admin page.
- Tab **Spawn Manager**: list of active + upcoming spawns, filterable by city / rarity / business. New spawn button opens a modal:
  - Business (searchable select — LIVE businesses only, must have geoPoint)
  - Rarity (Common / Rare / Legendary)
  - Reward payload (dropdown of predefined `RubyRewardConfig` entries — admins curate the pool separately)
  - Start / expiry (defaults: Legendary 4h, Rare 12h, Common 48h)
  - Notes (internal)
- Editorial spawns are how the "Legendary spawned at a fine-dining restaurant in Lekki" moment happens — an ops person seeds it deliberately.

### 6.2 Reward pool curation
- Tab **Rewards**: CRUD for `RubyRewardConfig` entries. Fields: name, description, type (POINTS, SCRATCH_CARD, FREE_DELIVERY, PERCENT_OFF, WALLET_CREDIT, MANUAL_PRIZE), value, redemption instructions, active flag.
- Only entries marked `active: true` and matching the target rarity's allowed types are picked when a claim resolves.

### 6.3 Leaderboard cycle
- Tab **Leaderboards**: read-only view of current + past weekly snapshots per city. Manual "Cut cycle" button for ops emergencies.
- Prize fulfilment table: winner name, prize, redemption code, status. Ops flip status to `REDEEMED` after handling.

### 6.4 Anti-fraud
- Tab **Quarantine**: extends the existing P99 quarantine screen — same shape, filtered to Ruby-Quest-derived flags (spawn hoarding, geofence spoofing patterns, cluster device fingerprints).

---

## 7. Edge Cases

| Case | Behaviour |
|------|-----------|
| User taps ruby outside geofence | Client-side gate first ("Get closer to the business"); server-side reject with `NOT_AT_LOCATION` if bypassed |
| Two users tap the same Legendary simultaneously | Server uses a single atomic `findOneAndUpdate` — first commit wins, other gets `ALREADY_CLAIMED` and the ruby vanishes from their map |
| Ruby expired between map render and tap | Server rejects `SPAWN_EXPIRED`; client removes the pin + refetches map data |
| Location permission revoked | Quest tab shows an "Enable precise location to play" empty state with a "Grant" button that opens OS settings |
| Airplane mode / no network at collection | Client stores the claim intent locally; retries when network returns. Server accepts based on `checkInId + spawn state`, not clock time — so a late claim within 5 min of check-in still credits. |
| Business geoPoint is wrong | Merchant admin ticket; admin can nudge the spawn coords slightly off `business.geoPoint` in the seed form as a one-off override |
| User in visitor mode (P140) | Quest map uses the picked focal point exactly like home discovery does. Distance and radius filter follow the focal point, not raw GPS. |
| Suspected fraud | User's `isQuarantined` flag blocks all claims with a generic "Try again later" response — no leak of the reason |

---

## 8. Cross-tab / Cross-screen Integration Points

- **Home tab** — a compact "Rubies near you" carousel above the "What's Hot" section when there are ≥ 1 uncollected rubies within radius. Taps deep-link to the Quest tab with the ruby pre-selected on the map.
- **Deolu AI** — when a user asks Deolu about a business that currently has a Ruby Quest spawn, the recommendation card gets a small "💎 Legendary ruby active" badge. Not a tool result the LLM generates — a decoration the mobile applies from the tool's `activeRubySpawns` map.
- **Business detail** — an inline card between the header and About: "💎 A Rare ruby is here. Tap to collect." Only rendered when the user is inside the geofence.
- **Notifications** — new types `RUBY_APPROACH`, `RUBY_LEGENDARY_SPAWNED_IN_YOUR_CITY`, `LEADERBOARD_WINNER`. All silenceable per-type in existing notification prefs.
- **Wallet** — new ledger entry type `RUBY_QUEST_REWARD` slots into the existing ledger; no schema-level change needed.

---

## 9. Success Signals (What "Working" Looks Like)

- **Foot-traffic uplift** — % of spawned rubies collected within their expiry window. Target: > 25% for Common, > 40% for Rare, > 80% for Legendary.
- **New-business visits** — % of collections where the user has never previously visited (used by the "Visit somewhere new" quest).
- **Merchant demand** — number of paid `RUBY_QUEST_SPAWN` ad campaigns per week per city.
- **Weekly return rate** — % of Quest-tab users active in ≥ 3 sessions per week.
- **Diaspora engagement** — number of Diaspora leaderboard entrants per cycle; weekly retention among that cohort.

The KPI dashboard extension lives in `analytics/dashboard` and reuses existing Amplitude events — see the SRD §11.
