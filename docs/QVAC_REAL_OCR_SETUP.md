# MediScan Real QVAC OCR Setup

This version is no longer only hardcoded demo data. The real scan path is:

```text
Camera / uploaded photo
↓
QVAC OCR (`src/services/qvacAdapter.ts`)
↓
Dynamic parser (`src/services/parseScanText.ts`)
↓
Local 747-record medicine matcher (`src/services/medicineMatcher.ts`)
↓
Verified / Needs Verification / Expired result
```

## Important

QVAC uses native local inference. It will not run in the normal Expo Go app or mobile emulators. Use a physical Android/iOS device and run a prebuilt/dev build.

## Install

```bash
npm install
npx expo install expo-file-system expo-build-properties expo-device
```

## Build on Android physical device

```bash
npx expo prebuild
npx expo run:android --device
```

## Build on iOS physical device

```bash
npx expo prebuild
npx expo run:ios --device
```

## Where the AI is connected

Real QVAC OCR is implemented in:

```text
src/services/qvacAdapter.ts
```

The function `extractFromUserImage(uri)` loads the QVAC OCR model and runs OCR on the image path:

```ts
const modelId = await loadModel({
  modelSrc: OCR_LATIN_RECOGNIZER_1,
  modelType: 'ocr',
  modelConfig: { langList: ['en'], useGPU: true }
});

const { blocks } = ocr({ modelId, image, options: { paragraph: false } });
```

## What is still demo-only?

The bundled sample images still use sample OCR text because React Native packaged assets are not normal filesystem photos. For a real AI scan, tap:

```text
Take Photo with QVAC OCR
```

or

```text
Upload Photo with QVAC OCR
```

## Safety note

The app matches OCR text against the local medicine database. It does not diagnose, prescribe, or prove Philippine FDA registration unless a CPR/FDA registration number is verified from an official source.
