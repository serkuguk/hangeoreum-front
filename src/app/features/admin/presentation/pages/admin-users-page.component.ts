import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApi, AdminUser} from '../../infrastructure/admin.api';

@Component({
  selector: 'hg-admin-users-page',
  imports: [FormsModule],
  template: `
    <h2 class="pagettl">Пользователи</h2>
    <p class="pagesub">{{ total() }} зарегистрировано.</p>

    <div class="toolbar">
      <input class="search" type="search" placeholder="Поиск: имя или email…"
             [ngModel]="search()" (ngModelChange)="onSearch($event)">
    </div>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Регистрация</th><th></th></tr></thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="pill" [class.p-r]="user.role === 'ADMIN'" [class.p-b]="user.role === 'USER'">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ user.createdAt.slice(0, 10) }}</td>
              <td>
                <button type="button" class="rowbtn" (click)="toggleRole(user)">
                  {{ user.role === 'ADMIN' ? 'Сделать USER' : 'Сделать ADMIN' }}
                </button>
                <button type="button" class="rowbtn danger" (click)="block(user)">Заблокировать</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Никого не нашли.</td></tr>
          }
        </tbody>
      </table>
      @if (totalPages() > 1) {
        <div class="pager">
          <button type="button" class="rowbtn" [disabled]="page() === 0" (click)="page.set(page() - 1); load()">←</button>
          {{ page() + 1 }} / {{ totalPages() }}
          <button type="button" class="rowbtn" [disabled]="page() + 1 >= totalPages()" (click)="page.set(page() + 1); load()">→</button>
        </div>
      }
    </div>
  `,
  styleUrl: './_admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private api = inject(AdminApi);

  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly search = signal('');
  readonly error = signal<string | null>(null);

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.api.users(this.search(), this.page()).subscribe({
      next: result => {
        this.users.set(result.content);
        this.total.set(result.totalElements);
      },
      error: () => this.error.set('Не получилось загрузить пользователей.'),
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  toggleRole(user: AdminUser): void {
    const role = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Сменить роль ${user.email} на ${role}?`)) return;
    this.api.patchUser(user.id, {role}).subscribe(() => this.load());
  }

  block(user: AdminUser): void {
    if (!confirm(`Заблокировать ${user.email}?`)) return;
    this.api.patchUser(user.id, {isActive: false}).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось заблокировать.'),
    });
  }
}
