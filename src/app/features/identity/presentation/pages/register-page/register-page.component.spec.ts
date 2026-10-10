import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {provideTranslateService} from '@ngx-translate/core';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {RegisterPageComponent} from './register-page.component';

describe('RegisterPage Signal Forms integration', () => {
  const facade = {loading: signal(false), error: signal<string | null>(null), register: jest.fn()};
  beforeEach(() => {
    facade.loading.set(false);
    facade.register.mockClear();
    TestBed.configureTestingModule({imports: [RegisterPageComponent], providers: [
      provideRouter([]), provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
      {provide: AuthFacade, useValue: facade},
    ]});
  });
  afterEach(() => TestBed.resetTestingModule());

  it('requires consent, email, name length and password length before dispatch', () => {
    const component = TestBed.createComponent(RegisterPageComponent).componentInstance;
    component.submit();
    expect(component.form.consent().touched()).toBe(true);
    expect(facade.register).not.toHaveBeenCalled();
    component.model.set({name: 'Mina', email: 'mina@example.com', password: 'password1', consent: false});
    expect(component.form().invalid()).toBe(true);
    component.model.update(value => ({...value, consent: true, name: 'x'.repeat(101)}));
    expect(component.form().invalid()).toBe(true);
    component.model.update(value => ({...value, name: 'Mina', email: 'invalid'}));
    expect(component.form().invalid()).toBe(true);
    component.model.update(value => ({...value, email: 'mina@example.com', password: 'short'}));
    expect(component.form().invalid()).toBe(true);
    component.model.update(value => ({...value, password: 'password1'}));
    component.submit();
    expect(facade.register).toHaveBeenCalledWith('Mina', 'mina@example.com', 'password1');
    facade.loading.set(true);
    component.submit();
    expect(facade.register).toHaveBeenCalledTimes(1);
  });

  it('binds actual inner inputs and disables the submit button while loading', () => {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
    const password: HTMLInputElement = fixture.nativeElement.querySelector('app-password-input input');
    expect(password.autocomplete).toBe('new-password');
    password.value = 'password1';
    password.dispatchEvent(new Event('input', {bubbles: true}));
    expect(fixture.componentInstance.model().password).toBe('password1');
    const email: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    expect(email.getAttribute('autocapitalize')).toBe('off');
    facade.loading.set(true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('app-button button');
    expect(button.disabled).toBe(true);
    button.click();
    expect(facade.register).not.toHaveBeenCalled();
  });
});
