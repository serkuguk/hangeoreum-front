import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {provideTranslateService} from '@ngx-translate/core';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ForgotPasswordPageComponent} from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  const facade = {
    loading: signal(false),
    error: signal<string | null>(null),
    passwordResetRequested: signal(false),
    beginPasswordRecovery: jest.fn(),
    requestPasswordReset: jest.fn(),
  };

  let component: ForgotPasswordPageComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    facade.passwordResetRequested.set(false);
    TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
        {provide: AuthFacade, useValue: facade},
      ],
    });
    component = TestBed.createComponent(ForgotPasswordPageComponent).componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('requires a valid email and sends only valid input', () => {
    component.submit();
    expect(component.form.controls.email.touched).toBe(true);
    expect(facade.requestPasswordReset).not.toHaveBeenCalled();

    component.form.controls.email.setValue('not-an-email');
    expect(component.form.invalid).toBe(true);

    component.form.controls.email.setValue('mina@example.com');
    component.submit();
    expect(facade.requestPasswordReset).toHaveBeenCalledWith('mina@example.com');
  });

  it('renders the neutral confirmation as a status message', () => {
    facade.passwordResetRequested.set(true);
    const fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    fixture.detectChanges();

    const confirmation = fixture.nativeElement.querySelector('.success');
    expect(confirmation).not.toBeNull();
    expect(confirmation.getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
