#!/usr/bin/env node
/**
 * Builds the Android release APK of the native app (native/) and saves it as
 * dist/HijriConverter-v<version>-build<versionCode>.apk.
 *
 * Usage:
 *   yarn build:apk
 *
 * Version and build number come from native/version.properties (bump them first with
 * `yarn bump ...`). The APK is signed with the same key as every earlier release, so it installs
 * over them as an update.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const nativeDir = path.join(root, 'native');

const properties = fs.readFileSync(path.join(nativeDir, 'version.properties'), 'utf8');
const read = key => properties.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
const version = read('VERSION_NAME');
const versionCode = read('VERSION_CODE');

// Full path: Windows shells may be set not to run programs from the current directory by bare name.
const gradlew = path.join(nativeDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const command = process.platform === 'win32' ? `"${gradlew}"` : gradlew;
console.log(`\n> gradlew assembleRelease (${version}, build ${versionCode})`);
const result = spawnSync(command, ['assembleRelease'], { cwd: nativeDir, stdio: 'inherit', shell: process.platform === 'win32' });
if (result.status !== 0) process.exit(result.status ?? 1);

const built = path.join(nativeDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const outDir = path.join(root, 'dist');
const target = path.join(outDir, `HijriConverter-v${version}-build${versionCode}.apk`);
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(built, target);
console.log(`\nAPK: ${path.relative(root, target)} (${(fs.statSync(target).size / 1048576).toFixed(1)} MB)`);
