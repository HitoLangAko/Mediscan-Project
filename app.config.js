// Dynamic Expo config so QVAC native bundling can be enabled only when your local
// Node/npm setup is ready. This avoids Windows npm ECOMPROMISED npx cache errors
// during normal UI/database testing.
// Forced QVAC build: always include the QVAC Expo plugin for real OCR builds.
const enableQvacBundle = true;

const plugins = [
'expo-camera',
'expo-image-picker',
[
'expo-build-properties',
{
android: { minSdkVersion: 29 },
},
],
];

if (enableQvacBundle) {
plugins.push('@qvac/sdk/expo-plugin');
}

module.exports = {
expo: {
name: 'MediScan',
slug: 'mediscan-vault-prototype',
version: '1.0.0',
orientation: 'portrait',
icon: './assets/icon.png',
userInterfaceStyle: 'light',
splash: {
backgroundColor: '#2567F6',
resizeMode: 'contain',
},
assetBundlePatterns: ['**/*'],
ios: {
supportsTablet: true,
bundleIdentifier: 'com.mediscan.prototype',
infoPlist: {
NSCameraUsageDescription: 'MediScan uses the camera to scan medicine labels and barcodes.',
NSPhotoLibraryUsageDescription: 'MediScan can import medicine photos for scanning.',
},
deploymentTarget: '17.0',
},
android: {
package: 'com.mediscan.prototype',
permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
adaptiveIcon: { backgroundColor: '#2567F6' },
minSdkVersion: 29,
},
extra: {
qvacNativeBundleEnabled: enableQvacBundle,
},
plugins,
},
};
