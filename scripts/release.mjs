#!/usr/bin/env node
// Release helper for the develop -> master pipeline (.github/workflows/release-*.yml).
//
//   node scripts/release.mjs plan [--labels a,b]   prints released/current/bump/next as key=value lines
//   node scripts/release.mjs apply --to X.Y.Z [--date YYYY-MM-DD]
//   node scripts/release.mjs notes --version X.Y.Z  prints the CHANGELOG section body
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const BUMPS = ['patch', 'minor', 'major'];
const RELEASE_COMMIT = /^chore\(release\):/;
const IMAGES = ['js-ci-runner/ci', 'js-ci-runner/runtime'];

/** Conventional Commits: `!` or BREAKING CHANGE -> major, feat -> minor, anything else -> patch. */
export function decideBump(messages, labels) {
  const releaseLabels = labels.filter((label) => label.startsWith('release:'));
  if (releaseLabels.length > 1) throw new Error(`Use at most one release label; found ${releaseLabels.join(', ')}`);
  if (releaseLabels.length === 1) {
    const bump = releaseLabels[0].slice('release:'.length);
    if (!BUMPS.includes(bump)) throw new Error(`Unknown release label ${releaseLabels[0]}; use release:patch, release:minor, or release:major`);
    return bump;
  }
  let level = 0;
  for (const message of messages.filter((text) => !RELEASE_COMMIT.test(text))) {
    const subject = message.split('\n', 1)[0];
    if (/^[a-z]+(\([^)]*\))?!:/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(message)) return 'major';
    if (/^feat(\([^)]*\))?:/.test(subject)) level = Math.max(level, 1);
  }
  return BUMPS[level];
}

export function nextVersion(version, bump) {
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`Version ${version} is not plain semver (X.Y.Z)`);
  if (!BUMPS.includes(bump)) throw new Error(`Unknown bump ${bump}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Tags live on master merge commits, which develop does not contain, so take the highest tag overall. */
export function latestVersion(tags) {
  const versions = tags.map((tag) => /^v(\d+\.\d+\.\d+)$/.exec(tag)?.[1]).filter(Boolean);
  if (versions.length === 0) return '0.0.0';
  const key = (version) => version.split('.').map(Number);
  return versions.sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  })[0];
}

/** Plans from the released tag, never from a prepared version, so reruns are stable. */
export function planRelease({ released, current, messages, labels }) {
  const bump = decideBump(messages, labels);
  return { released, current, bump, next: nextVersion(released, bump) };
}

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function updateChangelog(text, { from, released, to, date }) {
  const sections = text.split(/^(?=## \[)/m);
  const head = sections.shift();
  const bodyOf = (section) => section.replace(/^## \[[^\]]*\][^\n]*\n/, '').trim();
  const unreleasedIndex = sections.findIndex((section) => section.startsWith('## [Unreleased]'));
  const preparedIndex = from === released ? -1 : sections.findIndex((section) => section.startsWith(`## [${from}]`));

  const parts = [];
  if (unreleasedIndex !== -1 && bodyOf(sections[unreleasedIndex])) parts.push(bodyOf(sections[unreleasedIndex]));
  if (preparedIndex !== -1 && bodyOf(sections[preparedIndex])) parts.push(bodyOf(sections[preparedIndex]));
  const body = parts.join('\n\n') || '- No changelog entries.';

  const rest = sections.filter((_, index) => index !== unreleasedIndex && index !== preparedIndex);
  return `${head}## [Unreleased]\n\n## [${to}] - ${date}\n\n${body}\n\n${rest.join('')}`;
}

/** Writes `to` into every versioned file. Returns the project-relative paths that changed. */
export function applyVersion({ root, from, released, to, date }) {
  if (!SEMVER.test(to)) throw new Error(`Target ${to} is not plain semver (X.Y.Z)`);
  const pin = (text) => IMAGES.reduce(
    (result, image) => result.replace(new RegExp(`${escape(image)}:${escape(from)}(?![\\d.])`, 'g'), `${image}:${to}`),
    text,
  );

  const edits = {
    VERSION: (before) => `${to}\n`,
    'README.md': pin,
    'CHANGELOG.md': (before) => {
      const alreadyDone = from === to && !/^## \[Unreleased\]\n\n(?!## \[)\S/m.test(before);
      return alreadyDone ? before : updateChangelog(before, { from, released, to, date });
    },
  };

  const changed = [];
  for (const [relative, edit] of Object.entries(edits)) {
    const file = path.join(root, relative);
    const before = readFileSync(file, 'utf8');
    const after = edit(before);
    if (after !== before) {
      writeFileSync(file, after);
      changed.push(relative);
    }
  }
  return changed;
}

export function releaseNotes(changelog, version) {
  const match = new RegExp(`^## \\[${escape(version)}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`, 'm').exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md has no section for ${version}`);
  return match[1].trim();
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(argv) {
  const [command, ...args] = argv;
  const root = process.cwd();
  const current = readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  const released = latestVersion(git('tag', '--list', 'v*').split('\n'));

  if (command === 'plan') {
    const range = released === '0.0.0' ? 'HEAD' : `v${released}..HEAD`;
    const messages = git('log', range, '--format=%B%x00').split('\0').map((m) => m.trim()).filter(Boolean);
    const labels = (option(args, '--labels') ?? '').split(',').map((label) => label.trim()).filter(Boolean);
    for (const [key, value] of Object.entries(planRelease({ released, current, messages, labels }))) console.log(`${key}=${value}`);
    return;
  }
  if (command === 'apply') {
    const to = option(args, '--to');
    const date = option(args, '--date') ?? new Date().toISOString().slice(0, 10);
    const changed = applyVersion({ root, from: current, released, to, date });
    console.log(changed.length ? `Updated ${changed.join(', ')}` : 'Already at target version');
    return;
  }
  if (command === 'notes') {
    console.log(releaseNotes(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), option(args, '--version')));
    return;
  }
  throw new Error('Usage: release.mjs plan [--labels a,b] | apply --to X.Y.Z [--date D] | notes --version X.Y.Z');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
