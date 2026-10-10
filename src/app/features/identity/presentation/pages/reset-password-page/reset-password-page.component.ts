import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormField, form, required, minLength, maxLength, validate} from '@angular/forms/signals';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {ButtonComponent, PasswordInputComponent, FormFieldComponent} from 'springest';
import {AuthFacade} from '../../../application/facades/auth.facade';

@Component({
  selector: 'hg-reset-password-page',
  imports: [FormField, FormFieldComponent, PasswordInputComponent, RouterLink, ButtonComponent, TranslatePipe],
  templateUrl: './reset-password-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  readonly facade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly token = readToken(this.route.snapshot.fragment);
  readonly missingToken = signal(!this.token);

  readonly model = signal({password: '', confirmation: ''});
  readonly submitted = signal(false);
  readonly form = form(this.model, path => {
    required(path.password);
    minLength(path.password, 8);
    maxLength(path.password, 100);
    required(path.confirmation);
    validate(path.confirmation, ({value, valueOf}) => value() === valueOf(path.password) ? null : {kind: 'passwordMismatch'});
  });

  constructor() {
    this.facade.beginPasswordRecovery();
    if (this.route.snapshot.fragment !== null) {
      void this.router.navigate([], {relativeTo: this.route, fragment: undefined, replaceUrl: true});
    }
  }

  submit(): void {
    this.submitted.set(true);
    if (this.facade.loading()) return;
    if (!this.token || this.form().invalid()) {
      this.form.password().markAsTouched();
      this.form.confirmation().markAsTouched();
      return;
    }
    this.facade.confirmPasswordReset(this.token, this.model().password);
  }


}

function readToken(fragment: string | null): string | null {
  const token = fragment ? new URLSearchParams(fragment).get('token')?.trim() : null;
  return token || null;
}
