# Windows QVAC `ECOMPROMISED Lock compromised` fix

The error happens while QVAC's Expo plugin runs:

```bash
npx --package=@qvac/cli qvac bundle sdk ...
```

This is usually a Windows Node/npm `npx` cache/lock issue, especially with Node 24/25. It is not caused by the MediScan code.

## Quick UI/database build, without native QVAC bundle

This project now disables the QVAC Expo plugin by default so you can test the app UI, vault, database matching, auto-fill, and helpdesk fallback first:

```bash
rm -rf node_modules package-lock.json android ios
npm cache clean --force
npm install
npx expo prebuild --clean
npx expo run:android --device
```

On Windows CMD, use:

```bat
rmdir /s /q node_modules
rmdir /s /q android
rmdir /s /q ios
del package-lock.json
npm cache clean --force
npm install
npx expo prebuild --clean
npx expo run:android --device
```

## Real QVAC native OCR build

1. Use Node.js 22 LTS. Avoid Node 24/25 for this QVAC npx step on Windows.
2. Clear npm and npx cache:

```bat
npm cache clean --force
rmdir /s /q "%LOCALAPPDATA%\npm-cache\_npx"
```

3. Reinstall:

```bat
rmdir /s /q node_modules
del package-lock.json
npm install
```

4. Enable the QVAC Expo plugin during prebuild:

```bat
set ENABLE_QVAC_BUNDLE=1&& npx expo prebuild --clean
set ENABLE_QVAC_BUNDLE=1&& npx expo run:android --device
```

For macOS/Linux:

```bash
ENABLE_QVAC_BUNDLE=1 npx expo prebuild --clean
ENABLE_QVAC_BUNDLE=1 npx expo run:android --device
```

QVAC should be tested on a physical Android/iOS device, not an emulator.
