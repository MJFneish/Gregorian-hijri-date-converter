#!/usr/bin/env node
/**
 * Bumps the app version before a release build.
 *
 * Usage:
 *   yarn bump                -> bump build numbers only (android versionCode / ios build)
 *   yarn bump patch          -> 1.0.0 -> 1.0.1  + build numbers
 *   yarn bump minor          -> 1.0.0 -> 1.1.0  + build numbers
 *   yarn bump major          -> 1.0.0 -> 2.0.0  + build numbers
 *   yarn bump patch --dry-run -> show what would change without writing
 *
 * Bare React Native CLI project (same as lexitoon, unlike the Expo-based prayer-times-lb which
 * bumps app.json) — there's no config-generation step, so this writes straight to the native
 * project files that are checked in:
 *   - package.json                               "version"  (source of truth, shown in Settings)
 *   - android/app/build.gradle                   versionCode / versionName
 *   - ios/<AppName>.xcodeproj/project.pbxproj    MARKETING_VERSION / CURRENT_PROJECT_VERSION
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bumpType = args.find(a => ['patch', 'minor', 'major'].includes(a));

const unknown = args.filter(a => a !== '--dry-run' && a !== bumpType);
if (unknown.length > 0) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}\nUsage: yarn bump [patch|minor|major] [--dry-run]`);
  process.exit(1);
}

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const oldVersion = pkg.version || '1.0.0';
let newVersion = oldVersion;
if (bumpType) {
  const [major, minor, patch] = oldVersion.split('.').map(Number);
  if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
  if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
  if (bumpType === 'patch') newVersion = `${major}.${minor}.${patch + 1}`;
  pkg.version = newVersion;
}

const BOM = String.fromCharCode(0xfeff);
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let oldCode = null;
let newCode = null;
if (fs.existsSync(gradlePath)) {
  const gradle = fs.readFileSync(gradlePath, 'utf8');
  const match = gradle.match(/versionCode\s+(\d+)/);
  oldCode = match ? parseInt(match[1], 10) : 1;
  newCode = oldCode + 1;
}

console.log(
  `version:     ${oldVersion} -> ${newVersion}${bumpType ? '' : ' (unchanged, pass patch|minor|major to bump)'}`,
);
if (oldCode !== null) {
  console.log(`versionCode: ${oldCode} -> ${newCode}`);
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`updated ${path.relative(root, pkgPath)}`);

if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (gradle.startsWith(BOM)) gradle = gradle.slice(1);
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${newVersion}"`);
  fs.writeFileSync(gradlePath, gradle);
  console.log(`updated ${path.relative(root, gradlePath)}`);
}

const iosDir = path.join(root, 'ios');
if (fs.existsSync(iosDir)) {
  const pbxprojPath = fs
    .readdirSync(iosDir)
    .filter(f => f.endsWith('.xcodeproj'))
    .map(f => path.join(iosDir, f, 'project.pbxproj'))
    .find(f => fs.existsSync(f));

  if (pbxprojPath) {
    let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
    pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
    if (newCode !== null) {
      pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${newCode};`);
    }
    fs.writeFileSync(pbxprojPath, pbxproj);
    console.log(`updated ${path.relative(root, pbxprojPath)}`);
  }
}
