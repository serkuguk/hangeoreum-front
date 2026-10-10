import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormField, form, required, email, minLength, maxLength, validate} from '@angular/forms/signals';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ButtonComponent, BasicInputComponent, PasswordInputComponent, CheckboxComponent, FormFieldComponent} from 'springest';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-register-page',
  imports: [FormField, FormFieldComponent, PasswordInputComponent, RouterLink, ButtonComponent, CheckboxComponent, BasicInputComponent, TranslatePipe],
  templateUrl: './register-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  readonly facade = inject(AuthFacade);

  readonly model = signal({name: '', email: '', password: '', consent: false});
  readonly submitted = signal(false);
  readonly form = form(this.model, path => {
    required(path.name);
    maxLength(path.name, 100);
    required(path.email);
    email(path.email);
    required(path.password);
    minLength(path.password, 8);
    validate(path.consent, ({value}) => value() ? null : {kind: 'required'});
  });

  submit(): void {
    this.submitted.set(true);
    if (this.facade.loading()) return;
    if (this.form().invalid()) {
      this.form.name().markAsTouched();
      this.form.email().markAsTouched();
      this.form.password().markAsTouched();
      this.form.consent().markAsTouched();
      return;
    }
    const {name, email, password} = this.model();
    this.facade.register(name, email, password);
  }
}
