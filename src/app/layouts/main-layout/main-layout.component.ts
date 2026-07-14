import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {PaywallDialogComponent} from '@features/billing/presentation/paywall-dialog/paywall-dialog.component';

@Component({
  selector: 'hg-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PaywallDialogComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly facade = inject(AuthFacade);

  readonly menuOpen = signal(false);
  readonly isAdmin = computed(() => this.facade.user()?.role === 'ADMIN');
  readonly initial = computed(() => this.facade.user()?.name?.charAt(0)?.toUpperCase() ?? '?');

  readonly nav = [
    {link: '/dashboard', label: 'Дашборд'},
    {link: '/learn', label: 'Учить'},
    {link: '/review', label: 'Повторение'},
    {link: '/immerse', label: 'Погружение'},
    {link: '/vocabulary', label: 'Словарь'},
  ];

  logout(): void {
    this.menuOpen.set(false);
    this.facade.logout();
  }
}
