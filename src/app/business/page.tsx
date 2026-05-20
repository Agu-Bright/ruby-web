import { redirect } from 'next/navigation';

/**
 * Root landing for `business.rubyplus.net` (which the middleware
 * rewrites to `/business`). Without this file, hitting the bare
 * subdomain 404'd because Next had nowhere to render for the
 * `/business` path — the existing pages all live one level deeper
 * (`register/`, `verify-otp/`, `success/`).
 *
 * Merchants who land here are almost always starting a new
 * registration, so we send them straight to the form. Once they're
 * mid-flow, deep links like `business.rubyplus.net/verify-otp`
 * continue to work via the existing middleware rewrite.
 *
 * The redirect is server-side (no client JS round-trip) and the
 * browser URL becomes `business.rubyplus.net/register` — which the
 * middleware then rewrites internally to `/business/register` and
 * renders the form. One redirect, then the user is in the flow.
 */
export default function BusinessRootPage() {
  redirect('/register');
}
