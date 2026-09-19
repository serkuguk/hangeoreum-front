import {ChangeDetectionStrategy, Component, inject, OnDestroy} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {HgButtonComponent, HgInputComponent} from '@shared/components/controls';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-login-page',
  imports: [ReactiveFormsModule, RouterLink, HgButtonComponent, HgInputComponent, TranslatePipe],
  templateUrl: './login-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent implements OnDestroy {
  readonly facade = inject(AuthFacade);
  readonly passwordChanged = inject(Router).getCurrentNavigation()?.extras.state?.['passwordReset'] === true;

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.facade.beginLogin();
  }

  ngOnDestroy(): void {
    this.facade.endLogin();
  }

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
