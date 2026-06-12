const fs = require('fs');
const path = require('path');
const sdk = (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')).replace(/\\/g, '/');
const androidDir = path.join(process.cwd(), 'android');
fs.mkdirSync(androidDir, { recursive: true });
fs.writeFileSync(path.join(androidDir, 'local.properties'), `sdk.dir=${sdk}\n`);
console.log(`[MediScan] wrote android/local.properties -> sdk.dir=${sdk}`);
