# Ruby Quest — Fresh-Session Claude Prompt

> Paste this at the start of a fresh Claude Code session to build Ruby Quest.
> Companion docs: [srd.md](srd.md), [user-flow.md](user-flow.md)

The prompt is intentionally self-contained. A fresh Claude session with no memory of the codebase should be able to execute it after reading only the two companion docs and the linked existing files.

---

## Copy-paste prompt

```
You are building Ruby Quest for the Ruby+ platform — a gamified, city-wide
treasure-hunt module where customers walk to real partner businesses to
collect virtual "rubies" and receive real wallet rewards.

## Read this first (in order)

1. `CLAUDE.md` at the repo root — platform overview, conventions, and the
   Feature Phase Log. Understanding the phase log matters because Ruby Quest
   composes work from at least 12 prior phases; you must reuse those services,
   not rebuild them.
2. `docs/ruby-quest/srd.md` — the specification you are implementing. Section 4
   (Reuse Map) is authoritative — do not reinvent geofencing, wallets, ads,
   notifications, ranking, or focal-point.
3. `docs/ruby-quest/user-flow.md` — how the feature is meant to feel for
   customer / merchant / admin. Read this whole document before writing any
   customer-facing code.

## Repo layout (four repos, work in whichever the current phase targets)

- Backend (NestJS 10 + MongoDB): `/mnt/c/Users/DELL/Desktop/ruby-plus-backend`
- Admin web (Next.js 15): `/mnt/c/Users/DELL/Desktop/ruby-plus-web`
- Customer mobile (Expo SDK 54): `/mnt/c/Users/DELL/Desktop/ruby-app-mobile`
- Business mobile (Expo SDK 54): `/mnt/c/Users/DELL/Desktop/ruby-business-app`

## Execution model

Ship in the order the SRD §12 defines: P152-A through P152-V. Do NOT try to
land everything in one PR — the rollout plan is calibrated to real risk. At
the end of each phase, run:

  - The filtered TypeScript check for every file you touched in that phase
    (grep the tsc output down to just the changed paths; do not paste the
    whole error list).
  - The manual verification items from SRD §13 that this phase enabled.
  - A short status update: what shipped, what's next, any deviations from
    the SRD (with justification).

## Hard rules

- **Reuse-first.** Before you write a new service, class, hook, or component,
  grep the target repo for something that already does what you need. The
  SRD §4 Reuse Map is the shortlist — start there.
- **Idempotency everywhere reward money moves.** Every claim, credit, or
  wallet write MUST take a stable idempotency key (the spawn id is the
  natural key for a claim). Retries return the original response, never
  double-credit. Follow the `RewardsService.creditPoints` pattern (Phase
  P94-3) — that is the reference implementation.
- **Atomic claim resolution.** Two users racing for a Legendary MUST be
  resolved by a single Mongo `findOneAndUpdate({_id, claimedBy: null}, …)`
  — first commit wins. No read-then-write.
- **Backend DTOs use `whitelist: true`.** If mobile sends a field the DTO
  doesn't declare, it gets stripped and you get a 400. Every DTO extension
  on mobile requires the matching DTO change on backend, and vice versa.
- **Focal-point respect.** Every discovery query on mobile pulls coords
  from `useFocalPoint()` (customer/src/stores/location.store.ts). Every
  distance filter on backend passes `filters.locationId` and lets
  `resolveDistanceOrigin()` pick the city center vs raw GPS (see
  ask-ruby/services/search.service.ts). Do not add a fifth pattern.
- **Cross-navigator back navigation.** When any Ruby-Quest screen pushes
  to `/(tabs)/business/[id]`, pass `?from=<current pathname>` so back
  returns to the quest, not to Home. The business-detail `handleBack`
  already honours this. See P151.
- **Config not constants.** Every tunable in SRD §8 lives in the
  `RubyQuestConfig` singleton doc, editable from the admin page. Do not
  hard-code radii, timeouts, or rate limits.
- **Audit every admin action.** `AuditService.log()` on create / edit /
  revoke / prize fulfilment. This is not optional.
- **No new fields on the User schema.** Every per-user Ruby Quest state
  lives in its own collection. Extend User only if the SRD explicitly
  asks for it (it doesn't).
- **Analytics events use dot-notation.** `ruby_quest.claim_succeeded` —
  matches the pattern established in P102.
- **Backward-compat helpers on mobile.** Mobile types accept both new
  and legacy field names via helper functions in `src/utils/format.ts`.
  If you add a Ruby Quest type mismatch, add a helper — do not patch
  each call site.

## Anti-patterns to reject on sight

- Reading `userCoordinates` directly on the mobile — always go through
  `useFocalPoint()`.
- Combining `$nearSphere` with `$exists` in one query — see P132-hotfix.
  Use `$geoNear` aggregation when both are needed.
- Hard-coding city coords or 50 km radii — pull from `Location.centerPoint`.
- Manual push token lookups — use `NotificationsService.notifyUser(userId, type, payload)`.
- Naming a route `/api/ruby-quest/...` — this platform uses `/user/*`,
  `/business/*`, `/admin/*`, `/public/*` prefixes.
- Creating a new "reward" mechanism — reuse `RewardsService`, `WalletsService`,
  `Promo`, `ScratchCard`, or `AdminPrizeQueue` depending on reward type.
- Storing reward values inline on the spawn — reference `RubyRewardConfig`
  by id, snapshot the resolved value on the claim.

## Phase-by-phase brief

**P152-A: Backend foundation (2-3 days)**
- Create `src/modules/ruby-quest/` with the four Mongoose schemas from SRD §6
  (`RubyQuestSpawn`, `RubyRewardConfig`, `RubyQuestClaim`, `RubyQuestConfig`
  singleton).
- Register the module, wire into `app.module.ts`. Import `LocationsModule`,
  `BusinessesModule`, `WalletsModule`, `RewardsModule`, `NotificationsModule`,
  `AdsModule`, `AdSubscriptionsModule` — each with forwardRef where needed.
- Add enum values to `common/interfaces/index.ts`: `NotificationType`,
  `LedgerEntryType`, `AdType`, `AuditAction`, `RewardEntryType`.
- Seed the reward pool via a boot script `scripts/seed-ruby-quest-rewards.ts`.
- Implement `SpawnEngineService`: AUTO_TIER cron (5 min), expiry sweep cron
  (1 min), both guarded by `CronLockService`.
- Implement `POST /admin/ruby-quest/spawns` (editorial) and the config
  singleton CRUD.
- Implement `GET /public/ruby-quest/near` — returns envelope matching P140
  shape. Uses `$geoNear` (not `$nearSphere`).
- Implement `POST /user/ruby-quest/claims` with the atomic resolver and
  full validation ladder from SRD §5.3 FR-CLM-2. Reward issuance is
  stubbed as a log line in this phase — real issuance comes in P152-B.
- Unit tests: atomic claim race, idempotency, expiry, geofence miss,
  rate-limit hit.

Verification for P152-A:
- Admin creates an editorial Legendary via POST → returns 200 with the doc.
- `GET /public/ruby-quest/near?lat=&lng=` returns the spawn when in radius.
- Two POSTs to `/claims` with the same spawnId race — one wins, one gets
  `ALREADY_CLAIMED`.
- Log line shows the reward that would have been issued.

**P152-B: Reward wiring (1-2 days)**
- Extend the claim resolver with the reward-issuance switch on
  `rewardConfig.type`. Each branch calls the existing primitive listed in
  SRD §5.3 FR-CLM-3.
- Return the resolved reward payload on the claim response.
- Bumps `LedgerEntryType.RUBY_QUEST_REWARD` on the ledger; add the label to
  `isCredit` list.
- Idempotency test: identical spawnId POSTed twice returns identical reward
  payload, ledger has one entry.

**P152-C: Customer mobile (3-4 days)**
- New tab `app/(tabs)/quest.tsx` — MapView + bottom-sheet + list toggle.
  Cluster pins; respect `useFocalPoint()`.
- `src/hooks/useRubyQuestMap.ts`, `useDailyQuests.ts`, `useLeaderboard.ts`,
  `usePrizeInbox.ts` — all React Query wrappers around the new endpoints.
- `src/components/ruby-quest/RubyPin.tsx`, `RubyBottomSheet.tsx`,
  `RubyClaimSheet.tsx`, `RewardRevealAnimation.tsx`, `DailyQuestStrip.tsx`,
  `LeaderboardRow.tsx`, `PrizeInboxCard.tsx`.
- Home integration: `<RubiesNearYouCarousel>` above What's Hot when
  `hasActiveSpawn` count > 0.
- Deolu integration: pass `hasActiveRubySpawn` through the merchant card
  types, render a 💎 badge decoration.
- Business detail integration: inline `<InsideGeofenceRubyCard>` between
  header and About.
- Cross-navigator back-nav: every push from the quest tab into other tabs
  passes `?from=<pathname>` (P151 pattern).
- Analytics: fire every event from SRD §10.6.

Verification for P152-C:
- Open Quest tab in Lagos → see the admin-seeded Legendary on the map.
- Walk (or GPS-mock) into the geofence → pin animates ready + local push.
- Tap → claim → reward reveal.
- Back from the reward → returns to the map (not Home).
- Home tab shows "Rubies near you" carousel.

**P152-D: Business mobile (1-2 days)**
- New `src/screens/RubyQuestSection.tsx` inside the existing Ads tab.
- New IAP SKUs registered in `IAP_PRODUCT_IDS` (iOS + Android).
- Subscribe / pause / resume mutations wire to the new backend endpoints.
- Analytics card.

**P152-E: Admin web (2 days)**
- New page `src/app/ruby-app/admin/(dashboard)/quest/page.tsx` with the
  five tabs. Reuse `DataTable`, `Modal`, `SearchableSelect`, `ImageUpload`
  from `src/components/ui`.
- Types + API client in `src/lib/api/client.ts` + `src/lib/types.ts`.
- Sidebar nav entry.

**P152-F: Weekly leaderboard + integrations (1-2 days)**
- `LeaderboardCutCronService` — Sunday 23:59 Africa/Lagos, guarded by
  `CronLockService`, idempotent on `cycleId`.
- Prize queue winner-award flow → push + in-app notification + prize inbox row.
- KPI dashboard card on admin analytics page.

**P152-G: Anti-fraud + polish (1-2 days)**
- Anti-spoof velocity check on `GeofenceCheckIn` write (flag only, no reject).
- `RUBY_QUEST_HOARDING` cluster alert signal (P99 extension).
- Approach-notification cron (checks user coords vs LIVE spawns hourly).

**P152-V: Verify + deploy (0.5 day)**
- Filtered TS check per repo:
  - `cd backend && npx tsc --noEmit 2>&1 | grep -E "ruby-quest"`
  - Same on each mobile / web.
- Manual smoke matrix from SRD §13.
- Backend deploy → OTA customer → OTA business → admin web deploy.

## Definition of done (per phase)

A phase is done when:
1. Every SRD FR-# it targets has code + test coverage.
2. Filtered TS check is clean on every touched file.
3. The verification items listed for that phase pass in a real (or GPS-mocked)
   test session.
4. A short status update lists what shipped, what's next, and any deviations
   with justification.
5. Nothing outside the phase's scope was touched (no drive-by refactors —
   flag those as follow-ups instead).

## When to ask, when to decide

Ask the user before:
- Adding a schema field NOT in SRD §6.
- Introducing a new external dependency.
- Adding a hard-coded value where the SRD says "config".
- Diverging from the Reuse Map (SRD §4).

Decide on your own:
- Naming of intermediate variables and internal helpers.
- Which existing UI primitive to compose (as long as you compose one).
- Whether to split a phase into 2 PRs for review sanity.

## Success signal

The user should be able to, at the end of P152-C:
1. From the admin web, seed a Legendary at a Lagos business.
2. On the customer app, see the ruby on the Quest tab map.
3. Walk to (or GPS-mock) the business.
4. Tap the ruby, see the shatter + reward animation.
5. Confirm the wallet credit appears in their existing wallet screen.
6. Back-button returns them to the Quest tab, not to Home.

Everything after P152-C is polish, merchant-facing, or cron-driven.
```

---

## Notes for the operator (you, not Claude)

- Run this prompt in a fresh session. Do NOT continue an existing conversation
  — the memory bloat from unrelated context will bleed into naming decisions.
- After the prompt is pasted, prompt-append: "Start with P152-A. Skim `CLAUDE.md`,
  `docs/ruby-quest/srd.md`, and the file paths in SRD §4 (Reuse Map). Then propose
  the module scaffold before writing code."
- Halt Claude between phases. Each phase gate is a real gate — review the diff,
  run the verification, then say "proceed to P152-B" (etc.).
- If Claude wants to run all phases in one shot, refuse. The rollout is calibrated
  to blast-radius; batch execution defeats the point.
