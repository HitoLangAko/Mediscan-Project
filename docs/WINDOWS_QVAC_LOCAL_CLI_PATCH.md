# Windows QVAC local CLI patch

This build adds `@qvac/cli` as a devDependency and patches QVAC Expo plugin after npm install so prebuild uses the local CLI instead of `npx --package=@qvac/cli`.

Why: on some Windows/npm setups, `npx --package=@qvac/cli ...` fails with `ECOMPROMISED Lock compromised` during Expo prebuild.

Commands:

```bat
cd /d D:\Downloads\mediscan_qvac_windows_local_cli_patch\mediscan_prototype
npm install
npm run patch:qvac-windows
set ENABLE_QVAC_BUNDLE=1
rmdir /s /q android
npx expo prebuild --clean --platform android
npx expo run:android --device
```

Or run:

```bat
scripts\run-qvac-android-windows.bat
```
