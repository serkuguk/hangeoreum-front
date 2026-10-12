import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {MainLayoutComponent} from './main-layout.component';

describe('MainLayoutComponent sidebar items', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('passes translated navigation items and preserves admin access for ADMIN and EDITOR', () => {
    const user = signal({role: 'USER', name: 'Sergio'});
    TestBed.configureTestingModule({providers: [{provide: AuthFacade, useValue: {user}}]});
    const component = TestBed.runInInjectionContext(() => new MainLayoutComponent());
    expect(component.sidebarItems().map(item => item.link)).toEqual(['/dashboard', '/learn', '/review', '/immerse', '/vocabulary']);
    expect(component.sidebarItems().map(item => item.label)).toEqual(['Сегодня', 'Курс', 'Повторить', 'Погружение', 'Словарь']);
    expect(component.canAccessAdmin()).toBe(false);
    user.set({role: 'EDITOR', name: 'Sergio'}); expect(component.canAccessAdmin()).toBe(true);
    user.set({role: 'ADMIN', name: 'Sergio'}); expect(component.canAccessAdmin()).toBe(true);
  });
});
