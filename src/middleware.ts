import { NextRequest, NextResponse } from 'next/server';

/**
 * Multi-domain routing for the Ruby+ marketing site.
 *
 * One Next.js deployment serves three logical apps on three hostnames:
 *
 *   rubyplus.net           → public marketing site (root, /about, /partner, etc.)
 *   xyzadmin.rubyplus.net  → admin dashboard (internally lives at /ruby-app/admin/*)
 *   business.rubyplus.net  → business onboarding (internally lives at /business/*)
 *
 * Behaviour:
 *
 *   1. Subdomain requests are rewritten internally to their prefixed
 *      paths so the existing app router files keep working unchanged.
 *      Example: `xyzadmin.rubyplus.net/login` rewrites to
 *      `/ruby-app/admin/login` server-side; the browser URL stays clean.
 *
 *   2. If someone hits the *internal* path on a subdomain (e.g.
 *      `xyzadmin.rubyplus.net/ruby-app/admin/login`), we 301 to the
 *      clean equivalent so deep-links keep working but the canonical
 *      URL surfaces.
 *
 *   3. If someone hits an admin/business path on the *main* domain,
 *      we 301 to the appropriate subdomain. Old bookmarks and SEO
 *      links continue to land in the right place; the canonical
 *      domain updates over time.
 *
 *   4. In local dev (host is localhost / 127.0.0.1 / *.local), we skip
 *      all rewriting and let Next route normally. No /etc/hosts setup
 *      required for daily dev.
 *
 * Implementation notes:
 *   - Hostnames are compared lowercased + port-stripped because some
 *     proxies forward `Host: xyzadmin.rubyplus.net:443`.
 *   - The `config.matcher` below skips _next, static assets, favicon —
 *     middleware running on those would waste CPU and possibly break
 *     the bundler.
 *   - We deliberately avoid `request.url` because behind a reverse
 *     proxy (Coolify) it can carry the internal proxy host; we use
 *     the `host` request header which the proxy forwards correctly.
 */

// Production subdomain → internal path prefix
const SUBDOMAIN_TO_PREFIX: Record<string, string> = {
  xyzadmin: '/ruby-app/admin',
  business: '/business',
};

/**
 * Per-subdomain URL aliases users instinctively type, even though the
 * clean URL has no prefix at all. Example: an admin on
 * `xyzadmin.rubyplus.net` types `/admin/home-sections` because their
 * muscle memory says "I'm on the admin site, paths start with /admin".
 *
 * Without this list, `/admin/home-sections` would fall through to the
 * rewrite below and become `/ruby-app/admin/admin/home-sections` —
 * which doesn't exist and 404s.
 *
 * With this list, we 301-redirect the alias prefix away so the user
 * lands on the canonical clean URL (`/home-sections`) which then
 * rewrites correctly.
 */
const SUBDOMAIN_ALIAS_PREFIXES: Record<string, string[]> = {
  xyzadmin: ['/admin'],
  business: [],
};

// Apex / www host that serves the public marketing site
const PRIMARY_HOSTS = ['rubyplus.net', 'www.rubyplus.net'];

/**
 * Strip port + lowercase a Host header. "xyzadmin.RubyPlus.com:443"
 * → "xyzadmin.rubyplus.net".
 */
function normalizeHost(host: string | null): string {
  if (!host) return '';
  return host.split(':')[0].toLowerCase();
}

/**
 * Pull the leftmost subdomain out of a host. Returns null when the
 * host has no subdomain (apex) OR the leftmost label is 'www' OR
 * the leftmost label doesn't match a known mapping.
 *
 * Examples:
 *   xyzadmin.rubyplus.net  → 'xyzadmin'
 *   business.rubyplus.net  → 'business'
 *   www.rubyplus.net       → null
 *   rubyplus.net           → null
 *   localhost              → null
 */
function getKnownSubdomain(host: string): keyof typeof SUBDOMAIN_TO_PREFIX | null {
  if (!host) return null;
  if (PRIMARY_HOSTS.includes(host)) return null;
  const labels = host.split('.');
  if (labels.length < 3) return null; // no subdomain at all (e.g. rubyplus.net)
  const leftmost = labels[0];
  if (leftmost === 'www') return null;
  if (leftmost in SUBDOMAIN_TO_PREFIX) {
    return leftmost as keyof typeof SUBDOMAIN_TO_PREFIX;
  }
  return null;
}

/**
 * True when the host is a local-development host. We skip all multi-
 * domain logic in dev so contributors don't need /etc/hosts entries.
 *
 * Local hostnames we recognise:
 *   - localhost (any port)
 *   - 127.0.0.1 (any port)
 *   - *.local (mDNS, used on Bonjour / corporate networks)
 *   - 192.168.x.x / 10.x.x.x — common LAN testing
 */
function isLocalHost(host: string): boolean {
  if (!host) return true;
  if (host === 'localhost') return true;
  if (host === '127.0.0.1') return true;
  if (host.endsWith('.local')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('10.')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host'));
  const { pathname, search } = request.nextUrl;

  // Local dev — short-circuit. No rewriting, no redirects. Everything
  // works on localhost:3000 the way it did before subdomains existed.
  if (isLocalHost(host)) {
    return NextResponse.next();
  }

  const subdomain = getKnownSubdomain(host);

  // ─── Main domain (rubyplus.net or www) ──────────────────────────────
  if (!subdomain) {
    // Permanent redirect away from the legacy admin/business paths so
    // old bookmarks land in the right place AND search engines update
    // their index to the new canonical hosts.
    if (pathname === '/ruby-app/admin' || pathname.startsWith('/ruby-app/admin/')) {
      const cleanPath =
        pathname.replace('/ruby-app/admin', '') || '/';
      const target = new URL(`https://xyzadmin.rubyplus.net${cleanPath}${search}`);
      return NextResponse.redirect(target, 301);
    }
    if (pathname === '/business' || pathname.startsWith('/business/')) {
      const cleanPath = pathname.replace('/business', '') || '/';
      const target = new URL(`https://business.rubyplus.net${cleanPath}${search}`);
      return NextResponse.redirect(target, 301);
    }
    return NextResponse.next();
  }

  // ─── A subdomain we recognise (xyzadmin or business) ────────────────
  const internalPrefix = SUBDOMAIN_TO_PREFIX[subdomain];

  // Canonicalise: if someone hits the internal prefixed path directly
  // (e.g. xyzadmin.rubyplus.net/ruby-app/admin/login), permanently
  // redirect to the clean path so the canonical URL is enforced.
  if (pathname === internalPrefix || pathname.startsWith(`${internalPrefix}/`)) {
    const cleanPath = pathname.replace(internalPrefix, '') || '/';
    const target = new URL(
      `https://${subdomain}.rubyplus.net${cleanPath}${search}`,
    );
    return NextResponse.redirect(target, 301);
  }

  // Forgiveness redirect: if someone types an alias prefix (e.g.
  // `/admin/home-sections` on the xyzadmin subdomain), 301 to the
  // clean URL so they don't hit a 404 just for adding an instinctive
  // `/admin/` segment.
  for (const alias of SUBDOMAIN_ALIAS_PREFIXES[subdomain] ?? []) {
    if (pathname === alias || pathname.startsWith(`${alias}/`)) {
      const cleanPath = pathname.replace(alias, '') || '/';
      const target = new URL(
        `https://${subdomain}.rubyplus.net${cleanPath}${search}`,
      );
      return NextResponse.redirect(target, 301);
    }
  }

  // The hot path: clean URL on the subdomain. Rewrite internally to
  // the prefixed path so the existing App Router files handle it.
  // Browser URL stays clean; Next.js serves the prefixed page.
  const url = request.nextUrl.clone();
  url.pathname = `${internalPrefix}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

/**
 * Skip middleware for static + bundler routes — running it there would
 * burn CPU on every asset request and complicate the rewriting logic.
 * Everything else (pages, dynamic routes) goes through middleware.
 */
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - _next/static  (build output)
     *   - _next/image   (image optimizer)
     *   - favicon.ico
     *   - sitemap.xml / robots.txt (route-level)
     *   - any path with a file extension (images, css, js, json, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
