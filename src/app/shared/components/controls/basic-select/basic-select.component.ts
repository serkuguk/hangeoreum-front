import {ChangeDetectionStrategy, Component, input, linkedSignal, model, output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Select} from "primeng/select";
import {FloatLabel} from "primeng/floatlabel";
import {FormValueControl} from "@angular/forms/signals";

@Component({
  selector: 'app-basic-select',
  imports: [
    Select,
    FormsModule,
    FloatLabel
  ],
  templateUrl: './basic-select.component.html',
  styleUrl: './basic-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicSelectComponent implements FormValueControl<any | null> {
  public items = input<any[]>();
  public class = input<string>();
  public disabledValue = input<any[]>([]);
  public placeholder = input<string>("Select sum items...");
  public lengthTextSelected = input<number>(20);
  public filter = input<boolean>(false);
  public emptyOption = input<boolean>(false);
  public showClear = input<boolean>();
  public withIcons = input<boolean>(false);
  public resetFilterOnHide = input<boolean>(true);
  public nullOrZero = input<number | null>(null);
  public labelType = input<string>("in_label");
  public showIcon = input<boolean>(false);
  public changed = output<number | string>();
  public showClearState = linkedSignal(() => this.showClear);
  public isDisabled= input<boolean>(false);
  public value = model<any[]>([]);
  public touched = model<boolean>(false);
  public closed = output<void>();

  onChanged(event: any | null): void {
    this.value.set(event);
    this.changed.emit(event);
  }

  onClosed(): void {
    this.touched.set(true);
    this.closed.emit();
  }
}
