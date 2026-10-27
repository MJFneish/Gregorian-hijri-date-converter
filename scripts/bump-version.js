#!/usr/bin/env node
/**
 * Bumps the app version before a release. Source of truth: native/version.properties
 * (VERSION_NAME + VERSION_CODE), read by native/app/build.gradle.kts. package.json's "version" is
 * kept equal to it.
 *
 * Usage:
 *   yarn bump             -> build number only (VERSION_CODE + 1)
 *   yarn bump patch       -> 2.0.0 -> 2.0.1         + build number
 *   yarn bump minor       -> 2.0.0 -> 2.1.0         + build number
 *   yarn bump major       -> 2.0.0 -> 3.0.0         + build number
 *   yarn bump pre         -> 2.0.0-alpha.1 -> 2.0.0-alpha.2 (2.0.0 -> 2.0.1-alpha.1) + build number
 *   yarn bump release     -> 2.0.0-alpha.7 -> 2.0.0 + build number
 *   yarn bump ... --dry-run  -> show what would change without writing
 *
 * As in semver, patch/minor/major on a pre-release finalise it when its version is already at that
 * level (2.0.0-alpha.3 + minor -> 2.0.0; 2.0.1-alpha.1 + minor -> 2.1.0).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'native', 'version.properties');
const pkgPath = path.join(root, 'package.json');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const TYPES = ['patch', 'minor', 'major', 'pre', 'release'];
const bumpType = args.find(a => TYPES.includes(a));

const unknown = args.filter(a => a !== '--dry-run' && a !== bumpType);
if (unknown.length > 0) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}\nUsage: yarn bump [${TYPES.join('|')}] [--dry-run]`);
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
const read = key => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
const oldVersion = read('VERSION_NAME');
const oldCode = Number(read('VERSION_CODE'));
if (!oldVersion || !Number.isInteger(oldCode)) {
  console.error(`${path.relative(root, file)} needs VERSION_NAME and VERSION_CODE`);
  process.exit(1);
}

const [core, pre] = oldVersion.split('-');
const [major, minor, patch] = core.split('.').map(Number);
let newVersion = oldVersion;
if (bumpType === 'major') newVersion = pre && minor === 0 && patch === 0 ? core : `${major + 1}.0.0`;
if (bumpType === 'minor') newVersion = pre && patch === 0 ? core : `${major}.${minor + 1}.0`;
if (bumpType === 'patch') newVersion = pre ? core : `${major}.${minor}.${patch + 1}`;
if (bumpType === 'release') newVersion = core;
if (bumpType === 'pre') {
  const match = pre?.match(/^([a-z]+)\.(\d+)$/i);
  newVersion = match ? `${core}-${match[1]}.${Number(match[2]) + 1}` : `${major}.${minor}.${patch + 1}-alpha.1`;
}
const newCode = oldCode + 1;

console.log(`version:     ${oldVersion} -> ${newVersion}${bumpType ? '' : ` (unchanged, pass ${TYPES.join('|')})`}`);
console.log(`versionCode: ${oldCode} -> ${newCode}`);

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

fs.writeFileSync(
  file,
  text.replace(/^VERSION_NAME=.*$/m, `VERSION_NAME=${newVersion}`).replace(/^VERSION_CODE=.*$/m, `VERSION_CODE=${newCode}`),
);
const pkg = fs.readFileSync(pkgPath, 'utf8');
fs.writeFileSync(pkgPath, pkg.replace(/("version":\s*")[^"]*(")/, `$1${newVersion}$2`));
console.log(`updated ${path.relative(root, file)} and package.json`);
