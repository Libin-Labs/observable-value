import { ObservableValue, type ValueChange } from '@lp-labs/observable-value';
const value = new ObservableValue(0);
value.subscribe((change: ValueChange<number>) => {
  void change;
});
// @ts-expect-error value remains number
value.set('1');
// @ts-expect-error readonly snapshot
value.value = 2;
