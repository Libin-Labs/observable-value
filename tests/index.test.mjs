import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as library from '../dist/esm/index.js';
const { ObservableValue } = library;

test('equality avoids noise and update retains previous', () => {
  const v = new ObservableValue(1);
  const out = [];
  v.subscribe((x) => out.push(x));
  assert.equal(v.set(1), false);
  v.update((n) => n + 1);
  assert.deepEqual(out, [{ value: 2, previous: 1 }]);
});
test('nested batches coalesce final snapshot', () => {
  const v = new ObservableValue(0);
  const out = [];
  v.subscribe((c) => out.push(c));
  assert.equal(
    v.batch(() => {
      v.set(1);
      v.batch(() => v.set(2));
      return 7;
    }),
    7,
  );
  assert.deepEqual(out, [{ value: 2, previous: 0 }]);
  v.batch(() => {
    v.set(3);
    v.set(2);
  });
  assert.equal(out.length, 1);
});
test('failed batch rolls back including thrown undefined', () => {
  const v = new ObservableValue(0);
  let calls = 0;
  v.subscribe(() => calls++);
  let caught = false;
  try {
    v.batch(() => {
      v.set(2);
      throw undefined;
    });
  } catch (e) {
    caught = true;
    assert.equal(e, undefined);
  }
  assert.equal(caught, true);
  assert.equal(v.value, 0);
  assert.equal(calls, 0);
  v.batch(() => {
    v.set(1);
    try {
      v.batch(() => {
        v.set(8);
        throw 0;
      });
    } catch {}
    v.set(2);
  });
  assert.equal(v.value, 2);
  assert.equal(calls, 1);
});
test('listener failures aggregate after commit and remaining listeners run', () => {
  const v = new ObservableValue(0);
  let ran = false;
  v.subscribe(() => {
    throw undefined;
  });
  v.subscribe(() => {
    ran = true;
    throw 'second';
  });
  assert.throws(
    () => v.set(2),
    (e) => e instanceof AggregateError && e.errors[0] === undefined && e.errors[1] === 'second',
  );
  assert.equal(ran, true);
  assert.equal(v.value, 2);
});
test('reentrant mutation rejected explicitly', () => {
  const v = new ObservableValue(1);
  v.subscribe(() => v.set(3));
  assert.throws(
    () => v.set(2),
    (e) => e instanceof AggregateError && /Reentrant/.test(e.errors[0].message),
  );
  assert.equal(v.value, 2);
});
test('unsubscribe and disposal are idempotent', () => {
  const v = new ObservableValue(0);
  let n = 0;
  const off = v.subscribe(() => n++);
  off();
  off();
  v.set(1);
  assert.equal(n, 0);
  v.dispose();
  v.dispose();
  assert.equal(v.value, 1);
  assert.throws(() => v.set(2), /disposed/);
  assert.throws(() => v.subscribe(() => {}), /disposed/);
  assert.throws(
    () =>
      new ObservableValue(0).batch(() => {
        throw 'x';
      }),
    (e) => e === 'x',
  );
});
