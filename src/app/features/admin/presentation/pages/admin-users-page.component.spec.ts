import {signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, Subject} from 'rxjs';
import {AuthService} from '@core/auth/auth.service';
import {AdminApi, AdminUser} from '../../infrastructure/admin.api';
import {AdminUsersPageComponent} from './admin-users-page.component';

const user: AdminUser = {
  id: 'other', name: 'Sergio', email: 'sergio@test.com', avatarUrl: null,
  role: 'USER', isActive: true, startLevel: 'BEGINNER', createdAt: '2026-07-12T00:00:00Z',
};

describe('AdminUsersPageComponent actions', () => {
  let component: AdminUsersPageComponent;
  let api: {users: jest.Mock; patchUser: jest.Mock; deleteUser: jest.Mock};
  let currentUser: ReturnType<typeof signal<{id: string; role: 'ADMIN' | 'EDITOR'} | null>>;

  beforeEach(() => {
    api = {
      users: jest.fn().mockReturnValue(of({content: [user], totalElements: 1, page: 0})),
      patchUser: jest.fn(),
      deleteUser: jest.fn(),
    };
    currentUser = signal({id: 'self', role: 'ADMIN' as const});
    TestBed.configureTestingModule({providers: [
      {provide: AdminApi, useValue: api},
      {provide: AuthService, useValue: {currentUser}},
    ]});
    component = TestBed.runInInjectionContext(() => new AdminUsersPageComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('confirms blocking and then offers unblocking from the updated API state', () => {
    api.patchUser.mockReturnValueOnce(of({...user, isActive: false}));
    api.patchUser.mockReturnValueOnce(of({...user, isActive: true}));
    component.openAction(user, 'status');
    expect(component.actionTitle()).toBe('Заблокировать пользователя');
    component.confirmAction();

    expect(api.patchUser).toHaveBeenCalledWith('other', {isActive: false});
    expect(component.users()[0].isActive).toBe(false);
    component.openAction(component.users()[0], 'status');
    expect(component.actionTitle()).toBe('Разблокировать пользователя');
    component.confirmAction();
    expect(api.patchUser).toHaveBeenLastCalledWith('other', {isActive: true});
    expect(component.users()[0].isActive).toBe(true);
    component.openAction(component.users()[0], 'status');
    expect(component.actionTitle()).toBe('Заблокировать пользователя');
  });

  it('cancels without a request and blocks self actions', () => {
    component.openRoleAction(user, 'EDITOR');
    component.closeAction();
    component.confirmAction();
    expect(api.patchUser).not.toHaveBeenCalled();
    component.openAction({...user, id: 'self'}, 'delete');
    expect(component.action()).toBeNull();
  });

  it('requires confirmation before changing USER to EDITOR and restores the selection on cancel', () => {
    api.patchUser.mockReturnValue(of({...user, role: 'EDITOR'}));
    component.openRoleAction(user, 'EDITOR');
    expect(component.actionMessage()).toContain('EDITOR');
    expect(api.patchUser).not.toHaveBeenCalled();
    component.closeAction();
    expect(component.selectedRoles()[user.id]).toBeUndefined();
    component.openRoleAction(user, 'EDITOR');
    component.confirmAction();
    expect(api.patchUser).toHaveBeenCalledWith(user.id, {role: 'EDITOR'});
    expect(component.users()[0].role).toBe('EDITOR');
  });

  it('prevents role changes for ADMIN, self, and editors', () => {
    component.openRoleAction({...user, role: 'ADMIN'}, 'EDITOR');
    component.openRoleAction({...user, id: 'self'}, 'EDITOR');
    expect(component.action()).toBeNull();
    currentUser.set({id: 'self', role: 'EDITOR'});
    component.openRoleAction(user, 'EDITOR');
    component.openAction(user, 'delete');
    expect(component.action()).toBeNull();
    expect(api.patchUser).not.toHaveBeenCalled();
  });

  it('prevents duplicate submits and keeps the row on a subscription conflict', () => {
    const request = new Subject<void>();
    api.deleteUser.mockReturnValue(request);
    component.openAction(user, 'delete');
    component.confirmAction();
    component.confirmAction();
    expect(api.deleteUser).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true);
    request.error(new HttpErrorResponse({status: 409}));
    expect(component.users()).toEqual([user]);
    expect(component.action()?.user.id).toBe('other');
    expect(component.actionError()).toContain('подписка');
  });

  it('returns to the previous page after deleting its final user', () => {
    component.page.set(1);
    component.total.set(21);
    api.deleteUser.mockReturnValue(of(void 0));
    component.openAction(user, 'delete');
    component.confirmAction();
    expect(component.page()).toBe(0);
    expect(api.users).toHaveBeenLastCalledWith('', 0);
    expect(component.action()).toBeNull();
  });
});
