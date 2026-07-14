import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output
} from '@angular/core';
import {MultiSelect} from "primeng/multiselect";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {FormValueControl} from "@angular/forms/signals";
import {ControlItemInterface, Value} from "@shared/types/frontend/types/control-item-interface";

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [MultiSelect, ReactiveFormsModule],
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelectComponent implements FormValueControl<Value[]> {

  public items = input<ControlItemInterface[]>([]);
  public disabledValue = input<any[]>([]);
  public placeholder = input<string>("Select sum items...");
  public selectedItemsLabel = input<string>();
  public lengthTextSelected = input<number>(20);
  public filter = input<boolean>(false);
  public displaySelectedLabel = input<boolean>(false);
  public emptyOption = input<boolean>(false);
  public showClear = input<boolean>();
  public withIcons = input<boolean>(false);
  public resetFilterOnHide = input<boolean>(true);
  public nullOrZero = input<number | null>(null);
  public labelType = input<string>("in_label");
  public showIcon = input<boolean>(false);
  public virtualScroll = input<boolean>(false);
  public maxSelectedLabels = input<number>(2);
  public style = input<Record<string, string> | undefined>();
  public disabled = input<boolean>(false);
  public changed = output<Value[]>();
  public value = model<Value[]>([]);
  public touched = model<boolean>(false);
  protected readonly multiSelectControl = new FormControl<Value[]>([], {nonNullable: true});
  protected readonly selectedItems = computed(() => {
    const suffix = this.selectedItemsLabel()?.trim();
    return suffix ? `Selecionado {0} ${suffix}` : undefined;
  });

  constructor() {
    effect(() => {
      const currentValue = this.value();
      if (this.multiSelectControl.value !== currentValue) {
        this.multiSelectControl.setValue(currentValue, {emitEvent: false});
      }
    });

    effect(() => {
      if (this.disabled()) {
        this.multiSelectControl.disable({emitEvent: false});
        return;
      }

      this.multiSelectControl.enable({emitEvent: false});
    });
  }

  onBlur(): void {
    this.touched.set(true);
  }

  onChanged(event: { value: Value[] }): void {
    const nextValue = event.value ?? [];
    this.multiSelectControl.setValue(nextValue, {emitEvent: false});
    this.value.set(nextValue);
    this.changed.emit(nextValue);
  }
}
