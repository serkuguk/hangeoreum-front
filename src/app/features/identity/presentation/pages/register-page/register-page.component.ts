import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';

@Component({
  selector: 'hg-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  readonly facade = inject(AuthFacade);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    consent: [false, Validators.requiredTrue],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const {name, email, password} = this.form.getRawValue();
    this.facade.register(name, email, password);
  }

  invalid(name: 'name' | 'email' | 'password' | 'consent'): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }
}
