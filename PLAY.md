# Night Shift: Laundromat on Google Play

The Play edition is `android/play`: a Trusted Web Activity that opens the game's site, https://taugustincst.github.io/project-shell-07/, full screen. It is the same build as Ironhold's and Chronicles of Elderon's Play editions, which Play accepted: no generated code, no Application class, and every build is checked before it can be uploaded.

- **Package**: `com.taugustincst.nightshift`
- **Version**: 1.0.0 (versionCode 10000). The release workflow takes the version and works out the code (1.0.1 becomes 10001).
- **Checks on every change** (`.github/workflows/android.yml`): builds the release APK and bundle, `tools/check-apk.js` confirms every class the manifest names is in the app, and `tools/launch-test.sh` opens it on an Android 14 emulator and fails if it crashes.
- **Signing**: the release workflow signs with the upload key from the repository's secrets; without them it builds and checks but publishes nothing. Locally, `android/keystore.properties` (never committed) does the same.
- **If the repository is renamed**, the site's address changes: build with `-PplayPath=/new-name/`, or change the default in `android/play/build.gradle`.
- **Purchases** (`js/billing.js`): Google Play Billing through the Digital Goods API. After a purchase the game sends the purchase token to the acknowledgement service and keeps retrying on each launch until the service confirms; `tests/billing.test.js` covers it. `?dev=1` (free unlock for testing) now only works on a local copy, not on the public site the app opens.

## What is left, in order

These need your accounts, so they are yours.

1. **Create the app in the Play Console** with the package name `com.taugustincst.nightshift` (it is in `android/play/build.gradle`; Play never lets it change once the first bundle is uploaded). Sales model: Free, one in-app product `full_unlock` at $4.99.
2. **Make an upload key, once, and keep it somewhere safe** (a password manager). On your own computer:

   ```
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks
   ```

   In this repository's Settings > Secrets and variables > Actions, add `ANDROID_UPLOAD_KEYSTORE` (the base64 text), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` (`upload`) and `ANDROID_UPLOAD_KEY_PASSWORD`. Never commit the keystore or put its passwords in a file here.
3. **Build the bundle**: Actions > Release (Play bundle) > Run workflow, version `1.0.0`. It builds, checks that the app would load, and attaches `nightshift-1.0.0-play.aab` to a GitHub release named `play-v1.0.0`.
4. **Upload it to Internal testing** and accept Play App Signing. Install it from the testing link on a phone and open it once.
5. **Vouch for the app from the site.** In Play Console > Test and release > App integrity > App signing, copy the SHA-256 of the app signing key and of the upload key. They go into `https://taugustincst.github.io/.well-known/assetlinks.json` (repository taugustincst.github.io) under `com.taugustincst.nightshift`. Until they do, the game opens with a browser bar at the top. Claude can open that pull request once you send the two fingerprints (they are public, not secrets).
6. **Create the in-app product** `full_unlock` (one-time, non-consumable) at the price in `store/listing.md`, and activate it.
7. **Turn on acknowledgement for this app.** Play refunds a purchase that nobody acknowledges within three days. The game now reports every purchase to the acknowledgement service Chronicles of Elderon uses (`ack-endpoint/` in the fftremake repository), which has to list this package:
   - redeploy that service with `com.taugustincst.nightshift:full_unlock` in its `ALLOWED_PRODUCTS` setting (see its README);
   - in Play Console > Users and permissions, give the service's account access to this app with "View financial data" and "Manage orders and subscriptions";
   - the Google Cloud project it runs in must have working billing.
   Test with a licence tester: buy, wait a minute, and the order should show as acknowledged in Order management.
8. **App content**: privacy policy `https://taugustincst.github.io/project-shell-07/privacy.html`; ads: none; data safety, content rating and target audience as written in `store/listing.md`.
9. **Store listing**: title, short and full description from `store/listing.md`; icon `icons/icon-512.png`; feature graphic `store/feature-graphic-1024x500.png`; phone screenshots `store/screenshot-*.png` (1080 wide, in the listing's caption order).
10. **Release.** A personal developer account made after November 2023 needs a closed test with at least 12 testers for 14 days before production. Then send the release for review. Folder's evaluation fixes and playtests in `HANDOFF.md` come first.
