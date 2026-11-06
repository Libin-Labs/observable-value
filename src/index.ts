export interface ValueChange<T> {
  readonly value: T;
  readonly previous: T;
}
export interface ObservableOptions<T> {
  equals?: (left: T, right: T) => boolean;
}
function assertSynchronous(result: unknown): void {
  if (
    result !== null &&
    (typeof result === 'object' || typeof result === 'function') &&
    typeof (result as { then?: unknown }).then === 'function'
  ) {
    void Promise.resolve(result).catch(() => {});
    throw new TypeError('Observable callbacks must be synchronous');
  }
}
export class ObservableValue<T> {
  private current: T;
  private readonly equals: (left: T, right: T) => boolean;
  private readonly listeners = new Set<(change: ValueChange<T>) => void>();
  private depth = 0;
  private dirty = false;
  private previous!: T;
  private notifying = false;
  private closed = false;
  constructor(initial: T, options: ObservableOptions<T> = {}) {
    this.current = initial;
    this.equals = options.equals ?? Object.is;
  }
  get value(): T {
    return this.current;
  }
  get disposed(): boolean {
    return this.closed;
  }
  private writable(): void {
    if (this.closed) throw new Error('Observable disposed');
    if (this.notifying) throw new Error('Reentrant mutation is not allowed');
  }
  set(value: T): boolean {
    this.writable();
    if (this.equals(this.current, value)) return false;
    if (!this.dirty) this.previous = this.current;
    this.current = value;
    this.dirty = true;
    if (this.depth === 0) this.flush();
    return true;
  }
  update(updater: (value: T) => T): boolean {
    this.writable();
    return this.set(updater(this.current));
  }
  subscribe(listener: (change: ValueChange<T>) => void): () => void {
    if (this.closed) throw new Error('Observable disposed');
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    if (this.equals(this.previous, this.current)) return;
    const change = Object.freeze({ value: this.current, previous: this.previous });
    const errors: unknown[] = [];
    this.notifying = true;
    try {
      for (const listener of [...this.listeners]) {
        if (!this.listeners.has(listener)) continue;
        try {
          assertSynchronous(listener(change));
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      this.notifying = false;
    }
    if (errors.length) throw new AggregateError(errors, 'Observable listeners failed');
  }
  batch<R>(operation: () => R): R {
    this.writable();
    const start = this.current;
    const oldDirty = this.dirty;
    const oldPrevious = this.previous;
    this.depth++;
    let value!: R;
    try {
      value = operation();
      assertSynchronous(value);
    } catch (error) {
      this.current = start;
      this.dirty = oldDirty;
      this.previous = oldPrevious;
      throw error;
    } finally {
      this.depth--;
    }
    if (this.depth === 0) this.flush();
    return value;
  }
  dispose(): void {
    if (this.depth > 0) throw new Error('Cannot dispose inside a batch');
    this.closed = true;
    this.listeners.clear();
  }
}
