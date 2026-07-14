import {AbstractControl, ValidatorFn} from "@angular/forms";

export function validateStartWith(forbiddenLetter: string): ValidatorFn {
  return (control: AbstractControl) => {
    return control.value.startsWith(forbiddenLetter)
      ? {startsWith: {message: `${forbiddenLetter} - last letter of the alphabet!`}}
      : null
  }
}
