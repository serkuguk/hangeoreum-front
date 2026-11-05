import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {AuthService, UserRole} from '@core/auth/auth.service';
import {RouterLink, RouterOutlet} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {HgSidebarComponent} from '@shared/components/sidebar/hg-sidebar.component';

@Component({
  selector: 'hg-admin-layout',
  imports: [RouterOutlet, RouterLink, HgSidebarComponent, TranslatePipe],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
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
