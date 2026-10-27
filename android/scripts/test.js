#!/usr/bin/env node
/**
 * Runs the Android app's unit tests (calendar engine golden tests, moon, crescent, tables, settings
 * …): `yarn test` in android/. Extra arguments go to Gradle, e.g. `--tests '*Hijri*'`. The iOS
 * app's tests run on GitHub Actions (.github/workflows/ci.yml) — no Xcode on this machine.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const nativeDir = path.resolve(__dirname, '..');
const gradlew = path.join(nativeDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(process.platform === 'win32' ? `"${gradlew}"` : gradlew, ['testDebugUnitTest', ...process.argv.slice(2)], {
  cwd: nativeDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
