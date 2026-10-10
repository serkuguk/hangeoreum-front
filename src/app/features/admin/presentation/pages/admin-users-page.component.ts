import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '@core/auth/auth.service';
import {ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent} from 'springest';
import {AdminApi, AdminUser} from '../../infrastructure/admin.api';

enum UserRole { Admin = 'ADMIN', User = 'USER', Editor = 'EDITOR' }
enum UserActionKind { Role = 'role', Status = 'status', Delete = 'delete' }

type EditableRole = 'USER' | 'EDITOR';
type UserAction = {user: AdminUser; kind: 'role'; role: EditableRole} | {user: AdminUser; kind: 'status' | 'delete'};

@Component({
  selector: 'hg-admin-users-page',
  imports: [ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent],
  template: `
    <h2 class="pagettl">Пользователи</h2>
    <p class="pagesub">{{ total() }} зарегистрировано.</p>

    <div class="toolbar">
      <app-basic-input class="search" type="search" label="Поиск пользователей"
                placeholder="Имя или email…" [value]="search()"
                (valueChange)="onSearch($event)" />
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
                  <app-basic-select class="role-select" [ariaLabel]="'Роль ' + user.email"
                             [items]="roleOptions" placeholder=""
                             [value]="selectedRoles()[user.id] || user.role"
                             (valueChange)="openRoleAction(user, $event)" optionLabel="label" optionValue="value" />
                } @else {
                  <span class="pill" [class.p-r]="user.role === roles.Admin" [class.p-b]="user.role === roles.User">
                    {{ user.role }}
                  </span>
                }
              </td>
              <td>{{ user.createdAt.slice(0, 10) }}</td>
              <td class="user-actions">
                @if (isAdmin() && user.id !== auth.currentUser()?.id && user.role !== roles.Admin) {
                  <div class="user-actions__buttons">
                  <app-button
                             [label]="user.isActive ? 'Заблокировать' : 'Разблокировать'"
                             (click)="openAction(user, actionKinds.Status)" [styleClass]="'hg-button hg-button--sm hg-button--' + (user.isActive ? 'danger' : 'secondary')"></app-button>
                  <app-button label="Удалить"
                             (click)="openAction(user, actionKinds.Delete)" styleClass="hg-button hg-button--danger hg-button--sm"></app-button>
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
        <app-pagination [rows]="20" [first]="page() * 20" [totalRecords]="total()"
                       aria-label="Страницы пользователей" (pageChange)="goToPage($event.page ?? 0)" />
      }
    </div>

    <app-dialog closeAriaLabel="Закрыть" [visible]="action() !== null" (visibleChange)="onDialogVisibleChange($event)"
               [header]="actionTitle()" [closable]="!saving()" [closeOnEscape]="!saving()">
      <p>{{ actionMessage() }}</p>
      @if (actionError()) {
        <div class="errbar" role="alert">{{ actionError() }}</div>
      }
      <div dialogActions>
        <app-button [label]="isDeleteAction() ? 'Удалить' : 'Подтвердить'"

                   [loading]="saving()" (click)="confirmAction()" [styleClass]="'hg-button hg-button--' + (isDeleteAction() ? 'danger' : 'primary')"></app-button>
        <app-button label="Отмена" [disabled]="saving()"
                   (click)="closeAction()" styleClass="hg-button hg-button--ghost"></app-button>
      </div>
    </app-dialog>
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
  readonly roles = UserRole;
  readonly actionKinds = UserActionKind;
  readonly isDeleteAction = computed(() => this.action()?.kind === UserActionKind.Delete);

  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly search = signal('');
  readonly error = signal<string | null>(null);
  readonly action = signal<UserAction | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly selectedRoles = signal<Record<string, EditableRole>>({});
  readonly isAdmin = computed(() => this.auth.currentUser()?.role === UserRole.Admin);
  readonly roleOptions = [{label: UserRole.User, value: UserRole.User}, {label: UserRole.Editor, value: UserRole.Editor}] ;

  readonly actionTitle = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === UserActionKind.Delete) return 'Удалить пользователя';
    if (action.kind === UserActionKind.Role) return 'Сменить роль';
    return action.user.isActive ? 'Заблокировать пользователя' : 'Разблокировать пользователя';
  });
  readonly actionMessage = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === UserActionKind.Delete) return `Безвозвратно удалить ${action.user.email} и связанные данные?`;
    if (action.kind === UserActionKind.Role) {
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
    return this.isAdmin() && user.role !== UserRole.Admin && user.id !== this.auth.currentUser()?.id;
  }

  openRoleAction(user: AdminUser, role: unknown): void {
    if (!this.canEditRole(user) || this.saving() || (role !== UserRole.User && role !== UserRole.Editor) || role === user.role) return;
    this.selectedRoles.update(roles => ({...roles, [user.id]: role}));
    this.actionError.set(null);
    this.action.set({user, kind: UserActionKind.Role, role});
  }

  openAction(user: AdminUser, kind: 'status' | 'delete'): void {
    if (!this.isAdmin() || this.saving() || user.role === UserRole.Admin || user.id === this.auth.currentUser()?.id) return;
    this.actionError.set(null);
    this.action.set({user, kind});
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeAction();
  }

  closeAction(): void {
    if (this.saving()) return;
    const action = this.action();
    if (action?.kind === UserActionKind.Role) {
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
    if (!action || !this.isAdmin() || this.saving() || action.user.role === UserRole.Admin || action.user.id === this.auth.currentUser()?.id) return;
    this.saving.set(true);
    const request$: Observable<AdminUser | void> = action.kind === UserActionKind.Delete
      ? this.api.deleteUser(action.user.id)
      : this.api.patchUser(action.user.id, action.kind === UserActionKind.Role
        ? {role: action.role}
        : {isActive: !action.user.isActive});
    request$.subscribe({
      next: result => {
        if (action.kind === UserActionKind.Delete) {
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
        this.actionError.set(error.status === 409 && action.kind === UserActionKind.Delete
          ? 'У пользователя есть действующая платная подписка. Сначала отмените её.'
          : `Не получилось ${action.kind === UserActionKind.Delete ? 'удалить пользователя' : action.kind === UserActionKind.Role ? 'сменить роль' : action.user.isActive ? 'заблокировать' : 'разблокировать'}. Попробуйте ещё раз.`);
      },
    });
  }
}
