import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) — enables iOS Universal Links so that
 * tapping an https://rubyplus.net link (e.g. the "Open Ruby+" button in our
 * emails) opens the Ruby+ customer app when it's installed, and falls back
 * to the website when it isn't.
 *
 * Served at the exact, Apple-required path:
 *   https://rubyplus.net/.well-known/apple-app-site-association
 * as application/json with NO redirect (NextResponse.json handles the
 * content-type; keep this route free of auth/redirects).
 *
 * appID = <AppleTeamID>.<bundleId>. Pulled from the Ruby+ customer app's
 * Expo iOS credentials: Team "Rubylabs Corp." (V36T6YFQKG), bundle
 * com.rubyplus.customer.
 *
 * NOTE: this only takes effect once the mobile app's `associatedDomains`
 * declares `applinks:rubyplus.net` (see app.json) AND a new native build is
 * shipped — Universal Links are baked in at build time, not over OTA.
 */
const IOS_APP_ID = "V36T6YFQKG.com.rubyplus.customer";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    applinks: {
      // `apps` must be an empty array per Apple's spec.
      apps: [],
      details: [
        {
          appID: IOS_APP_ID,
          // Claim the whole domain so any rubyplus.net link can open the app
          // (home + future deep links like /business/:id). Narrow this later
          // if we want only specific paths to hand off to the app.
          paths: ["*"],
        },
      ],
    },
    // Lets iOS offer to autofill Ruby+ credentials saved against this domain.
    webcredentials: {
      apps: [IOS_APP_ID],
    },
  });
}
