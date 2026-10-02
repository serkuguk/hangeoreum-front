import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '@core/auth/auth.service';
import {HgButtonComponent, HgDialogComponent, HgInputComponent, HgPaginationComponent, HgSelectComponent} from '@shared/components/controls';
import {AdminApi, AdminUser} from '../../infrastructure/admin.api';

type EditableRole = 'USER' | 'EDITOR';
type UserAction = {user: AdminUser; kind: 'role'; role: EditableRole} | {user: AdminUser; kind: 'status' | 'delete'};

@Component({
  selector: 'hg-admin-users-page',
  imports: [FormsModule, HgButtonComponent, HgDialogComponent, HgInputComponent, HgPaginationComponent, HgSelectComponent],
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
                @if (canEditRole(user)) {
                  <hg-select class="role-select" [ariaLabel]="'Роль ' + user.email"
                             [options]="roleOptions" placeholder=""
                             [ngModel]="selectedRoles()[user.id] || user.role"
                             (ngModelChange)="openRoleAction(user, $event)" />
                } @else {
                  <span class="pill" [class.p-r]="user.role === 'ADMIN'" [class.p-b]="user.role === 'USER'">
                    {{ user.role }}
                  </span>
                }
              </td>
              <td>{{ user.createdAt.slice(0, 10) }}</td>
              <td class="user-actions">
                @if (isAdmin() && user.id !== auth.currentUser()?.id && user.role !== 'ADMIN') {
                  <div class="user-actions__buttons">
                  <hg-button size="sm" [variant]="user.isActive ? 'danger' : 'secondary'"
                             [label]="user.isActive ? 'Заблокировать' : 'Разблокировать'"
                             (pressed)="openAction(user, 'status')" />
                  <hg-button size="sm" variant="danger" label="Удалить"
                             (pressed)="openAction(user, 'delete')" />
                  </div>
                }
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

    <hg-dialog [visible]="action() !== null" (visibleChange)="onDialogVisibleChange($event)"
               [title]="actionTitle()" [closable]="!saving()">
      <p>{{ actionMessage() }}</p>
      @if (actionError()) {
        <div class="errbar" role="alert">{{ actionError() }}</div>
      }
      <div dialog-actions>
        <hg-button [label]="action()?.kind === 'delete' ? 'Удалить' : 'Подтвердить'"
                   [variant]="action()?.kind === 'delete' ? 'danger' : 'primary'"
                   [loading]="saving()" (pressed)="confirmAction()" />
        <hg-button label="Отмена" variant="ghost" [disabled]="saving()"
                   (pressed)="closeAction()" />
      </div>
    </hg-dialog>
  `,
  styleUrl: './_admin.scss',
  styles: `
    .user-actions { min-width: 15rem; }
    .role-select { display: inline-block; min-width: 9rem; }
    .user-actions__buttons { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; }
    :host .panel { overflow-x: auto; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private api = inject(AdminApi);
  readonly auth = inject(AuthService);

  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly search = signal('');
  readonly error = signal<string | null>(null);
  readonly action = signal<UserAction | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly selectedRoles = signal<Record<string, EditableRole>>({});
  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');
  readonly roleOptions = [{label: 'USER', value: 'USER'}, {label: 'EDITOR', value: 'EDITOR'}] as const;

  readonly actionTitle = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === 'delete') return 'Удалить пользователя';
    if (action.kind === 'role') return 'Сменить роль';
    return action.user.isActive ? 'Заблокировать пользователя' : 'Разблокировать пользователя';
  });
  readonly actionMessage = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === 'delete') return `Безвозвратно удалить ${action.user.email} и связанные данные?`;
    if (action.kind === 'role') {
      return `Сменить роль ${action.user.email} на ${action.role}?`;
    }
    return `${action.user.isActive ? 'Заблокировать' : 'Разблокировать'} ${action.user.email}?`;
  });

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

  canEditRole(user: AdminUser): boolean {
    return this.isAdmin() && user.role !== 'ADMIN' && user.id !== this.auth.currentUser()?.id;
  }

  openRoleAction(user: AdminUser, role: EditableRole | null): void {
    if (!this.canEditRole(user) || this.saving() || !role || role === user.role) return;
    this.selectedRoles.update(roles => ({...roles, [user.id]: role}));
    this.actionError.set(null);
    this.action.set({user, kind: 'role', role});
  }

  openAction(user: AdminUser, kind: 'status' | 'delete'): void {
    if (!this.isAdmin() || this.saving() || user.role === 'ADMIN' || user.id === this.auth.currentUser()?.id) return;
    this.actionError.set(null);
    this.action.set({user, kind});
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeAction();
  }

  closeAction(): void {
    if (this.saving()) return;
    const action = this.action();
    if (action?.kind === 'role') {
      this.selectedRoles.update(roles => {
        const next = {...roles};
        delete next[action.user.id];
        return next;
      });
    }
    this.action.set(null);
    this.actionError.set(null);
  }

  confirmAction(): void {
    const action = this.action();
    if (!action || !this.isAdmin() || this.saving() || action.user.role === 'ADMIN' || action.user.id === this.auth.currentUser()?.id) return;
    this.saving.set(true);
    const request$: Observable<AdminUser | void> = action.kind === 'delete'
      ? this.api.deleteUser(action.user.id)
      : this.api.patchUser(action.user.id, action.kind === 'role'
        ? {role: action.role}
        : {isActive: !action.user.isActive});
    request$.subscribe({
      next: result => {
        if (action.kind === 'delete') {
          const newTotal = Math.max(0, this.total() - 1);
          this.users.update(users => users.filter(user => user.id !== action.user.id));
          this.total.set(newTotal);
          this.page.set(Math.min(this.page(), Math.max(0, Math.ceil(newTotal / 20) - 1)));
          this.load();
        } else if (result) {
          this.users.update(users => users.map(user => user.id === action.user.id ? result : user));
        }
        this.saving.set(false);
        this.closeAction();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(error.status === 409 && action.kind === 'delete'
          ? 'У пользователя есть действующая платная подписка. Сначала отмените её.'
          : `Не получилось ${action.kind === 'delete' ? 'удалить пользователя' : action.kind === 'role' ? 'сменить роль' : action.user.isActive ? 'заблокировать' : 'разблокировать'}. Попробуйте ещё раз.`);
      },
    });
  }
}
