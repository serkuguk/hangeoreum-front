import {ChangeDetectionStrategy, Component, effect, input, model, output} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {FormValueControl} from '@angular/forms/signals';
import {CheckboxModule} from 'primeng/checkbox';

@Component({
    selector: 'app-checkbox',
    standalone: true,
    imports: [CheckboxModule, ReactiveFormsModule],
    templateUrl: './checkbox.component.html',
    styleUrl: './checkbox.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent implements FormValueControl<boolean> {
    public label = input<string>('');
    public binary = input<boolean>(true);
    public disabled = input<boolean>(false);
    public readonly = input<boolean>(false);
    public changed = output<boolean>();
    public value = model<boolean>(false);
    public touched = model<boolean>(false);

    protected readonly checkboxControl = new FormControl<boolean>(false, {nonNullable: true});

    constructor() {
        effect(() => {
            const currentValue = this.value();
            if (this.checkboxControl.value !== currentValue) {
                this.checkboxControl.setValue(currentValue, {emitEvent: false});
            }
        });

        effect(() => {
            if (this.disabled()) {
                this.checkboxControl.disable({emitEvent: false});
                return;
            }

            this.checkboxControl.enable({emitEvent: false});
        });
    }

    onValueChange(checked: boolean): void {
        this.checkboxControl.setValue(checked, {emitEvent: false});
        this.value.set(checked);
        this.changed.emit(checked);
    }

    onBlur(): void {
        this.touched.set(true);
    }
}
