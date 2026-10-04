import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVersion, decideBump, latestVersion, nextVersion, planRelease, releaseNotes } from './release.mjs';

describe('decideBump', () => {
  for (const [messages, expected] of [
    [['fix: repair smoke test'], 'patch'],
    [['docs: reword README'], 'patch'],
    [['feat(ci): add zstd', 'fix: typo'], 'minor'],
    [['feat!: switch to Node 26'], 'major'],
    [['refactor: rename user\n\nBREAKING CHANGE: UID changed'], 'major'],
  ]) {
    test(`${JSON.stringify(messages)} -> ${expected}`, () => assert.equal(decideBump(messages, []), expected));
  }

  test('ignores release-preparation commits', () => {
    assert.equal(decideBump(['chore(release): prepare 2.0.0', 'fix: a'], []), 'patch');
  });

  test('lets one release label override the commits', () => {
    assert.equal(decideBump(['feat: big'], ['release:patch']), 'patch');
    assert.equal(decideBump(['fix: small'], ['dependencies', 'release:major']), 'major');
  });

  test('rejects more than one release label', () => {
    assert.throws(() => decideBump(['fix: a'], ['release:minor', 'release:major']), /one release label/);
  });
});

describe('nextVersion', () => {
  test('applies each bump', () => {
    assert.equal(nextVersion('1.2.3', 'patch'), '1.2.4');
    assert.equal(nextVersion('1.2.3', 'minor'), '1.3.0');
    assert.equal(nextVersion('1.2.3', 'major'), '2.0.0');
  });

  test('rejects invalid input', () => {
    assert.throws(() => nextVersion('1.2', 'patch'), /semver/);
    assert.throws(() => nextVersion('1.2.3', 'huge'), /bump/);
  });
});

describe('latestVersion', () => {
  test('picks the highest semver tag', () => {
    assert.equal(latestVersion(['v0.2.0', 'v0.10.0', 'v0.9.1', 'docs-1', 'v1.0.0-rc.1']), '0.10.0');
  });

  test('starts from 0.0.0 when no version tag exists', () => {
    assert.equal(latestVersion(['', 'docs-1']), '0.0.0');
  });
});

describe('planRelease', () => {
  test('plans the first release from 0.0.0', () => {
    assert.deepEqual(planRelease({ released: '0.0.0', current: '0.0.0', messages: ['feat: images'], labels: [] }),
      { released: '0.0.0', current: '0.0.0', bump: 'minor', next: '0.1.0' });
  });
});

describe('applyVersion', () => {
  async function fixture() {
    const root = await mkdtemp(path.join(tmpdir(), 'js-ci-runner-release-'));
    await writeFile(path.join(root, 'VERSION'), '0.1.0\n');
    await writeFile(path.join(root, 'README.md'), [
      'container: ghcr.io/yi-john-huang/js-ci-runner/ci:0.1.0',
      'FROM ghcr.io/yi-john-huang/js-ci-runner/runtime:0.1.0',
      'node:0.1.0 stays',
      '',
    ].join('\n'));
    await writeFile(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n\n### Added\n- Zstd.\n\n## [0.1.0] - 2026-10-01\n\n- First.\n');
    return root;
  }
  const read = (root, file) => readFile(path.join(root, file), 'utf8');

  test('writes the version and dates the Unreleased section', async () => {
    const root = await fixture();
    const changed = applyVersion({ root, from: '0.1.0', released: '0.1.0', to: '0.2.0', date: '2026-10-05' });
    assert.deepEqual(changed.sort(), ['CHANGELOG.md', 'README.md', 'VERSION']);
    assert.equal(await read(root, 'VERSION'), '0.2.0\n');
    const readme = await read(root, 'README.md');
    assert.match(readme, /js-ci-runner\/ci:0\.2\.0/);
    assert.match(readme, /js-ci-runner\/runtime:0\.2\.0/);
    assert.match(readme, /node:0\.1\.0 stays/);
    assert.match(await read(root, 'CHANGELOG.md'), /## \[Unreleased\]\n\n## \[0\.2\.0\] - 2026-10-05\n\n### Added\n- Zstd\.\n\n## \[0\.1\.0\]/);
  });

  test('retargets a prepared version and is stable on rerun', async () => {
    const root = await fixture();
    applyVersion({ root, from: '0.1.0', released: '0.1.0', to: '0.2.0', date: '2026-10-05' });
    applyVersion({ root, from: '0.2.0', released: '0.1.0', to: '1.0.0', date: '2026-10-05' });
    const changelog = await read(root, 'CHANGELOG.md');
    assert.doesNotMatch(changelog, /## \[0\.2\.0\]/);
    assert.match(changelog, /## \[1\.0\.0\] - 2026-10-05\n\n### Added\n- Zstd\./);
    assert.deepEqual(applyVersion({ root, from: '1.0.0', released: '0.1.0', to: '1.0.0', date: '2026-10-05' }), []);
  });
});

describe('releaseNotes', () => {
  const changelog = '# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-10-05\n\n### Added\n- Zstd.\n\n## [0.1.0] - 2026-10-01\n\n- First.\n';

  test('returns one section body', () => assert.equal(releaseNotes(changelog, '0.2.0'), '### Added\n- Zstd.'));
  test('fails for a missing version', () => assert.throws(() => releaseNotes(changelog, '9.9.9'), /9\.9\.9/));
});
