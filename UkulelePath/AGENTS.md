# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Local Android APK build

- Read `docs/ANDROID_BUILD_TOOLCHAIN.md` before installing or changing Android build tools.
- Run `npm.cmd run build:apk` for the normal incremental Release APK workflow.
- Use `npm.cmd run build:apk:refresh` only after `app.json`, config-plugin or native-dependency changes; it regenerates the ignored `android/` directory.
- Read `dist/android/latest-build.json` for the latest verified artifact path and SHA-256.
- The local Release APK uses Debug Keystore and is not store-ready.
