/**
 * Cross-subdomain link helpers.
 *
 * In production the marketing site, admin dashboard, and business
 * onboarding live on three different subdomains. Linking between them
 * requires absolute URLs (not Next.js `<Link>` paths) because the
 * client-side router can't navigate across origins.
 *
 * In local dev all three live on `localhost:3000` and the middleware
 * skips its host-based routing — so a relative path like
 * `/ruby-app/admin/login` works fine. These helpers return the right
 * thing for each environment automatically, so callers don't have to
 * special-case dev vs prod.
 *
 * Override via env vars when needed:
 *   NEXT_PUBLIC_ADMIN_HOST     — e.g. https://xyzadmin.rubyplus.net
 *   NEXT_PUBLIC_BUSINESS_HOST  — e.g. https://business.rubyplus.net
 */

const ADMIN_HOST =
  process.env.NEXT_PUBLIC_ADMIN_HOST ||
  (process.env.NODE_ENV === 'production'
    ? 'https://xyzadmin.rubyplus.net'
    : '');

const BUSINESS_HOST =
  process.env.NEXT_PUBLIC_BUSINESS_HOST ||
  (process.env.NODE_ENV === 'production'
    ? 'https://business.rubyplus.net'
    : '');

const MARKETING_HOST =
  process.env.NEXT_PUBLIC_MARKETING_HOST ||
  (process.env.NODE_ENV === 'production' ? 'https://rubyplus.net' : '');

/**
 * Returns the URL for an admin route. In production this is a full
 * cross-origin URL; in dev it falls back to the relative path the
 * existing App Router serves at.
 *
 * Always pass a leading-slash path:  adminLink('/login')  →  `…/login`
 */
export function adminLink(path: string = '/login'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (ADMIN_HOST) return `${ADMIN_HOST}${cleanPath}`;
  // Local dev fallback — internal path the App Router renders at
  return `/ruby-app/admin${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Returns the URL for a business onboarding route. Same prod/dev logic
 * as adminLink.
 */
export function businessLink(path: string = '/register'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (BUSINESS_HOST) return `${BUSINESS_HOST}${cleanPath}`;
  return `/business${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Returns the URL for a MARKETING-site route (the apex `rubyplus.net`).
 *
 * Used when a shared component (Navbar / Footer) is rendered on a
 * NON-marketing subdomain — e.g. the business landing page that lives
 * at `business.rubyplus.net`. There the marketing nav items
 * (Home / About / Partner / Contact) must point at the apex with an
 * absolute URL, otherwise a relative `/about` would resolve to
 * `business.rubyplus.net/about` → the middleware rewrites it to
 * `/business/about` → 404.
 *
 * In dev this returns the relative path (everything is same-origin on
 * localhost so the App Router serves the marketing pages directly).
 */
export function marketingLink(path: string = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (MARKETING_HOST) return `${MARKETING_HOST}${cleanPath}`;
  return cleanPath;
}

/**
 * True when the link should use an `<a href>` rather than Next.js
 * `<Link>` because it crosses origins. Components can branch on this
 * to render the right element — `<Link>` for in-app navigation,
 * `<a>` for cross-domain.
 *
 * In production both helpers return cross-origin URLs so this is true.
 * In dev both return same-origin paths so `<Link>` works fine.
 */
export const isCrossOrigin = Boolean(ADMIN_HOST || BUSINESS_HOST);
