import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {HgButtonComponent, HgInputComponent} from '@shared/components/controls';
import {AuthFacade} from '../../../application/facades/auth.facade';

@Component({
  selector: 'hg-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, HgButtonComponent, HgInputComponent, TranslatePipe],
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

  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmation: ['', Validators.required],
  }, {validators: passwordsMatch});

  constructor() {
    this.facade.beginPasswordRecovery();
    if (this.route.snapshot.fragment !== null) {
      void this.router.navigate([], {relativeTo: this.route, fragment: undefined, replaceUrl: true});
    }
  }

  submit(): void {
    if (!this.token || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.confirmPasswordReset(this.token, this.form.controls.password.value);
  }

  invalidPassword(): boolean {
    const control = this.form.controls.password;
    return control.touched && control.invalid;
  }

  invalidConfirmation(): boolean {
    const control = this.form.controls.confirmation;
    return control.touched && (control.invalid || this.form.hasError('passwordMismatch'));
  }
}

function readToken(fragment: string | null): string | null {
  const token = fragment ? new URLSearchParams(fragment).get('token')?.trim() : null;
  return token || null;
}

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const {password, confirmation} = control.value as {password: string; confirmation: string};
  return password === confirmation ? null : {passwordMismatch: true};
}
