import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {HgButtonComponent, HgInputComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-login-page',
  imports: [ReactiveFormsModule, RouterLink, HgButtonComponent, HgInputComponent],
  templateUrl: './login-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  readonly facade = inject(AuthFacade);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const {email, password} = this.form.getRawValue();
    this.facade.login(email, password);
  }

  invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
}
