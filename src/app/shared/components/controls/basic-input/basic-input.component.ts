import {ChangeDetectionStrategy, Component, effect, input, model, output, signal} from '@angular/core';
import {InputTextModule} from 'primeng/inputtext';
import {FormControl} from "@angular/forms";
import {FormValueControl} from "@angular/forms/signals";
import {FloatLabel} from "primeng/floatlabel";

@Component({
    selector: 'app-basic-input',
    standalone: true,
    imports: [InputTextModule, FloatLabel],
    templateUrl: './basic-input.component.html',
    styleUrl: './basic-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BasicInputComponent implements FormValueControl<string> {
    public placeholder = input<string>("Input some text...");
    public labelType = input<string>("in_label");
    public floatLabel = input<boolean>(true);
    public icon = input<string | null>(null);
    public control = input<FormControl<string | null> | FormControl<string> | null>(null);
    public disabled = input<boolean>(false);
    public changed = output<string>();
    public value = model<string>('');
    public touched = model<boolean>(false);

    protected readonly isDisabled = signal(false);

    constructor() {
        effect((onCleanup) => {
            const formControl = this.control();
            if (!formControl) {
                this.isDisabled.set(this.disabled());
                return;
            }

            this.value.set(this.normalizeValue(formControl.value));
            this.touched.set(formControl.touched);
            this.isDisabled.set(formControl.disabled);

            const valueSub = formControl.valueChanges.subscribe((nextValue) => {
                this.value.set(this.normalizeValue(nextValue));
            });

            const statusSub = formControl.statusChanges.subscribe(() => {
                this.isDisabled.set(formControl.disabled);
                this.touched.set(formControl.touched);
            });

            onCleanup(() => {
                valueSub.unsubscribe();
                statusSub.unsubscribe();
            });
        });

        effect(() => {
            if (this.control()) {
                return;
            }

            this.isDisabled.set(this.disabled());
        });
    }

    onInput(event: Event): void {
        const nextValue = (event.target as HTMLInputElement).value;
        this.value.set(nextValue);

        const formControl = this.control();
        if (formControl && formControl.value !== nextValue) {
            formControl.setValue(nextValue);
        }

        this.changed.emit(nextValue);
    }

    onBlur(): void {
        this.touched.set(true);
        this.control()?.markAsTouched();
    }

    private normalizeValue(value: string | null | undefined): string {
        return value ?? '';
    }
}
