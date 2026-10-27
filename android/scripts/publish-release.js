#!/usr/bin/env node
/**
 * Publishes the GitHub release of the current version (android/version.properties): title = the
 * version ("2.0.0-alpha.3"), tag v<version> (must already be pushed), marked as a pre-release when
 * the version has a "-suffix". One release per version bump (the user's standing request).
 *
 * Usage:
 *   yarn release --notes <file.md>          release notes from a Markdown file
 *   yarn release --notes <file.md> --apk    also attach android/dist/HijriConverter-v<version>-build<code>.apk
 *
 * The token comes from git's credential helper (`git credential fill`), the one `git push` uses —
 * no `gh` CLI needed. It is never printed.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'MJFneish/Gregorian-hijri-date-converter';
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const notesIndex = args.indexOf('--notes');
const notesFile = notesIndex >= 0 ? args[notesIndex + 1] : undefined;
const attachApk = args.includes('--apk');
if (!notesFile) {
  console.error('Usage: yarn release --notes <file.md> [--apk]');
  process.exit(1);
}

const properties = fs.readFileSync(path.join(root, 'version.properties'), 'utf8');
const read = key => properties.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim();
const version = read('VERSION_NAME');
const versionCode = read('VERSION_CODE');
const tag = `v${version}`;

const credentials = execFileSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const token = credentials.match(/^password=(.*)$/m)?.[1];
if (!token) {
  console.error('No GitHub credentials from `git credential fill`.');
  process.exit(1);
}
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'hijri-converter-release',
};

async function main() {
  const tagRef = await fetch(`https://api.github.com/repos/${REPO}/git/ref/tags/${tag}`, { headers });
  if (!tagRef.ok) throw new Error(`Tag ${tag} is not on GitHub yet — push it first (git push origin ${tag}).`);

  const existing = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`, { headers });
  let release;
  if (existing.ok) {
    release = await existing.json();
    console.log(`Release ${version} already exists: ${release.html_url}`);
  } else {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tag_name: tag,
        name: version,
        body: fs.readFileSync(path.resolve(notesFile), 'utf8'),
        prerelease: version.includes('-'),
      }),
    });
    if (!response.ok) throw new Error(`Creating the release failed: HTTP ${response.status} ${await response.text()}`);
    release = await response.json();
    console.log(`Published ${version}: ${release.html_url}`);
  }

  if (attachApk) {
    const name = `HijriConverter-v${version}-build${versionCode}.apk`;
    const apk = path.join(root, 'dist', name);
    if (!fs.existsSync(apk)) throw new Error(`${path.relative(root, apk)} not found — run yarn build:apk first.`);
    if (release.assets?.some(a => a.name === name)) {
      console.log(`${name} is already attached.`);
      return;
    }
    const upload = await fetch(
      `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/vnd.android.package-archive' },
        body: fs.readFileSync(apk),
      },
    );
    if (!upload.ok) throw new Error(`Uploading the APK failed: HTTP ${upload.status} ${await upload.text()}`);
    console.log(`Attached ${name}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
