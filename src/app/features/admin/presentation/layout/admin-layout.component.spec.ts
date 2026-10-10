import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {AuthService} from '@core/auth/auth.service';
import {HgSidebarComponent} from '@shared/components/sidebar/hg-sidebar.component';
import {AdminLayoutComponent} from './admin-layout.component';

describe('AdminLayoutComponent shared navigation', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps admin-only items filtered and reacts to roles and translations', async () => {
    const currentUser = signal({role: 'EDITOR'});
    TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([]), {provide: AuthService, useValue: {currentUser}}],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('ru', {admin: {navigation: {words: 'Слова'}}});
    translate.setTranslation('en', {admin: {navigation: {words: 'Words'}}});
    translate.use('ru');
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const sidebar = fixture.debugElement.query(By.directive(HgSidebarComponent)).componentInstance as HgSidebarComponent;
    expect(sidebar.items().map(item => item.link)).not.toContain('/admin');
    expect(sidebar.items().map(item => item.link)).not.toContain('/admin/users');
    expect(sidebar.items()[0].label).toBe('Слова');
    expect(sidebar.footerItem()?.link).toBe('/dashboard');
    currentUser.set({role: 'ADMIN'}); fixture.detectChanges();
    expect(sidebar.items().find(item => item.link === '/admin')?.exact).toBe(true);
    expect(sidebar.items().map(item => item.link)).toContain('/admin/users');
    translate.use('en'); await fixture.whenStable(); fixture.detectChanges();
    expect(sidebar.items().find(item => item.link === '/admin/words')?.label).toBe('Words');
  });
});
