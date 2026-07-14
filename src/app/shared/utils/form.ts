import {FormGroup} from "@angular/forms";

export const markFormGroupTouched = (formGroup: FormGroup) => {
    (Object as any).values(formGroup.controls).forEach((control: FormGroup) => {
        control.markAsTouched();

        if (control.controls) {
            markFormGroupTouched(control);
        }
    });
};


/*export const markFormGroupTouched = (formGroup: any) => {
    for (const inner in formGroup.controls) {
        if (formGroup.controls.hasOwnProperty(inner)) {
            const control = formGroup.get(inner);

            if (control instanceof FormGroup) {
                markFormGroupTouched(control);
            } else {
                control.markAsTouched({ onlySelf: true });
                control.markAsDirty({ onlySelf: true });
                control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
            }
        }
    }
};*/

