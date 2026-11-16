import {ChangeDetectionStrategy, Component, inject, OnDestroy, signal} from '@angular/core';
import {FormField, form, required, email} from '@angular/forms/signals';
import {Router, RouterLink} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {ButtonComponent, BasicInputComponent, PasswordInputComponent, FormFieldComponent} from 'springest';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-login-page',
  imports: [FormField, FormFieldComponent, PasswordInputComponent, RouterLink, ButtonComponent, BasicInputComponent, TranslatePipe],
  templateUrl: './login-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent implements OnDestroy {
  readonly facade = inject(AuthFacade);
  private readonly navigationState = inject(Router).getCurrentNavigation()?.extras.state;
  readonly passwordChanged = this.navigationState?.['passwordReset'] === true;
  readonly emailVerified = this.navigationState?.['emailVerified'] === true;

  readonly model = signal({email: '', password: ''});
  readonly submitted = signal(false);
  readonly form = form(this.model, path => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  constructor() {
    this.facade.beginLogin();
  }

  ngOnDestroy(): void {
    this.facade.endLogin();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.facade.loading()) return;
    if (this.form().invalid()) {
      this.form.email().markAsTouched();
      this.form.password().markAsTouched();
      return;
    }
    const {email, password} = this.model();
    this.facade.login(email, password, this.emailVerified);
  }
}
