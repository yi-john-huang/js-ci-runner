import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('prints the greeting once', () => {
  const output = execFileSync(process.execPath, ['server.js', '--once'], { encoding: 'utf8' });
  assert.match(output, /hello from js-ci-runner/);
});
