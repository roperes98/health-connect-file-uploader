# Health Connect Uploader

An Expo React Native app that imports `.tcx` (Training Center XML) files, extracts workout data, and writes it to Google Health Connect.

## Why this project exists

Some fitness apps — including **Polar Flow** — fail to sync workouts from previous days into Health Connect. A session recorded yesterday (or earlier) may never appear in your health hub, even when newer activities sync fine. That leaves gaps in exercise history, heart rate, and recovery metrics across apps that read from Health Connect.

This project bridges that gap: export a workout as `.tcx` from your tracker or app, then import it directly into Health Connect with the correct timestamps, heart rate samples, and HRV (RMSSD).

## Features

- **TCX import**: select `.tcx` files from the device.
- **Data parsing**: extracts start/end time and activity type.
- **Heart rate**: records beat samples throughout the workout.
- **HRV (RMSSD)**: calculates heart rate variability from the recorded beats.
- **Health Connect**: writes `ExerciseSession`, `HeartRate`, and `HeartRateVariabilityRmssd` records.

## Tech stack

- **React Native / Expo** — base framework.
- **react-native-health-connect / expo-health-connect** — Health Connect API integration.
- **expo-document-picker** — native file selection.
- **fast-xml-parser** — XML (TCX) parsing.

## Requirements

| Requirement | Details |
|-------------|---------|
| Platform | **Android only** (Health Connect is not available on iOS or web) |
| Android | API 26+ (Android 8.0 or later) |
| Health Connect | [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata) app installed on the device |
| Native build | Required — native modules are not available in Expo Go |

### What does **not** work

- `npx expo start` + **Expo Go** — Health Connect will not initialize.
- `npm run web` — Health Connect is Android-only.
- Metro bundler alone without an APK compiled with the native modules.

The app must be installed as a **native build** (local or via EAS).

## Installation

```bash
npm install
```

## How to run

Pick **one** of the options below.

### Option A — Local build (recommended for development)

Requires [Android Studio](https://developer.android.com/studio) with the SDK, an emulator, or a physical device with USB debugging enabled.

```bash
npx expo run:android
```

This generates the native Android project (`expo prebuild`), compiles the APK with `expo-health-connect`, and installs it on the device/emulator. The first run may take several minutes.

To reload JavaScript after installation:

```bash
npx expo start
```

Open the **already installed** app on the device (do not use Expo Go). Metro will reload the bundle automatically.

### Option B — EAS Build (preview APK)

Useful if you do not have Android Studio or want to test on a physical phone without building locally.

1. Install and authenticate the EAS CLI:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Build the preview APK:

   ```bash
   eas build --profile preview --platform android
   ```

3. Download and install the APK on your device (link shown when the build finishes).

This APK is standalone — Metro does not need to be running.

### Option C — Development build (hot reload with dev client)

For development with fast refresh using the Expo Dev Client:

1. Build the development client:

   ```bash
   eas build --profile development --platform android
   ```

2. Install the generated APK on your device.

3. Start the bundler pointed at the dev client:

   ```bash
   npx expo start --dev-client
   ```

Open the installed app (not Expo Go).

## Health Connect permissions

On first launch, the app requests **write** access for:

- `ExerciseSession`
- `HeartRate`
- `HeartRateVariabilityRmssd`

If the connection fails, open the **Health Connect** app → **App permissions** → **Health Connect Uploader** and grant access manually.

## How to use the app

1. Install the app using one of the options above and open it on Android.
2. Wait for the **"Ready to import"** status (Health Connect connected).
3. Tap **Select TCX file** and choose a `.tcx` file.
4. The app parses the file and writes the exercise session, heart rate, and HRV to Health Connect.
5. Verify the data in the Health Connect app.

A sample file is available at `examples/Rodrigo_Peres_2026-06-11_23-34-52.TCX`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "Health Connect unavailable" | App running in Expo Go or without a native build | Reinstall with `npx expo run:android` or an EAS build |
| Permissions denied | User declined or revoked access in Health Connect | Health Connect → App permissions → grant write access |
| Health Connect not found | App not installed on the device | Install from Google Play |
| Emulator without Google Play | AOSP image without Google services | Use an emulator with the Play Store or a physical device |

## Project structure

- `App.js` — UI, Health Connect initialization, file selection, and record insertion.
- `utils/parseTcx.js` — TCX parsing and HRV (RMSSD) calculation.
- `utils/buildHealthConnectRecords.js` — builds records for Health Connect.
- `app.json` / `eas.json` — Expo configuration, native plugins, and build profiles.
