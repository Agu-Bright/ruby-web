# Ruby+ — App Store Review Notes (Guideline 1.2 resubmit)

Paste the body below into **App Store Connect → App Review Information → Notes** for the customer iOS app resubmit.

---

## Notes to App Review

Thank you for the previous feedback (Guideline 1.2 — Safety — Objectionable Content).
We have implemented every requirement in the latest build:

### 1. EULA / Community Rules agreement at sign-up
The Sign Up button on the registration screen is **disabled** until the user
explicitly ticks a checkbox stating, verbatim:

> "I agree that Ruby+ has **zero tolerance** for objectionable content or
> abusive behaviour, that I will not post hateful, harassing, sexual or
> violent content, and that my account may be suspended for violations."

The checkbox is also present above the existing tappable Terms / Privacy
Policy links (which open https://rubyplus.com/terms and
https://rubyplus.com/privacy in the system browser).

### 2. Automatic objectionable-content filter
Every piece of user-typed content — review text, reel captions, chat
messages — is run server-side through a deterministic profanity and
hate-speech wordlist on submit. The filter:

- Normalises text (lowercase, diacritic strip, leetspeak digit substitution
  4→a, 3→e, 1→i, 0→o, 5→s, 7→t, $→s, @→a)
- Collapses repeated letters (`fuuuuck` → `fuck`)
- Matches against English profanity, slurs (racial / homophobic /
  transphobic), explicit sexual terms, violence / suicide phrases, and
  common Nigerian Pidgin / Yoruba / Hausa abusive terms

Submissions that fail the check are rejected with HTTP 400 and the user
sees a clear in-app error: *"Your review/reel/message contains language
that is not allowed on Ruby+. Please edit and try again."*

### 3. Mechanism for users to flag / report objectionable content
A "Report" entry is reachable from every user-generated-content surface
(review card, reel control stack, chat bubble). It opens a bottom sheet
that asks the reporter to pick one of seven reasons (Spam, Harassment,
Hate speech, Sexual content, Violence, Misinformation, Other) and submit.
On success a confirmation appears: *"Thanks for reporting. Our team will
review within 24 hours."*

Reports are idempotent — re-reporting the same content while a previous
report is still pending returns the existing report. Each user is limited
to 20 reports per 24-hour window to deter trolls.

### 4. Mechanism for users to block abusive users
The "Block user" entry is reachable from the same context menus and from
the chat header. Tapping it:

1. **Instantly** removes all of the blocked user's reviews and reels from
   the blocker's feed (client-side filter against a local Zustand store
   that is updated optimistically — no network round-trip required).
2. Hides every conversation with the blocked user from the chat list.
3. Server-side, future messages from the blocked user to the blocker are
   refused with HTTP 403 `BLOCKED_RELATIONSHIP`.
4. The block is **symmetric (Instagram-style)** — the blocked user also
   cannot find the blocker's content.

The action is reversible from the user's blocked-users list in Settings.

### 5. Developer 24-hour SLA for actioning reports
We operate an internal admin moderation queue at
`https://admin.rubyplus.com/ruby-app/admin/moderation`. Reports are
sorted **oldest-first** so the row at the top is always the one closest
to breaching the 24-hour deadline. Each pending report can be resolved
with one of three actions:

- **Remove content** — hides the offending review / reel / chat message
  from every customer's feed.
- **Suspend user** — does the above AND deactivates the author's account
  (sets `isActive: false`, blocking login).
- **Dismiss** — records that no action was needed (for mistaken or
  frivolous reports), with an optional admin note for audit.

A stats card at the top of the queue shows pending count, resolved-today
count, and the age of the oldest pending report (so we can monitor SLA
breaches in real time).

---

### Test account for App Review

You can sign in as a real customer:

- **Email**: `appreview+customer@rubyplus.com`
- **Password**: `<INSERT BEFORE SUBMITTING>`

To verify each of the five points above:

1. **EULA**: Sign out → tap Sign Up → fill the form → notice the Sign Up
   button is disabled and shows the checkbox. Try to submit without
   ticking; the button stays disabled.
2. **Automatic filter**: Open a business → tap *Write a review* → type
   *"this place is fucking terrible"* → submit → an error appears: *"Your
   review contains language that is not allowed on Ruby+."*
3. **Report**: From any review or reel, tap the "..." icon → tap
   "Report this {review/reel}" → pick a reason → Submit. A confirmation
   alert appears.
4. **Block**: From a chat thread, tap the header menu → "Block user".
   The conversation disappears from the inbox. Try to send a message
   from the blocked user's account; an error appears.
5. **Admin queue (back-office, not in the iOS app)**: We can demo on
   request — the admin web is gated behind staff SSO.

---

### Implementation references (for your records)

- Backend module: `ruby-plus-backend/src/modules/content-moderation/`
- Mobile bottom sheet: `ruby-app-mobile/src/components/moderation/ReportSheet.tsx`
- Mobile blocked-user store: `ruby-app-mobile/src/stores/moderation.store.ts`
- Mobile register EULA: `ruby-app-mobile/app/(auth)/register.tsx` (search for `agreedToCommunityRules`)
- Admin queue: `ruby-plus-web/src/app/ruby-app/admin/(dashboard)/moderation/page.tsx`

If anything is unclear or you need a fresh demo build, please reply and we
will respond within the same business day.

Thank you,
The Ruby+ team
