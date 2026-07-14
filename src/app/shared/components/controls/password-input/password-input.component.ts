import {ChangeDetectionStrategy, Component, forwardRef, input, output} from '@angular/core';
import {FloatLabel} from "primeng/floatlabel";
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR} from "@angular/forms";
import {Password} from "primeng/password";

@Component({
    selector: 'app-password-input',
    standalone: true,
    imports: [
        FloatLabel,
        Password,
        FormsModule
    ],
    templateUrl: './password-input.component.html',
    styleUrl: './password-input.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PasswordInputComponent),
            multi: true
        }
    ],
})
export class PasswordInputComponent implements ControlValueAccessor {
    public placeholder = input<string>("Input your password...");
    public labelType = input<string>("in_label");
    public toggleMask = input<boolean>(true);
    public feedback = input<boolean>(false);
    public changed = output<string>();

    value: string = "";
    isDisabled: boolean = false;

    private propagateChange: any = () => {
    };
    private propagateTouched: any = () => {
    };

    registerOnChange(fn: any): void {
        this.propagateChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.propagateTouched = fn;
    }

    writeValue(value: string): void {
        this.value = value;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    onKeyup(password: any): void {
        this.value = password.target.value;
        const passwordValue = password.target.value;
        this.propagateChange(passwordValue);
        this.changed.emit(passwordValue);
    }

    onBlur(): void {
        this.propagateTouched();
    }
}
