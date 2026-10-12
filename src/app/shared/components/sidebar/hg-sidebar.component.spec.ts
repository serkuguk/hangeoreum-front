import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {NavigationCancel, NavigationCancellationCode, provideRouter, Router} from '@angular/router';
import {Tooltip} from 'primeng/tooltip';
import {HgSidebarComponent} from './hg-sidebar.component';

@Component({template: ''})
class Page {}

describe('HgSidebarComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [HgSidebarComponent],
      providers: [provideRouter([{path: 'admin', component: Page}, {path: 'admin/words', component: Page}, {path: 'dashboard', component: Page}])],
    });
    const fixture = TestBed.createComponent(HgSidebarComponent);
    fixture.componentRef.setInput('items', [
      {link: '/admin', label: 'Дашборд', icon: '📊', exact: true},
      {link: '/admin/words', label: 'Слова', icon: 'pi-book'},
    ]);
    fixture.componentRef.setInput('navLabel', 'Админ');
    fixture.componentRef.setInput('expandLabel', 'Развернуть меню');
    fixture.componentRef.setInput('collapseLabel', 'Свернуть меню');
    fixture.componentRef.setInput('footerItem', {link: '/dashboard', label: 'Вернуться в приложение', icon: 'pi-arrow-left'});
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => { TestBed.resetTestingModule(); document.body.replaceChildren(); });

  it('starts with icons, accessible labels and body tooltips on hover and focus', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.label[aria-hidden=true]')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe('Админ');
    expect(fixture.nativeElement.querySelector('.footer').getAttribute('href')).toBe('/dashboard');
    for (const element of fixture.debugElement.queryAll(By.directive(Tooltip))) {
      const tooltip = element.injector.get(Tooltip);
      expect(tooltip.disabled).toBe(false);
      expect(tooltip.tooltipEvent).toBe('both');
      expect(tooltip.tooltipPosition).toBe('right');
      expect(tooltip.appendTo()).toBe('body');
      expect(element.nativeElement.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('toggles labels and disables tooltips when expanded', async () => {
    const fixture = await setup();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.label')).toHaveLength(3);
    expect(button.getAttribute('aria-label')).toBe('Свернуть меню');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.debugElement.query(By.directive(Tooltip)).injector.get(Tooltip).disabled).toBe(true);
    button.click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
  });

  it('collapses only after successful navigation and marks only the matching route', async () => {
    const fixture = await setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin');
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav a').getAttribute('aria-current')).toBe('page');
    fixture.componentInstance.expanded.set(true);
    (router.events as unknown as {next: (event: NavigationCancel) => void}).next(
      new NavigationCancel(2, '/admin/words', 'guard', NavigationCancellationCode.GuardRejected));
    expect(fixture.componentInstance.expanded()).toBe(true);
    await router.navigateByUrl('/admin/words');
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    const links = fixture.nativeElement.querySelectorAll('nav a');
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('page');
  });

  it('dismisses with Escape and the outside overlay and restores toggle focus', async () => {
    const fixture = await setup();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(document.activeElement).toBe(button);
    button.click(); fixture.detectChanges();
    fixture.nativeElement.querySelector('.backdrop').click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('closes for outside clicks on mobile while keeping desktop expansion', async () => {
    const fixture = await setup();
    const originalWidth = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', {value: 375, configurable: true});
      fixture.componentInstance.expanded.set(true); fixture.detectChanges();
      document.body.click(); fixture.detectChanges();
      expect(fixture.componentInstance.expanded()).toBe(false);
      Object.defineProperty(window, 'innerWidth', {value: 1280, configurable: true});
      fixture.componentInstance.expanded.set(true); fixture.detectChanges();
      document.body.click();
      expect(fixture.componentInstance.expanded()).toBe(true);
    } finally {
      Object.defineProperty(window, 'innerWidth', {value: originalWidth, configurable: true});
    }
  });
});
