import {signal} from '@angular/core';
import {ControlValueAccessor} from '@angular/forms';

export abstract class HgControlValueAccessor<T> implements ControlValueAccessor {
  readonly value = signal<T>(this.initialValue);
  readonly formDisabled = signal(false);
  private onChange: (value: T) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected constructor(private readonly initialValue: T) {}
  writeValue(value: T | null | undefined): void { this.value.set(value ?? this.initialValue); }
  registerOnChange(fn: (value: T) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }
  protected updateValue(value: T): void { this.value.set(value); this.onChange(value); }
  markTouched(): void { this.onTouched(); }
}
