import {Router} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService, UserRole} from '@core/auth/auth.service';
import {ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent} from 'springest';
import {ADMIN_PAGE_SIZE, AdminApi, AdminUser} from '@features/admin/infrastructure/admin.api';

const UserActionKind = {Role: 'role', Status: 'status', Delete: 'delete'} as const;
type DialogActionKind = typeof UserActionKind.Status | typeof UserActionKind.Delete;

type EditableRole = typeof UserRole.User | typeof UserRole.Editor;
type UserAction =
  | {user: AdminUser; kind: typeof UserActionKind.Role; role: EditableRole}
  | {user: AdminUser; kind: DialogActionKind};

@Component({
  selector: 'hg-admin-users-page',
  imports: [TranslatePipe, ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent],
  templateUrl: './admin-users-page.component.html',
  styleUrls: ['../_admin.scss', './admin-users-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private api = inject(AdminApi);
  private readonly router = inject(Router);
  private translate = inject(TranslateService);
  readonly auth = inject(AuthService);
  readonly roles = UserRole;
  readonly actionKinds = UserActionKind;
  readonly pageSize = ADMIN_PAGE_SIZE;

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
  readonly roleOptions = [{label: UserRole.User, value: UserRole.User}, {label: UserRole.Editor, value: UserRole.Editor}];
  readonly dialogOpen = computed(() => this.action() !== null);
  readonly isDeleteAction = computed(() => this.action()?.kind === UserActionKind.Delete);
  readonly confirmLabelKey = computed(() => this.isDeleteAction() ? 'admin.users.delete' : 'admin.users.confirm');
  readonly confirmButtonClass = computed(() => `hg-button hg-button--${this.isDeleteAction() ? 'danger' : 'primary'}`);

  readonly actionTitle = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === UserActionKind.Delete) return this.translate.instant('admin.users.deleteTitle');
    if (action.kind === UserActionKind.Role) return this.translate.instant('admin.users.roleTitle');
    return action.user.isActive ? this.translate.instant('admin.users.blockTitle') : this.translate.instant('admin.users.unblockTitle');
  });
  readonly actionMessage = computed(() => {
    const action = this.action();
    if (!action) return '';
    if (action.kind === UserActionKind.Delete) return this.translate.instant('admin.users.deleteMessage', {email: action.user.email});
    if (action.kind === UserActionKind.Role) {
      return this.translate.instant('admin.users.roleMessage', {email: action.user.email, role: action.role});
    }
    return this.translate.instant(action.user.isActive ? 'admin.users.blockMessage' : 'admin.users.unblockMessage', {email: action.user.email});
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => this.api.users(search, 0).pipe(
        catchError(() => {
          this.error.set(this.translate.instant('admin.users.loadError'));
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

  openMonitoring(user: AdminUser): void {
    void this.router.navigate(['/admin/users', user.id, 'monitoring']);
  }

  load(): void {
    this.api.users(this.search(), this.page()).subscribe({
      next: result => {
        this.users.set(result.content);
        this.total.set(result.totalElements);
      },
      error: () => this.error.set(this.translate.instant('admin.users.loadError')),
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

  formatRegistrationDate(createdAt: string): string {
    const [year, month, day] = createdAt.slice(0, 10).split('-');
    return `${day}-${month}-${year}`;
  }

  /** Admins manage everyone except other admins and themselves. */
  canManage(user: AdminUser): boolean {
    return this.isAdmin() && user.role !== UserRole.Admin && user.id !== this.auth.currentUser()?.id;
  }

  statusLabelKey(user: AdminUser): string {
    return user.isActive ? 'admin.users.block' : 'admin.users.unblock';
  }

  statusButtonClass(user: AdminUser): string {
    return `hg-button hg-button--sm hg-button--${user.isActive ? 'danger' : 'secondary'}`;
  }

  openRoleAction(user: AdminUser, role: unknown): void {
    if (!this.canManage(user) || this.saving() || (role !== UserRole.User && role !== UserRole.Editor) || role === user.role) return;
    this.selectedRoles.update(roles => ({...roles, [user.id]: role}));
    this.actionError.set(null);
    this.action.set({user, kind: UserActionKind.Role, role});
  }

  openAction(user: AdminUser, kind: DialogActionKind): void {
    if (this.saving() || !this.canManage(user)) return;
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
    if (!action || this.saving() || !this.canManage(action.user)) return;
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
          this.page.set(Math.min(this.page(), Math.max(0, Math.ceil(newTotal / this.pageSize) - 1)));
          this.load();
        } else if (result) {
          this.users.update(users => users.map(user => user.id === action.user.id ? result : user));
        }
        this.saving.set(false);
        this.closeAction();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(this.translate.instant(this.actionErrorKey(action, error)));
      },
    });
  }

  private actionErrorKey(action: UserAction, error: HttpErrorResponse): string {
    if (action.kind === UserActionKind.Delete) {
      return error.status === 409 ? 'admin.users.activeSubscription' : 'admin.users.deleteError';
    }
    if (action.kind === UserActionKind.Role) return 'admin.users.roleError';
    return action.user.isActive ? 'admin.users.blockError' : 'admin.users.unblockError';
  }
}
