# Screenshot capture matrix

Generated visual evidence is intentionally untracked and always lives below:

```text
artifacts/screenshots/
├── web/
│   ├── landing-desktop.png
│   ├── landing-tablet.png
│   ├── landing-android-phone.png
│   ├── library-desktop.png
│   ├── library-mobile.png
│   ├── player-desktop.png
│   └── backup-desktop.png
└── android/
    └── landing-phone.png
```

`npm run screenshots` creates the responsive web landing set. `npm run test:web` creates the authenticated web-library, player, and backup images once a seeded authenticated test session is provided. `npm run test:android` creates the Android landing image from an attached emulator or device with the preview APK installed.

Android authenticated screens are intentionally not substituted with web images. Extend the Android smoke suite with a seeded authenticated test account before adding library, player, backup, settings, or playlist Android screenshots. The resulting files belong under `artifacts/screenshots/android/` using the same screen names as web where applicable.
