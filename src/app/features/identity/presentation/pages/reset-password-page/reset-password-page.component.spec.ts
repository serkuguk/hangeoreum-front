import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {provideTranslateService} from '@ngx-translate/core';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ResetPasswordPageComponent} from './reset-password-page.component';

describe('ResetPasswordPageComponent', () => {
  const facade = {
    loading: signal(false),
    error: signal<string | null>(null),
    beginPasswordRecovery: jest.fn(),
    confirmPasswordReset: jest.fn(),
  };

  afterEach(() => TestBed.resetTestingModule());

  it('reports a missing token and does not submit', () => {
    const {component} = createComponent(null);

    expect(component.missingToken()).toBe(true);
    component.form.setValue({password: 'new-password', confirmation: 'new-password'});
    component.submit();
    expect(facade.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('clears the fragment with replace navigation and keeps the token in memory', () => {
    const {component, router, route} = createComponent('token=secret%2Bvalue');

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      fragment: undefined,
      replaceUrl: true,
    });
    component.form.setValue({password: 'new-password', confirmation: 'new-password'});
    component.submit();
    expect(facade.confirmPasswordReset).toHaveBeenCalledWith('secret+value', 'new-password');
  });

  it('validates password length and matching confirmation', () => {
    const {component} = createComponent('token=secret');

    component.form.setValue({password: 'short', confirmation: 'short'});
    expect(component.form.invalid).toBe(true);

    component.form.setValue({password: 'long-enough', confirmation: 'different'});
    expect(component.form.hasError('passwordMismatch')).toBe(true);

    component.form.setValue({password: 'x'.repeat(101), confirmation: 'x'.repeat(101)});
    expect(component.form.invalid).toBe(true);
  });

  it('renders accessible missing-token and invalid-token errors', () => {
    let fixture = renderComponent(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.apierr[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    TestBed.resetTestingModule();
    fixture = renderComponent('token=invalid');
    facade.error.set('Ссылка недействительна или устарела. Запроси новую.');
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('.apierr[role="alert"]');
    expect(error).not.toBeNull();
    expect(error.textContent).toContain('Ссылка недействительна');
  });

  it('renders validation errors for length and password mismatch', () => {
    const fixture = renderComponent('token=secret');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.setValue({password: 'short', confirmation: 'different'});
    component.form.markAllAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('small.error')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('input[aria-invalid="true"]')).toHaveLength(2);
  });

  function createComponent(fragment: string | null): {
    component: ResetPasswordPageComponent;
    router: {navigate: jest.Mock};
    route: {snapshot: {fragment: string | null}};
  } {
    jest.clearAllMocks();
    const route = {snapshot: {fragment}};
    const router = {navigate: jest.fn().mockResolvedValue(true)};
    TestBed.configureTestingModule({
      providers: [
        {provide: AuthFacade, useValue: facade},
        {provide: ActivatedRoute, useValue: route},
        {provide: Router, useValue: router},
      ],
    });
    return {
      component: TestBed.runInInjectionContext(() => new ResetPasswordPageComponent()),
      router,
      route,
    };
  }

  function renderComponent(fragment: string | null) {
    jest.clearAllMocks();
    facade.error.set(null);
    TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
        {provide: AuthFacade, useValue: facade},
      ],
    });
    const route = TestBed.inject(ActivatedRoute);
    Object.defineProperty(route.snapshot, 'fragment', {value: fragment, configurable: true});
    return TestBed.createComponent(ResetPasswordPageComponent);
  }
});
