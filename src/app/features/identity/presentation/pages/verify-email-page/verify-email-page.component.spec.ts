import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {jest} from '@jest/globals';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {VerifyEmailPageComponent} from './verify-email-page.component';

describe('VerifyEmailPageComponent', () => {
  const facade = {
    loading: signal(false),
    error: signal<string | null>(null),
    beginRegistration: jest.fn(),
    confirmEmail: jest.fn(),
  };

  afterEach(() => TestBed.resetTestingModule());

  it('confirms the token from the fragment and removes it from the URL', () => {
    const {component, router, route} = createComponent('token=signed.jwt.value');

    expect(component.missingToken).toBe(false);
    expect(facade.confirmEmail).toHaveBeenCalledWith('signed.jwt.value');
    expect(router.navigate).toHaveBeenCalledWith([], {relativeTo: route, fragment: undefined, replaceUrl: true});
  });

  it('does not call the API without a token', () => {
    const {component} = createComponent(null);

    expect(component.missingToken).toBe(true);
    expect(facade.confirmEmail).not.toHaveBeenCalled();
  });

  function createComponent(fragment: string | null) {
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
    return {component: TestBed.runInInjectionContext(() => new VerifyEmailPageComponent()), router, route};
  }
});
