import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {HgButtonComponent, HgInputComponent} from '@shared/components/controls';
import {AuthFacade} from '../../../application/facades/auth.facade';

@Component({
  selector: 'hg-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, HgButtonComponent, HgInputComponent, TranslatePipe],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  readonly facade = inject(AuthFacade);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.facade.beginPasswordRecovery();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.requestPasswordReset(this.form.controls.email.value);
  }

  invalidEmail(): boolean {
    const control = this.form.controls.email;
    return control.touched && control.invalid;
  }
}
