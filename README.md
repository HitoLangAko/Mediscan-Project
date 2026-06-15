# MediScan Vault

MediScan Vault is an offline-first mobile medicine scanner and personal medication library built with Expo React Native and QVAC. The app can scan or upload medicine label photos, extract visible text using QVAC OCR, match the result with a local medicine reference database, and save medicine records in a personal vault.

> This app is for medicine organization and basic information support only. It is not a replacement for doctors, pharmacists, or professional medical advice.

## Features

* Scan medicine labels using the camera
* Upload medicine photos from the gallery
* Extract text using QVAC OCR
* Manual text scan fallback
* Match scanned text with local medicine data
* Show medicine status:

  * Verified
  * Needs Verification
  * Expired
* Save medicines to a personal vault
* Search medicines from the local database
* Helpdesk-style medicine information support
* Offline-first design

## Tech Stack

* React Native
* Expo
* TypeScript
* QVAC SDK
* React Native Bare Kit
* Expo Camera
* Expo Image Picker
* Expo File System

## Requirements

Before running the project, make sure you have:

* Node.js installed
* npm installed
* Android Studio installed
* Android SDK installed
* Android physical device with USB debugging enabled
* ADB working on your computer

QVAC should be tested on a physical Android device. Emulator testing may not work properly for QVAC native inference.

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/mediscan-vault.git
cd mediscan-vault
```

Install dependencies:

```bash
npm install
```

## Android Setup

Before running the Android app, make sure Android Studio and Android SDK are installed.

### 1. Install dependencies

```bash
npm install
```

### 2. Generate the Android native folder

```bash
npx expo prebuild --clean --platform android
```

### 3. Add Android SDK path

Create a file named:

```text
android/local.properties
```

Then add your Android SDK path.

For Windows example:

```properties
sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk
```

You can also create it using CMD:

```bat
(echo sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk)>android\local.properties
```

Do not upload `android/local.properties` to GitHub because the SDK path is different for every computer.

### 4. Generate React Native Codegen files

QVAC and BareKit use native React Native modules. Before building, generate the required Codegen/CMake files:

```bat
cd android
gradlew.bat :app:generateCodegenArtifactsFromSchema --rerun-tasks
cd ..
```

After running Codegen, check if these folders exist:

```bat
dir "node_modules\@react-native-async-storage\async-storage\android\build\generated\source\codegen\jni"
dir "node_modules\react-native-bare-kit\android\build\generated\source\codegen\jni"
```

Both folders should contain a `CMakeLists.txt` file.

If they do not exist, run the available Codegen tasks manually:

```bat
cd android
gradlew.bat tasks --all | findstr /i codegen
```

Then run the matching tasks shown in the terminal. Common examples are:

```bat
gradlew.bat :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema --rerun-tasks
gradlew.bat :react-native-bare-kit:generateCodegenArtifactsFromSchema --rerun-tasks
cd ..
```

### 5. Connect your Android phone

Enable USB debugging on your physical Android device, then check if ADB detects it:

```bat
adb devices
```

Expected result:

```text
YOUR_DEVICE_ID    device
```

QVAC should be tested on a physical Android device. Emulator testing may not work properly for QVAC native inference.

### 6. Run the app

```bash
npx expo run:android --device
```

If `npx` hangs, use the local Expo CLI instead:

```bat
node node_modules\expo\bin\cli run:android --device
```

## Running Without QVAC

Use this mode if you only want to test the UI, database, vault, and manual text scan.

```bash
npx expo run:android --device
```

## Running With QVAC

Make sure your physical Android phone is connected and detected:

```bat
adb devices
```

Expected output:

```text
YOUR_DEVICE_ID    device
```

Then run:

```bash
npx expo run:android --device
```

If Metro is already running and you only changed TypeScript files, restart Metro:

```bash
npx expo start --clear
```

## QVAC OCR Fix Notes

QVAC OCR rotation angles must not include `0`.

Correct configuration:

```ts
defaultRotationAngles: [90, 180, 270]
```

Correct OCR option:

```ts
rotationAngles: [90, 180, 270]
```

Do not use:

```ts
rotationAngles: [0, 90, 180, 270]
```

because QVAC may throw this error:

```text
Unexpected angle 0 received with rotationAngles.
Angles must be one of [90, 180, 270].
```

## Testing QVAC

Use a clear image with large medicine text, such as:

```text
PARACETAMOL 500 mg TABLET
EXP 08/2026
```

A successful scan should show extracted OCR text and should not show:

```text
AI path: qvac-unavailable
```

A successful QVAC run should show something like:

```text
AI path: real-qvac
```

## Project Purpose

MediScan Vault helps users organize and understand medicines they already have at home. It supports offline medicine scanning, basic verification status, expiration awareness, and personal medicine storage.

## Disclaimer

This app does not diagnose, prescribe, or recommend dosage. Always consult a doctor, pharmacist, or licensed healthcare professional for medical concerns.
