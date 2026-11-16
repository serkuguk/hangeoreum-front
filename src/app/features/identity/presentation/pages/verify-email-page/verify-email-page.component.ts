import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';

/** Цель ссылки из письма: подтверждает email и отправляет на вход. */
@Component({
  selector: 'hg-verify-email-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './verify-email-page.component.html',
  styleUrl: '../_auth-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent {
  readonly facade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly token = readToken(this.route.snapshot.fragment);
  readonly missingToken = !this.token;

  constructor() {
    this.facade.beginRegistration();
    if (this.route.snapshot.fragment !== null) {
      // токен не должен оставаться в адресной строке и истории
      void this.router.navigate([], {relativeTo: this.route, fragment: undefined, replaceUrl: true});
    }
    if (this.token) this.facade.confirmEmail(this.token);
  }
}

function readToken(fragment: string | null): string | null {
  const token = fragment ? new URLSearchParams(fragment).get('token')?.trim() : null;
  return token || null;
}
