# QVAC dependency fix

This project pins `@qvac/sdk` to `0.11.0` and `react-native-bare-kit` to `0.12.3` because QVAC SDK 0.11.0 declares `react-native-bare-kit@0.12.3` as its peerOptional dependency.

If you previously installed the older package, clean reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
npx expo prebuild --clean
npx expo run:android --device
```

Do not rely on `--legacy-peer-deps` for the final demo because it can install a mismatched native bridge.
