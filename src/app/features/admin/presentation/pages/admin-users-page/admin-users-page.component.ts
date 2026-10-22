import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Observable, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService, UserRole} from '@core/auth/auth.service';
import {ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent} from 'springest';
import {AdminApi, AdminUser} from '@features/admin/infrastructure/admin.api';

enum UserActionKind { Role = 'role', Status = 'status', Delete = 'delete' }

type EditableRole = 'USER' | 'EDITOR';
type UserAction = {user: AdminUser; kind: 'role'; role: EditableRole} | {user: AdminUser; kind: 'status' | 'delete'};

@Component({
  selector: 'hg-admin-users-page',
  imports: [TranslatePipe, ButtonComponent, DialogComponent, BasicInputComponent, PaginationComponent, BasicSelectComponent],
  template: `
    <h2 class="pagettl">{{ 'admin.users.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.users.count' | translate: {count: total()} }}</p>

    <div class="toolbar">
      <app-basic-input class="search" type="search" [label]="'admin.users.search' | translate"
                [placeholder]="'admin.users.searchPlaceholder' | translate" [value]="search()"
                (valueChange)="onSearch($event)" />
    </div>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>{{ 'admin.users.name' | translate }}</th><th>Email</th><th>{{ 'admin.users.role' | translate }}</th><th>{{ 'admin.users.registered' | translate }}</th><th></th></tr></thead>
        <tbody>
          @for (user of users(); track user.id) {
            <tr>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                @if (canEditRole(user)) {
                  <app-basic-select class="role-select" [ariaLabel]="'admin.users.roleAria' | translate: {email: user.email}"
                             [items]="roleOptions" placeholder=""
                             [value]="selectedRoles()[user.id] || user.role"
                             (valueChange)="openRoleAction(user, $event)" optionLabel="label" optionValue="value" />
                } @else {
                  <div class="role-static">
                    <span class="pill" [class.p-r]="user.role === roles.Admin" [class.p-b]="user.role === roles.User">
                      {{ user.role }}
                    </span>
                  </div>
                }
              </td>
              <td>
                <div class="registered-date">
                  {{ formatRegistrationDate(user.createdAt) }}
                </div>
              </td>
              <td class="user-actions">
                @if (isAdmin() && user.id !== auth.currentUser()?.id && user.role !== roles.Admin) {
                  <div class="user-actions__buttons">
                  <app-button
                             [label]="(user.isActive ? 'admin.users.block' : 'admin.users.unblock') | translate"
                             (click)="openAction(user, actionKinds.Status)" [styleClass]="'hg-button hg-button--sm hg-button--' + (user.isActive ? 'danger' : 'secondary')"></app-button>
                  <app-button [label]="'admin.users.delete' | translate"
                             (click)="openAction(user, actionKinds.Delete)" styleClass="hg-button hg-button--danger hg-button--sm"></app-button>
                  </div>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">{{ 'admin.users.empty' | translate }}</td></tr>
          }
        </tbody>
      </table>
      @if (totalPages() > 1) {
        <app-pagination [rows]="20" [first]="page() * 20" [totalRecords]="total()"
                       [attr.aria-label]="'admin.users.pagination' | translate" (pageChange)="goToPage($event.page ?? 0)" />
      }
    </div>

    <app-dialog [closeAriaLabel]="'admin.users.close' | translate" [visible]="action() !== null" (visibleChange)="onDialogVisibleChange($event)"
               [header]="actionTitle()" [closable]="!saving()" [closeOnEscape]="!saving()">
      <p>{{ actionMessage() }}</p>
      @if (actionError()) {
        <div class="errbar" role="alert">{{ actionError() }}</div>
      }
      <div dialogActions>
        <app-button [label]="(isDeleteAction() ? 'admin.users.delete' : 'admin.users.confirm') | translate"

                   [loading]="saving()" (click)="confirmAction()" [styleClass]="'hg-button hg-button--' + (isDeleteAction() ? 'danger' : 'primary')"></app-button>
        <app-button [label]="'admin.users.cancel' | translate" [disabled]="saving()"
                   (click)="closeAction()" styleClass="hg-button hg-button--ghost"></app-button>
      </div>
    </app-dialog>
  `,
  styleUrl: '../_admin.scss',
  styles: `
    .user-actions { min-width: 15rem; }
    .role-select { display: inline-block; min-width: 9rem; }
    .role-static {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 40px;
      padding: 0 .8rem;
      border-radius: var(--hg-radius-control, .75rem);
      background: var(--hg-card);
    }
    .registered-date { display: flex; align-items: center; height: 40px; }
    .user-actions__buttons { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; }
    :host .panel { overflow-x: auto; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private api = inject(AdminApi);
  private translate = inject(TranslateService);
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

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

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
          ? this.translate.instant('admin.users.activeSubscription')
          : this.translate.instant(action.kind === UserActionKind.Delete ? 'admin.users.deleteError' : action.kind === UserActionKind.Role ? 'admin.users.roleError' : action.user.isActive ? 'admin.users.blockError' : 'admin.users.unblockError'));
      },
    });
  }
}
