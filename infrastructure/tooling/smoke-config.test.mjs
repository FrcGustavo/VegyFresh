import assert from 'node:assert/strict';
import test from 'node:test';
import { parseImageOptions } from './smoke-config.mjs';

test('selects application independently of its image tag', () => {
  assert.deepEqual(parseImageOptions(['--app', 'portal', '--image', 'vegyfresh-check']), {
    app: 'portal', image: 'vegyfresh-check',
  });
  assert.deepEqual(parseImageOptions(['--image', 'portal-tag', '--app', 'admin']), {
    app: 'admin', image: 'portal-tag',
  });
});

test('rejects missing, repeated and unknown options', () => {
  for (const args of [[], ['--app', 'admin'], ['--app', 'other', '--image', 'app'],
    ['--app', 'admin', '--app', 'portal', '--image', 'app'],
    ['--app', 'admin', '--image', 'app', '--extra', 'value']]) {
    assert.throws(() => parseImageOptions(args), /Use --app/);
  }
});
