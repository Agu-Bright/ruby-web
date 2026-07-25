# Codex Handoff — Business App → Web Port

> **You are picking up work on a multi-month project to port the entire Ruby+ business mobile app into the web version.** This document is your entry point. Read it in full before touching any code.

## Mission

Port `ruby-business-app` (Expo SDK 54, 112 route files, 17 feature domains) into `ruby-plus-web` (Next.js 15 + Tailwind). The web build sits at `business.rubyplus.net`. Existing merchants sign up on mobile, then log in on the web dashboard to manage everything from a laptop.

**Non-goal:** new-account registration on web. Marketing landing + existing signup pages under `src/app/business/` stay, but the new authenticated dashboard never links to them from inside the app.

## Read these three files, in order

1. **[PLAN.md](./PLAN.md)** — full milestone plan (M0-M15), architecture decisions, native→web substitution matrix, anti-patterns. Approved by the user. Do NOT deviate from it without user confirmation.
2. **[PROGRESS.md](./PROGRESS.md)** — running ledger of what's shipped, what's in progress, what's blocked. Update this after EVERY milestone (or sub-task) you complete.
3. **[../../CLAUDE.md](../../CLAUDE.md)** — repo-wide platform docs. Especially the "Cross-cutting patterns" and "Shipped Feature Phases" sections.

## How to work

For each milestone in `PLAN.md`:

1. **Confirm scope with the user** if anything is ambiguous — the plan is deliberately compact; don't invent scope, don't skip scope.
2. **Read the mobile source** for whatever domain you're porting. The reference is at `C:/Users/DELL/Desktop/ruby-business-app/`. Never guess mobile behaviour — trace it end-to-end (screen → hook → api → backend endpoint) so the web port is 1:1.
3. **Follow the substitution matrix in PLAN.md § "Native → web substitution matrix"** for every native API you encounter. Don't invent a new substitution; if the matrix is missing one, add it and mention it to the user.
4. **Reuse existing web primitives** — `DataTable`, `Modal`, `Drawer`, `StatusBadge`, `PageHeader`, `StatCard`, `SearchableSelect`, `ImageUpload`, `MapLocationPicker`, `NotificationDropdown`, `ToastProvider`. Don't reinvent them. See `src/components/ui/index.ts` for the export list.
5. **Test locally before marking done** — `npm run dev` under `ruby-plus-web/`, visit `http://localhost:3000/business/…`, walk the flow you built. TS check with `npx tsc --noEmit -p tsconfig.json` (filter to touched files).
6. **Update `PROGRESS.md`** — mark the milestone/sub-task as done, note any surprises or decisions, list files created/modified.
7. **Stop and hand back to the user** at each milestone boundary. Don't chain milestones without an explicit "keep going." Milestones are shippable slices — the user reviews between them.

## Constraints (do NOT violate)

- **Never overload the admin `AuthContext`.** Create a parallel `BusinessAuthContext` with its own localStorage keys (`ruby_business_access_token`, `ruby_business_refresh_token`, `ruby_business_user`, `ruby_business_selected_business`). Leaking admin RBAC into merchant code is a bug category.
- **Never implement IAP-style checkouts on web.** All mobile IAP purchases (ad campaigns, Ruby Quest tiers, ad subscriptions on iOS) become **Paystack Inline JS + wallet** on web. The backend supports both payment sources.
- **Never use `react-native-webview`-style modal iframes for Paystack.** Paystack Inline JS is a first-class DOM API — no iframe/WebView.
- **Never re-invent the admin dashboard shell.** Copy `src/app/ruby-app/admin/(dashboard)/layout.tsx`, swap sidebar nav + guard + branch switcher.
- **Never link to `/business/register` or `/business/verify-otp` from inside the dashboard.** Those pages exist for marketing continuity only.
- **Never commit or push without an explicit user request.** Same rule as the existing repo convention.
- **Never skip a mobile hook or realtime event when porting a domain.** If mobile calls 12 endpoints for orders, the web business layer calls the same 12 — even if today's screen only uses 8. Missing hooks strand later milestones.

## Repo layout you'll be working in

```
ruby-plus-web/
  src/
    app/
      business/                    # where all merchant surfaces live
        layout.tsx                 # thin ToastProvider wrapper (unchanged)
        page.tsx                   # marketing landing (unchanged)
        register/, verify-otp/, success/, [slug]/   # existing, do not touch
        # NEW pages you will create:
        login/page.tsx
        forgot-password/page.tsx
        reset-password/page.tsx
        business-pending/page.tsx
        dashboard/
          layout.tsx               # BusinessDashboardShell (sidebar + topbar + guard)
          page.tsx                 # dashboard home
          orders/, bookings/, products/, wallet/, etc.
      ruby-app/admin/(dashboard)/layout.tsx   # analog to copy — READ this
    lib/
      auth/auth-context.tsx        # admin auth — fork this pattern
      api/client.ts                # API client — extend with businessAuth namespaces
      business-auth/               # NEW — you will create this
      business-api/                # NEW — namespaced hooks per domain
      business-sockets/            # NEW — one provider for 7 socket namespaces
      business-payments/           # NEW — Paystack Inline wrapper
      business-upload/             # NEW — presigned R2 uploader with canvas compression
    components/
      ui/                          # shared primitives — REUSE these
      business/                    # NEW — merchant-only components
```

Mobile source (read-only reference — do not modify):
```
ruby-business-app/
  app/(auth)/*, (tabs)/*, (main)/*
  src/hooks/*, api/*, services/*, components/*, stores/*, types/*, utils/*
```

## Current status (updated: 2026-07-24)

- **Plan approved.** See PLAN.md.
- **M0 exploration done** — confirmed no existing merchant-dashboard on web, confirmed admin dashboard layout at `src/app/ruby-app/admin/(dashboard)/layout.tsx` is the analog to copy, confirmed API client can be extended (or a business-client.ts fork can be created), confirmed existing `api.auth.registerBusiness / verifyBusinessOtp` endpoints already work (backend supports business JWTs).
- **M0 code not yet written.** Nothing under `src/app/business/dashboard/`, `src/app/business/login/`, or `src/lib/business-auth/` exists yet.
- **Next task:** M0 — Foundation. Start with `src/lib/business-auth/business-auth-context.tsx` (fork of admin auth). Then login page. Then dashboard shell.

**See [PROGRESS.md](./PROGRESS.md) for the milestone-by-milestone status table.**

## Verification requirements (per-milestone gate)

Before marking any milestone done in PROGRESS.md:

1. `npx tsc --noEmit -p tsconfig.json` from `ruby-plus-web/` — zero errors on touched files.
2. `npm run dev` — the milestone's flow works end-to-end in a browser (Chrome + Safari; mobile Safari is a bonus).
3. Realtime updates verified (M2+) — open the mobile app + the web dashboard side-by-side, trigger an event, confirm both surfaces update within socket latency.
4. Each milestone's "Verification" section in PLAN.md is fully green.
5. `PROGRESS.md` updated with: milestone number, files touched, decisions/surprises, screenshot links (if UI), next-milestone notes.

## Communicating back

- **Progress:** update `PROGRESS.md` continuously (per-file is overkill; per-milestone or per-sub-task is right).
- **Blockers:** create `docs/business-web-port/BLOCKERS.md` (if it doesn't exist yet), append entries with date + milestone + what's blocked + what you tried. Then stop and wait for user input.
- **Decisions:** if you deviate from PLAN.md for any reason, note it in `PROGRESS.md` under a "Decisions" heading with the milestone number. Never silently deviate.
- **Files you touched:** listed under the milestone in PROGRESS.md so the next agent has a clear diff surface.

## Emergency escape hatches

- If PLAN.md conflicts with what you observe in the mobile source, PLAN.md is likely stale — flag it in `PROGRESS.md`, propose an update, stop, wait for user.
- If a native API has no substitution in the matrix, add a proposed one to PLAN.md's substitution matrix, note in PROGRESS.md, and stop for user review.
- If a backend endpoint you need doesn't exist, do NOT invent one — check `ruby-plus-backend/src/modules/*/*.controller.ts` first. If genuinely missing, add a note to PROGRESS.md + stop.

## Where the memory lives (persistent context across sessions)

- Repo-level: `CLAUDE.md` at repo root
- Persistent user memory: `C:/Users/DELL/.claude/projects/C--Users-DELL-Desktop-ruby-plus-web/memory/` — read the index `MEMORY.md` there for cross-cutting patterns (field mismatches, business app structure, multi-branch, etc.)
- The approved plan lives at `C:/Users/DELL/.claude/plans/gentle-humming-fairy.md` — but a copy is in this folder as `PLAN.md` so it's version-controlled with the code.

**When in doubt, ask. When not in doubt, still ask if the answer commits you to a non-trivial architectural choice.**
