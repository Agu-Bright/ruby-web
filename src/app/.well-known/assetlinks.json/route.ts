import { NextResponse } from "next/server";

/**
 * Android Digital Asset Links — enables Android App Links so tapping an
 * https://rubyplus.net link opens the Ruby+ customer app when installed.
 *
 * Served at the exact, Google-required path:
 *   https://rubyplus.net/.well-known/assetlinks.json
 *
 * The SHA-256 fingerprint(s) MUST be the cert the installed app is signed
 * with. If the app is distributed via Google Play with Play App Signing,
 * that is the *Play App Signing key* (Play Console → the Ruby+ app → Test
 * and release → App integrity → App signing — it even shows a ready-made
 * assetlinks.json there). Include BOTH the Play app-signing key AND the
 * upload/EAS key so links also verify for directly-installed builds.
 *
 * Supply them (comma-separated, uppercase, colon-delimited) via the
 * `ANDROID_APP_LINK_SHA256` env var on this web deployment — then no code
 * change/redeploy is needed to finish Android. Until it's set this returns
 * a valid-but-unverified statement.
 *
 * Example:
 *   ANDROID_APP_LINK_SHA256="AA:BB:...:ZZ,11:22:...:99"
 *
 * NOTE: also requires the app's Android intent filter to declare host
 * rubyplus.net with autoVerify (see app.json) + a new native build.
 */
const ANDROID_PACKAGE = "com.rubyplus.customer";

export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_APP_LINK_SHA256 || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
