import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormField, form, required, email} from '@angular/forms/signals';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {ButtonComponent, BasicInputComponent, FormFieldComponent} from 'springest';
import {AuthFacade} from '../../../application/facades/auth.facade';

@Component({
  selector: 'hg-forgot-password-page',
  imports: [FormField, FormFieldComponent, RouterLink, ButtonComponent, BasicInputComponent, TranslatePipe],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  readonly facade = inject(AuthFacade);
  readonly model = signal({email: ''});
  readonly submitted = signal(false);
  readonly form = form(this.model, path => {
    required(path.email);
    email(path.email);
  });

  constructor() {
    this.facade.beginPasswordRecovery();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.facade.loading()) return;
    if (this.form().invalid()) {
      this.form.email().markAsTouched();
      return;
    }
    this.facade.requestPasswordReset(this.model().email);
  }
}
