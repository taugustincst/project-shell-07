# Night Shift: Laundromat on Google Play

Night Shift: Laundromat is sold on Google Play as a paid app, $4.99, with no in-app purchases. Nothing in the game is free to play: the whole game is inside the app, and the website is only its store page.

- **The app** is `android/play`: a full-screen WebView that opens the game from files packed inside the APK (`https://appassets.androidplatform.net/www/index.html`, served by AndroidX WebViewAssetLoader). It asks for no permissions, not even internet, and plays fully offline. The build copies the game's files (`index.html`, the styles, `js/`, `icons/` and the rest) into the app every time, so a game change ships with the next version.
- **Package**: `com.taugustincst.nightshift`
- **Version**: 1.0.0 (versionCode 10000). The release workflow takes the version and works out the code (1.0.1 becomes 10001).
- **Checks on every change** (`.github/workflows/android.yml`): builds the release APK and bundle, `tools/check-apk.js` confirms every class the manifest names and every file the game's page loads is in the app, and `tools/launch-test.sh` opens it on an Android 14 emulator and fails unless the game's page loads with no script errors.
- **Signing**: the release workflow signs with the upload key from the repository's secrets; without them it builds and checks but publishes nothing. Locally, `android/keystore.properties` (never committed) does the same.
- **The website** (`.github/workflows/pages.yml`) publishes only the store page (`site/index.html`, built from `store/listing.md`), the privacy policy and the store graphics. It no longer publishes the game. Its `sw.js` clears the copy of the game that earlier versions of the site installed for offline play.

## What is left, in order

These need your accounts, so they are yours.

1. **Create the app in the Play Console** with the package name `com.taugustincst.nightshift` (Play never lets it change once the first bundle is uploaded). Set it up as a **paid** app at $4.99. Play does not let a free app become paid later, so choose Paid before the first release. No in-app products.
2. **Make an upload key, once, and keep it somewhere safe** (a password manager). On your own computer:

   ```
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks
   ```

   In this repository's Settings > Secrets and variables > Actions, add `ANDROID_UPLOAD_KEYSTORE` (the base64 text), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` (`upload`) and `ANDROID_UPLOAD_KEY_PASSWORD`. Never commit the keystore or put its passwords in a file here.
3. **Build the bundle**: Actions > Release (Play bundle) > Run workflow, version `1.0.0`. It builds, checks that the game loads, and attaches `nightshift-1.0.0-play.aab` to a GitHub release named `play-v1.0.0`.
4. **Upload it to Internal testing** and accept Play App Signing. Install it from the testing link on a phone and play a little.
5. **App content**: privacy policy `https://taugustincst.github.io/project-shell-07/privacy.html`; ads: none; data safety: no data collected or shared; content rating and target audience as written in `store/listing.md`.
6. **Store listing**: title, short and full description from `store/listing.md`; icon `icons/icon-512.png`; feature graphic `store/feature-graphic-1024x500.png`; phone screenshots `store/screenshot-*.png` (1080 wide, in the listing's caption order).
7. **Release.** A personal developer account made after November 2023 needs a closed test with at least 12 testers for 14 days before production. Then send the release for review. Fixes and playtests listed in `HANDOFF.md` come first.
8. **The website changes the moment this is merged.** Merging turns the site into the store page, so the game stops being free to play there straight away. Its "Get it on Google Play" button links to `https://play.google.com/store/apps/details?id=com.taugustincst.nightshift`, which only works once the app is live.

No digital asset links are needed: the app no longer opens the website.
