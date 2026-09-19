import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter, RouterOutlet} from '@angular/router';
import {jest} from '@jest/globals';
import {AuthLayoutComponent} from './auth-layout.component';

describe('AuthLayoutComponent focus management', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  it('moves focus to the activated page heading once', async () => {
    TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const focusSpy = jest.spyOn(component, 'focusHeading');
    const formSide = fixture.nativeElement.querySelector('.formside') as HTMLElement;
    const heading = document.createElement('h1');
    heading.textContent = 'Новая страница';
    formSide.append(heading);

    fixture.debugElement.query(By.directive(RouterOutlet)).injector.get(RouterOutlet).activateEvents.emit({});
    await Promise.resolve();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
    expect(heading.tabIndex).toBe(-1);
  });
});
