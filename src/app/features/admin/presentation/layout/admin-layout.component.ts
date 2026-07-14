import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';

@Component({
  selector: 'hg-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin">
      <aside class="sidebar">
        <a class="logo han" routerLink="/dashboard">한걸음 <span>admin</span></a>
        <nav>
          @for (item of nav; track item.link) {
            <a [routerLink]="item.link" [routerLinkActiveOptions]="{exact: item.exact}"
               routerLinkActive="is-active">{{ item.icon }} {{ item.label }}</a>
          }
        </nav>
        <a class="back" routerLink="/dashboard">← Вернуться в приложение</a>
      </aside>
      <main class="content">
        <router-outlet/>
      </main>
    </div>
  `,
  styles: `
    .admin {
      display: grid;
      grid-template-columns: 230px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      background: var(--hg-ink-2);
      border-right: 1px solid var(--hg-line);
      padding: 22px 14px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;

      .logo {
        font-size: 22px;
        color: var(--hg-yellow);
        text-decoration: none;
        padding: 0 10px;

        span { font-family: var(--hg-font-ui); font-size: 11px; color: var(--hg-muted); letter-spacing: 2px; text-transform: uppercase; }
      }

      nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;

        a {
          color: var(--hg-muted);
          text-decoration: none;
          font-size: 13.5px;
          padding: 10px 12px;
          border-radius: 10px;
          transition: .15s;

          &:hover { color: var(--hg-txt); background: var(--hg-card); }
          &.is-active { background: var(--hg-blue); color: #fff; }
        }
      }

      .back { color: var(--hg-muted); font-size: 12.5px; text-decoration: none; padding: 0 10px; }
    }

    .content { padding: 30px; min-width: 0; }

    @media (max-width: 860px) {
      .admin { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; }
      .sidebar nav { flex-direction: row; flex-wrap: wrap; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  readonly nav = [
    {link: '/admin', label: 'Дашборд', icon: '📊', exact: true},
    {link: '/admin/words', label: 'Слова', icon: '📚', exact: false},
    {link: '/admin/topics', label: 'Темы', icon: '🏷️', exact: false},
    {link: '/admin/course', label: 'Курс и уроки', icon: '🗺️', exact: false},
    {link: '/admin/alphabet', label: 'Алфавит', icon: '가', exact: false},
    {link: '/admin/grammar', label: 'Грамматика', icon: '💡', exact: false},
    {link: '/admin/media', label: 'Медиа / Story', icon: '🎬', exact: false},
    {link: '/admin/users', label: 'Пользователи', icon: '👥', exact: false},
    {link: '/admin/notifications', label: 'Уведомления', icon: '📣', exact: false},
  ];
}
