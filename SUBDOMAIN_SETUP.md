# Subdomain Setup — Ruby+ Web

The Ruby+ marketing site is a single Next.js deployment that serves
three logical apps on three hostnames:

| Hostname | What it serves | Internal path it maps to |
|---|---|---|
| `rubyplus.net` (+ `www.rubyplus.net`) | Public marketing site | `/`, `/about`, `/partner`, `/contact`, etc. |
| `xyzadmin.rubyplus.net` | Admin dashboard | `/ruby-app/admin/*` (rewritten transparently) |
| `business.rubyplus.net` | Business onboarding | `/business/*` (rewritten transparently) |

This document covers what needs to happen at the **DNS** layer, the
**Coolify** layer, and the **environment-variable** layer to make all
three hostnames work. Code is already done — see `src/middleware.ts`.

---

## 1. DNS records

Add the two new subdomains to your DNS provider (Cloudflare, Namecheap,
GoDaddy, etc.). Both should be **A records** pointing to the same
public IP as `rubyplus.net`, OR **CNAME records** pointing to
`rubyplus.net`. Use whichever your existing apex record uses.

### A-record example (if your apex is an A record)

```
xyzadmin.rubyplus.net    A    <YOUR_COOLIFY_SERVER_IP>
business.rubyplus.net    A    <YOUR_COOLIFY_SERVER_IP>
```

### CNAME example (if your apex uses CNAME flattening, e.g. Cloudflare)

```
xyzadmin.rubyplus.net    CNAME    rubyplus.net
business.rubyplus.net    CNAME    rubyplus.net
```

Propagation typically takes a few minutes; up to ~24h worst case.
Check with `dig xyzadmin.rubyplus.net` or `nslookup`.

---

## 2. Coolify configuration

In your Coolify dashboard, open the Next.js web app deployment (the one
already serving `rubyplus.net`). You'll add the two new hostnames as
additional FQDNs — Coolify auto-issues Let's Encrypt SSL certs for each.

### Steps

1. **Open the app** → Settings → General
2. Find the **Domains / FQDN** field. Today it likely reads:
   ```
   https://rubyplus.net,https://www.rubyplus.net
   ```
3. Append the two new domains, comma-separated:
   ```
   https://rubyplus.net,https://www.rubyplus.net,https://xyzadmin.rubyplus.net,https://business.rubyplus.net
   ```
4. **Save** and then **Redeploy** the app.
5. Coolify will provision SSL certs for the new domains in 1–2 minutes.
   Check the deployment logs — you should see `Successfully obtained
   certificate` lines for each new hostname.

### Verify

After redeploy:

```bash
curl -I https://xyzadmin.rubyplus.net
# Expect: HTTP/2 200 (or 307/308 if you hit a Next.js route that
#         redirects to /login). Definitely NOT 502/504.

curl -I https://business.rubyplus.net
# Expect: HTTP/2 200 or a 307/308 redirect to /register
```

If you see certificate errors (`SSL_ERROR_NO_CYPHER_OVERLAP` or
`unable to get local issuer certificate`), wait 60 seconds and retry —
Coolify might still be issuing the cert.

---

## 3. Environment variables

### Web (`ruby-plus-web`)

The middleware works out of the box with no env vars set — it
hardcodes the production subdomains. However, for cross-origin link
generation you may optionally set:

```bash
# Optional — overrides the production defaults
NEXT_PUBLIC_ADMIN_HOST=https://xyzadmin.rubyplus.net
NEXT_PUBLIC_BUSINESS_HOST=https://business.rubyplus.net
```

These are used by `src/lib/subdomain-links.ts` to generate links from
the marketing site to the admin / business subdomains. In dev they
default to empty (so links resolve to relative paths), and in prod
they default to the production subdomains.

### Backend (`ruby-plus-backend`)

Email templates that link back to the admin dashboard now pull from
`ADMIN_URL` instead of `FRONTEND_URL/ruby-app/admin/*`. Add this to
your production env:

```bash
ADMIN_URL=https://xyzadmin.rubyplus.net
```

The fallback default is already `https://xyzadmin.rubyplus.net` so
you can skip this if you want — but setting it explicitly is safer
(e.g. it lets you point a staging backend at a staging admin host
without code changes).

Leave the existing `FRONTEND_URL=https://rubyplus.net` alone — it's
still used for the email-template logo image and a couple of other
non-admin paths.

CORS is already permissive (`origin: true` in `main.ts`) so the new
subdomains will work without any backend-side allowlist changes.

---

## 4. Local development

The middleware short-circuits on `localhost` / `127.0.0.1` / `*.local`
/ `192.168.*.*` / `10.*.*.*` — so `npm run dev` keeps working exactly
the way it did before subdomains existed. No `/etc/hosts` setup
needed for daily development. You access:

- Marketing site: `http://localhost:3000/`
- Admin: `http://localhost:3000/ruby-app/admin/login`
- Business: `http://localhost:3000/business/register`

If you specifically want to test the subdomain routing locally — e.g.
to verify the middleware rewrites work end-to-end — add these
entries to your `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`
on Windows, as Administrator):

```
127.0.0.1   rubyplus.local
127.0.0.1   xyzadmin.rubyplus.local
127.0.0.1   business.rubyplus.local
```

Then visit:

- `http://rubyplus.local:3000/`
- `http://xyzadmin.rubyplus.local:3000/login`
- `http://business.rubyplus.local:3000/register`

Note: middleware host detection treats `*.local` as local-dev too, so
these `.local` aliases will SKIP the subdomain routing. To exercise
the production code path locally, you'll need actual subdomains
under a non-`.local` apex — easiest is to use ngrok or similar.

---

## 5. How the URLs map (reference)

### Public marketing — no change
- `rubyplus.net/` → home
- `rubyplus.net/about` → about page
- `rubyplus.net/partner` → business landing
- `rubyplus.net/contact` → contact

### Admin (NEW host, clean URLs)
- `xyzadmin.rubyplus.net/` → admin home (currently `/ruby-app/admin`)
- `xyzadmin.rubyplus.net/login` → admin login
- `xyzadmin.rubyplus.net/users` → admin users
- `xyzadmin.rubyplus.net/businesses` → business management
- `xyzadmin.rubyplus.net/finance` → finance dashboard
- etc.

### Business onboarding (NEW host, clean URLs)
- `business.rubyplus.net/register` → register form
- `business.rubyplus.net/verify-otp` → OTP verification
- `business.rubyplus.net/success` → success screen

### Legacy redirects (permanent 301)
- `rubyplus.net/ruby-app/admin/*` → `xyzadmin.rubyplus.net/*`
- `rubyplus.net/business/*` → `business.rubyplus.net/*`
- `xyzadmin.rubyplus.net/ruby-app/admin/*` → `xyzadmin.rubyplus.net/*` (path-prefix cleanup)
- `business.rubyplus.net/business/*` → `business.rubyplus.net/*` (path-prefix cleanup)

---

## 6. Rollback

If subdomains cause issues in production:

1. **Quick rollback**: in Coolify, remove the two new FQDNs and redeploy.
   Direct subdomain access stops working; the middleware is still
   present but only fires when the host header matches a known
   subdomain, which won't happen after FQDN removal.
2. **Full rollback**: revert the commit that added `src/middleware.ts`,
   the `subdomain-links.ts` helper, and the Navbar / PartnerHero /
   FinalCTA changes. Redeploy. Back to single-domain.

DNS records can stay in place during rollback — they only matter when
the FQDN is configured on the Coolify side. Email templates'
`ADMIN_URL` env var pointing at the subdomain is also harmless if
the subdomain isn't being served: links would just 404 / fail to
load, but no production traffic stops.

---

## 7. Known follow-ups (V1.1)

- **Admin sidebar links** still use `/ruby-app/admin/*` paths. On the
  admin subdomain this triggers a 301 redirect on every sidebar
  click — works fine, but adds a brief flash. Future cleanup:
  rewrite sidebar `<Link>` hrefs to clean paths, gated by env so
  local dev still works.
- **Admin auth context** lives in `localStorage` — which is per-origin.
  This is actually a security improvement (admin tokens can't leak
  to the public marketing domain), but means existing admins logged
  in on `rubyplus.net/ruby-app/admin` will need to log in again on
  `xyzadmin.rubyplus.net`. Communicate this in the changelog.
- **OpenGraph / SEO** — search engines will gradually re-index the
  admin and business paths as the 301 redirects fire. No manual
  sitemap update needed; the redirects do the work over a few weeks.
