import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {PaywallDialogComponent} from '@features/billing/presentation/paywall-dialog/paywall-dialog.component';
import {HgButtonComponent} from '@shared/components/controls';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PaywallDialogComponent, HgButtonComponent, TranslatePipe],
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
    {link: '/dashboard', label: 'navigation.dashboard', icon: 'pi-home'},
    {link: '/learn', label: 'navigation.learn', icon: 'pi-map'},
    {link: '/review', label: 'navigation.review', icon: 'pi-refresh'},
    {link: '/immerse', label: 'navigation.immerse', icon: 'pi-play-circle'},
    {link: '/vocabulary', label: 'navigation.vocabulary', icon: 'pi-book'},
  ];

  logout(): void {
    this.menuOpen.set(false);
    this.facade.logout();
  }
}
