import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObservableValue } from '../dist/esm/index.js';

test('notification skips removed listeners and delays added listeners', () => {
  const value = new ObservableValue(0);
  const calls = [];
  let remove = () => {};
  const off = value.subscribe(() => {
    calls.push('first');
    remove();
    value.subscribe(() => {
      calls.push('new');
    });
  });
  remove = value.subscribe(() => {
    calls.push('removed');
  });
  value.set(1);
  assert.deepEqual(calls, ['first']);
  off();
  value.set(2);
  assert.deepEqual(calls, ['first', 'new']);
});

test('async batch body is rejected and synchronous writes rolled back', async () => {
  const value = new ObservableValue(0);
  assert.throws(
    () =>
      value.batch(async () => {
        value.set(3);
        throw 'later';
      }),
    TypeError,
  );
  assert.equal(value.value, 0);
  await new Promise(setImmediate);
});

test('async listener misuse reports failure instead of internal unhandled rejection', async () => {
  const value = new ObservableValue(0);
  const unhandled = [];
  const observer = (error) => unhandled.push(error);
  process.on('unhandledRejection', observer);
  try {
    value.subscribe(async () => {
      throw undefined;
    });
    assert.throws(
      () => value.set(2),
      (error) => error instanceof AggregateError && error.errors[0] instanceof TypeError,
    );
    assert.equal(value.value, 2);
    await new Promise(setImmediate);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', observer);
  }
});

test('custom equality and disposal during listener have explicit state', () => {
  const value = new ObservableValue({ id: 1 }, { equals: (a, b) => a.id === b.id });
  assert.equal(value.set({ id: 1 }), false);
  let lastCalled = false;
  value.subscribe(() => {
    value.dispose();
  });
  value.subscribe(() => {
    lastCalled = true;
  });
  value.set({ id: 2 });
  assert.equal(value.disposed, true);
  assert.equal(lastCalled, false);
  assert.equal(value.value.id, 2);
});
