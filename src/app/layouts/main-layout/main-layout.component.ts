import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {PaywallDialogComponent} from '@features/billing/presentation/paywall-dialog/paywall-dialog.component';
import {ButtonComponent} from 'springest';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {HgSidebarComponent} from '@shared/components/sidebar/hg-sidebar.component';

@Component({
  selector: 'hg-main-layout',
  imports: [RouterOutlet, RouterLink, HgSidebarComponent, PaywallDialogComponent, ButtonComponent, TranslatePipe],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly facade = inject(AuthFacade);

  readonly menuOpen = signal(false);
  readonly canAccessAdmin = computed(() => ['ADMIN', 'EDITOR'].includes(this.facade.user()?.role ?? ''));
  readonly initial = computed(() => this.facade.user()?.name?.charAt(0)?.toUpperCase() ?? '?');

  readonly nav = [
    {link: '/dashboard', label: 'navigation.dashboard', icon: 'pi-home'},
    {link: '/learn', label: 'navigation.learn', icon: 'pi-map'},
    {link: '/review', label: 'navigation.review', icon: 'pi-refresh'},
    {link: '/immerse', label: 'navigation.immerse', icon: 'pi-play-circle'},
    {link: '/vocabulary', label: 'navigation.vocabulary', icon: 'pi-book'},
  ];

  private readonly labels = toSignal(inject(TranslateService).stream(this.nav.map(item => item.label)));
  readonly sidebarItems = computed(() => this.nav.map(item => ({...item, label: this.labels()?.[item.label] ?? item.label})));

  logout(): void {
    this.menuOpen.set(false);
    this.facade.logout();
  }
}
