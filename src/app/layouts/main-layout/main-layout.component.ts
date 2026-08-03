import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {PaywallDialogComponent} from '@features/billing/presentation/paywall-dialog/paywall-dialog.component';
import {HgButtonComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PaywallDialogComponent, HgButtonComponent],
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
    {link: '/dashboard', label: 'Сегодня', icon: 'pi-home'},
    {link: '/learn', label: 'Курс', icon: 'pi-map'},
    {link: '/review', label: 'Повторить', icon: 'pi-refresh'},
    {link: '/immerse', label: 'Погружение', icon: 'pi-play-circle'},
    {link: '/vocabulary', label: 'Словарь', icon: 'pi-book'},
  ];

  logout(): void {
    this.menuOpen.set(false);
    this.facade.logout();
  }
}
