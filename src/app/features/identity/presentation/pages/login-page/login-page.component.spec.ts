import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {provideTranslateService} from '@ngx-translate/core';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {LoginPageComponent} from './login-page.component';

describe('LoginPageComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('starts a fresh login attempt scope and reads the ephemeral reset notice', () => {
    const facade = {
      loading: signal(false),
      error: signal<string | null>(null),
      showPasswordRecovery: signal(false),
      beginLogin: jest.fn(),
      endLogin: jest.fn(),
      login: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        {provide: AuthFacade, useValue: facade},
        {
          provide: Router,
          useValue: {getCurrentNavigation: () => ({extras: {state: {passwordReset: true}}})},
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new LoginPageComponent());

    expect(facade.beginLogin).toHaveBeenCalledTimes(1);
    expect(component.passwordChanged).toBe(true);
  });

  it('renders the recovery CTA only after the facade exposes it and has no social login UI', () => {
    const showPasswordRecovery = signal(false);
    const facade = {
      loading: signal(false),
      error: signal<string | null>(null),
      showPasswordRecovery,
      beginLogin: jest.fn(),
      endLogin: jest.fn(),
      login: jest.fn(),
    };
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
        {provide: AuthFacade, useValue: facade},
      ],
    });
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.recovery')).toBeNull();
    expect(fixture.nativeElement.querySelector('.social')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Google');
    expect(fixture.nativeElement.textContent).not.toContain('Kakao');

    showPasswordRecovery.set(true);
    fixture.detectChanges();
    const recovery = fixture.nativeElement.querySelector('.recovery');
    expect(recovery).not.toBeNull();
    expect(recovery.getAttribute('role')).toBe('status');
    expect(recovery.querySelector('a')?.getAttribute('href')).toBe('/auth/forgot-password');
  });

  it('renders the password-changed notice from navigation state', () => {
    const facade = {
      loading: signal(false),
      error: signal<string | null>(null),
      showPasswordRecovery: signal(false),
      beginLogin: jest.fn(),
      endLogin: jest.fn(),
      login: jest.fn(),
    };
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
        {provide: AuthFacade, useValue: facade},
      ],
    });
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'getCurrentNavigation').mockReturnValue({
      extras: {state: {passwordReset: true}},
    } as ReturnType<Router['getCurrentNavigation']>);

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.success[role="status"]')).not.toBeNull();
  });
});
