# Tally Counter

A simple, offline Android tally counter app. No account, no internet connection, no ads, no tracking — all data stays on your device.

## Features

- Quick increment/decrement counters
- Data stored locally on-device only
- Works fully offline

## Requirements

- Android Studio (Giraffe or newer recommended)
- JDK 21
- Android SDK 35 (compileSdk/targetSdk), minSdk 24

## Building

```bash
./gradlew assembleDebug
```

The debug APK will be output under `tally-counter-app/build/outputs/apk/debug/`.

### Release build

A release build requires a signing keystore. Create a `keystore.properties` file in the project root (this file is git-ignored and must never be committed):

```properties
RELEASE_STORE_FILE=../your-keystore.jks
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_ALIAS=...
RELEASE_KEY_PASSWORD=...
```

Then run:

```bash
./gradlew bundleRelease
```

## Project structure

- `tally-counter-app/` — Android app module (source, resources, manifest)
- `store-assets/` — Play Store listing assets (icons, feature graphic)
- `generate_assets.py` — script to regenerate store assets

## Privacy

This app does not collect, store, or transmit any personal data. See the privacy policy for details.

## License

TODO: add a license.
