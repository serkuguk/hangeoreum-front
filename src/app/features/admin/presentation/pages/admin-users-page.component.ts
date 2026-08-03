import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {HgButtonComponent, HgInputComponent, HgPaginationComponent} from '@shared/components/controls';
import {AdminApi, AdminUser} from '../../infrastructure/admin.api';

@Component({
  selector: 'hg-admin-users-page',
  imports: [FormsModule, HgButtonComponent, HgInputComponent, HgPaginationComponent],
  template: `
    <h2 class="pagettl">Пользователи</h2>
    <p class="pagesub">{{ total() }} зарегистрировано.</p>

    <div class="toolbar">
      <hg-input class="search" type="search" label="Поиск пользователей"
                placeholder="Имя или email…" [ngModel]="search()"
                (ngModelChange)="onSearch($event)" />
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
                <hg-button size="sm" variant="ghost"
                           [label]="user.role === 'ADMIN' ? 'Сделать USER' : 'Сделать ADMIN'"
                           (pressed)="toggleRole(user)" />
                <hg-button size="sm" variant="danger" label="Заблокировать"
                           (pressed)="block(user)" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Никого не нашли.</td></tr>
          }
        </tbody>
      </table>
      @if (totalPages() > 1) {
        <hg-pagination [page]="page()" [totalPages]="totalPages()"
                       ariaLabel="Страницы пользователей" (pageChange)="goToPage($event)" />
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

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => this.api.users(search, 0).pipe(
        catchError(() => {
          this.error.set('Не получилось загрузить пользователей.');
          return EMPTY;
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(result => {
      this.users.set(result.content);
      this.total.set(result.totalElements);
      this.error.set(null);
    });
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
    this.search$.next(value);
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  toggleRole(user: AdminUser): void {
    const role = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Сменить роль ${user.email} на ${role}?`)) return;
    this.api.patchUser(user.id, {role}).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось сменить роль.'),
    });
  }

  block(user: AdminUser): void {
    if (!confirm(`Заблокировать ${user.email}?`)) return;
    this.api.patchUser(user.id, {isActive: false}).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось заблокировать.'),
    });
  }
}
