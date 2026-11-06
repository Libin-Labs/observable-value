# @lp-labs/observable-value

Synchronous mutable snapshots with coalesced transactional notification batches.

## Install

```sh
npm install @lp-labs/observable-value
```

Zero runtime, peer, or sibling dependencies. Node 18+; strict TypeScript declarations and independent ESM/CommonJS builds. Version 0.1.0, MIT.

## Quickstart

```js
import { ObservableValue } from '@lp-labs/observable-value';
const value = new ObservableValue(0);
const off = value.subscribe((change) => console.log(change.previous, change.value));
value.batch(() => {
  value.set(1);
  value.update((n) => n + 1);
}); // 0 2
off();
value.dispose();
```

## API and contracts

set(value) and update(updater) return false for equal values and true for a changed
value (unless a listener failure throws after commit). update calls its updater
once with the current value. value is a readonly getter; mutate through set/update
so subscribers receive previous and final value snapshots.

set/update commit synchronously; equals defaults to Object.is and should be pure. subscribe does not emit immediately; unsubscribe is idempotent, duplicate function subscriptions deduplicate. Synchronous batch coalesces nested writes; body failure rolls back that batch's value and pending notification (shallow, not object mutation rollback). A final value equal to the initial value produces no event. Listener errors occur after commit, aggregate in AggregateError, and do not roll back; remaining listeners run. Reentrant set/update/batch during notification throws, avoiding unbounded loops. Added listeners wait until next emission; removed ones are skipped. dispose clears listeners and forbids further subscriptions/writes; reads remain available; disposal inside batch throws. Async callbacks/bodies are unsupported: use synchronous listeners and batch. No dependency graph, derived values, or message runtime. O(listeners) notification and snapshot memory; batch bookkeeping O(nesting depth).

Callbacks returning thenables fail explicitly with TypeError (aggregated for listeners); asynchronous continuations cannot be stopped. Batch rollback covers only synchronous writes and snapshots.

## Full declarations

The complete public declarations below are generated from the package's strict source. All runtime exports, interfaces, options, return types and readonly state are listed here.

<!-- declarations -->

```ts
export interface ValueChange<T> {
  readonly value: T;
  readonly previous: T;
}
export interface ObservableOptions<T> {
  equals?: (left: T, right: T) => boolean;
}
export declare class ObservableValue<T> {
  private current;
  private readonly equals;
  private readonly listeners;
  private depth;
  private dirty;
  private previous;
  private notifying;
  private closed;
  constructor(initial: T, options?: ObservableOptions<T>);
  get value(): T;
  get disposed(): boolean;
  private writable;
  set(value: T): boolean;
  update(updater: (value: T) => T): boolean;
  subscribe(listener: (change: ValueChange<T>) => void): () => void;
  private flush;
  batch<R>(operation: () => R): R;
  dispose(): void;
}
```

<!-- end declarations -->

## Development

```sh
npm ci --offline
npm run build
npm run typecheck
npm test
npm run format:check
```

All tests use deterministic clocks, immediate injected sleeps, or explicit promise gates rather than timing guesses. Package exports select ESM for import and CommonJS for require, with separate declaration trees. No runtime configuration files or global hooks.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
