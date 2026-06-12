const fs = require('fs');
const path = require('path');

const pluginFile = path.join(
  process.cwd(),
  'node_modules',
  '@qvac',
  'sdk',
  'dist',
  'expo',
  'plugins',
  'withMobileBundle.js'
);

if (!fs.existsSync(pluginFile)) {
  console.log('[MediScan] QVAC plugin file not found yet. Run npm install first.');
  process.exit(0);
}

let code = fs.readFileSync(pluginFile, 'utf8');
const before = code;

// Windows npm can fail on QVAC's prebuild step when the plugin runs:
//   npx --package=@qvac/cli qvac bundle sdk ...
// This patch makes it use the locally installed qvac binary from devDependencies instead.
code = code.replace(/npx\s+--package=@qvac\/cli\s+qvac/g, 'npx --no-install qvac');
code = code.replace(/npx\s+--yes\s+--package=@qvac\/cli\s+qvac/g, 'npx --no-install qvac');
code = code.replace(/npx\s+-y\s+--package=@qvac\/cli\s+qvac/g, 'npx --no-install qvac');

if (code !== before) {
  fs.writeFileSync(pluginFile, code);
  console.log('[MediScan] Patched QVAC Expo plugin to use local @qvac/cli instead of npx --package.');
} else {
  console.log('[MediScan] QVAC plugin did not contain the expected npx --package command, or it was already patched.');
}
