@echo off
setlocal
cd /d %~dp0\..
set ENABLE_QVAC_BUNDLE=1
npm run patch:qvac-windows
rmdir /s /q android 2>nul
npx expo prebuild --clean --platform android
if errorlevel 1 exit /b %errorlevel%
npx expo run:android --device
