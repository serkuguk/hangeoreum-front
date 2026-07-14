import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    effect,
    inject,
    input,
} from '@angular/core';
import {AbstractControl} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {startWith} from "rxjs/operators";
import {merge} from "rxjs";

@Component({
    selector: 'app-form-field',
    imports: [
        TranslateModule
    ],
    templateUrl: './form-field.component.html',
    styleUrl: './form-field.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
    private readonly cdr = inject(ChangeDetectorRef);

    label = input<string>();
    required = input<boolean>(false);
    isInline = input<boolean>(true);
    showLabel = input<boolean>(false);
    field = input.required<unknown>();
    patternError = input<string>();

    constructor() {
        effect(() => {
            const control = this.field();
            if (!this.isAbstractControl(control)) return;

            const sub = merge(control.statusChanges, control.valueChanges)
                .pipe(startWith(null))
                .subscribe(() => this.cdr.markForCheck());

            return () => sub.unsubscribe();
        });

        effect(() => {
            const fieldState = this.getSignalFieldState(this.field());
            if (!fieldState) return;

            fieldState.invalid();
            fieldState.touched();
            fieldState.errors();

            this.cdr.markForCheck();
        });
    }

    hasError(): boolean {
        const control = this.field();

        if (this.isAbstractControl(control)) {
            return control.invalid && control.touched;
        }

        const fieldState = this.getSignalFieldState(control);
        return !!fieldState && fieldState.invalid() && fieldState.touched();
    }

    get errorKey() {
        const control = this.field();

        if (this.isAbstractControl(control)) {
            const errs = control.errors ?? null;
            return errs ? Object.keys(errs)[0] : null;
        }

        const fieldState = this.getSignalFieldState(control);
        const firstError = fieldState?.errors()?.[0];
        if (!firstError) return null;

        if (firstError.kind === 'minLength') return 'minlength';
        if (firstError.kind === 'maxLength') return 'maxlength';

        return firstError.kind ?? null;
    }

    get errorValue(): any {
        const key = this.errorKey;
        if (!key) return null;

        const control = this.field();

        if (this.isAbstractControl(control)) {
            return control.errors?.[key] ?? null;
        }

        const fieldState = this.getSignalFieldState(control);
        return fieldState?.errors()?.[0] ?? null;
    }

    private isAbstractControl(value: unknown): value is AbstractControl {
        return !!value
            && typeof value === 'object'
            && 'valueChanges' in value
            && 'statusChanges' in value;
    }

    private getSignalFieldState(value: unknown): {
        invalid: () => boolean;
        touched: () => boolean;
        errors: () => readonly any[];
    } | null {
        const candidate = typeof value === 'function' ? value() : value;
        if (!candidate || typeof candidate !== 'object') return null;

        const state = candidate as {
            invalid?: unknown;
            touched?: unknown;
            errors?: unknown;
        };

        if (typeof state.invalid !== 'function') return null;
        if (typeof state.touched !== 'function') return null;
        if (typeof state.errors !== 'function') return null;

        return state as {
            invalid: () => boolean;
            touched: () => boolean;
            errors: () => readonly any[];
        };
    }
}
