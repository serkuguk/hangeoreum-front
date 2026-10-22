import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {AuthService, UserRole} from '@core/auth/auth.service';
import {RouterLink, RouterOutlet} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {HgSidebarComponent} from '@shared/components/sidebar/hg-sidebar.component';

@Component({
  selector: 'hg-admin-layout',
  imports: [RouterOutlet, RouterLink, HgSidebarComponent, TranslatePipe],
  template: `
    <div class="admin">
      <hg-sidebar [items]="sidebarItems()" [navLabel]="'navigation.admin' | translate"
                  [expandLabel]="'navigation.expandMenu' | translate" [collapseLabel]="'navigation.collapseMenu' | translate"
                  [footerItem]="{link: '/dashboard', label: ('admin.backToApp' | translate), icon: 'pi-arrow-left'}">
        <a class="logo han" routerLink="/dashboard">한걸음 <span>{{ 'admin.brand' | translate }}</span></a>
      </hg-sidebar>
      <main class="content">
        <router-outlet/>
      </main>
    </div>
  `,
  styles: `
    .admin { display: grid; grid-template-columns: auto minmax(0, 1fr); min-height: 100vh; }
    hg-sidebar {
      --sidebar-bg: var(--hg-ink-2);
      --sidebar-muted: var(--hg-muted);
      --sidebar-hover: var(--hg-card);
    }
    .logo { font-family: 'Gowun Batang', var(--hg-font-kr); font-weight: 700; font-size: 22px; color: var(--hg-yellow); text-decoration: none; white-space: nowrap; }
    .logo span { font-family: var(--hg-font-ui); font-size: 11px; color: var(--hg-muted); letter-spacing: 2px; text-transform: uppercase; }
    .content { padding: 30px; min-width: 0; }
    @media (max-width: 767px) { .content { padding: 20px 12px; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly nav = [
    {link: '/admin', label: 'admin.navigation.dashboard', icon: 'pi-home', exact: true, adminOnly: true},
    {link: '/admin/words', label: 'admin.navigation.words', icon: 'pi-book', exact: false},
    {link: '/admin/topics', label: 'admin.navigation.topics', icon: 'pi-tag', exact: false},
    {link: '/admin/course', label: 'admin.navigation.course', icon: 'pi-map', exact: false},
    {link: '/admin/alphabet', label: 'admin.navigation.alphabet', icon: 'pi-language', exact: false},
    {link: '/admin/grammar', label: 'admin.navigation.grammar', icon: 'pi-lightbulb', exact: false},
    {link: '/admin/media', label: 'admin.navigation.media', icon: 'pi-play-circle', exact: false},
    {link: '/admin/users', label: 'admin.navigation.users', icon: 'pi-users', exact: false, adminOnly: true},
    {link: '/admin/notifications', label: 'admin.navigation.notifications', icon: 'pi-bell', exact: false},
  ];
  private readonly labels = toSignal(inject(TranslateService).stream(this.nav.map(item => item.label)));
  readonly sidebarItems = computed(() => this.nav
    .filter(item => !item.adminOnly || this.auth.currentUser()?.role === UserRole.Admin)
    .map(item => ({...item, label: this.labels()?.[item.label] ?? item.label})));
}
