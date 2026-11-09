import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {jest} from '@jest/globals';
import {Subject} from 'rxjs';
import {DialogComponent} from 'springest';
import {AdminApi} from '@features/admin/infrastructure/admin.api';
import {AdminNotificationsPageComponent} from './admin-notifications-page.component';

describe('AdminNotificationsPageComponent confirmation', () => {
  let fixture: ComponentFixture<AdminNotificationsPageComponent>;
  let component: AdminNotificationsPageComponent;
  let api: {broadcast: jest.Mock};

  beforeEach(() => {
    api = {broadcast: jest.fn()};
    TestBed.configureTestingModule({
      imports: [AdminNotificationsPageComponent], providers: [{provide: AdminApi, useValue: api}],
    });
    fixture = TestBed.createComponent(AdminNotificationsPageComponent);
    component = fixture.componentInstance;
    component.title.set(' Новый урок ');
    component.body.set(' Текст рассылки ');
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  it('opens the existing dialog without a browser confirmation or request and cancels without losing data', () => {
    const browserConfirm = jest.spyOn(window, 'confirm');
    fixture.detectChanges();
    const sendButton: HTMLButtonElement = fixture.nativeElement.querySelector('.panel app-button button');
    sendButton.click();
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.directive(DialogComponent)).componentInstance as DialogComponent;
    expect(dialog.visible()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-dialog').textContent).toContain('Отправить рассылку «Новый урок» всем пользователям?');
    expect(browserConfirm).not.toHaveBeenCalled();
    expect(api.broadcast).not.toHaveBeenCalled();
    const cancel: HTMLButtonElement = fixture.nativeElement.querySelector('app-dialog app-button:last-child button');
    cancel.click();
    fixture.detectChanges();
    expect(component.pendingSend()).toBeNull();
    expect(component.title()).toBe(' Новый урок ');
    expect(component.body()).toBe(' Текст рассылки ');
    component.confirmSend();
    expect(api.broadcast).not.toHaveBeenCalled();
  });

  it('handles dialog dismissal without submitting and rejects a blank title', () => {
    component.send();
    component.onDialogVisibleChange(false);
    expect(component.pendingSend()).toBeNull();
    expect(component.title()).toBe(' Новый урок ');
    component.title.set('   ');
    component.send();
    component.confirmSend();
    expect(component.pendingSend()).toBeNull();
    expect(api.broadcast).not.toHaveBeenCalled();
  });

  it('sends the confirmed trimmed values once, locks the dialog, then clears the form on success', () => {
    const request = new Subject<void>();
    api.broadcast.mockReturnValue(request);
    component.send();
    const pending = component.pendingSend();
    component.confirmSend();
    fixture.detectChanges();
    const dialog = fixture.debugElement.query(By.directive(DialogComponent)).componentInstance as DialogComponent;
    expect(dialog.closable()).toBe(false);
    expect(dialog.closeOnEscape()).toBe(false);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('app-dialog app-button button');
    expect(buttons.length).toBe(2);
    expect(Array.from(buttons).every(button => button.disabled)).toBe(true);
    component.confirmSend();
    component.closeDialog();
    component.onDialogVisibleChange(false);
    component.send();
    expect(component.pendingSend()).toBe(pending);
    expect(api.broadcast).toHaveBeenCalledTimes(1);
    expect(api.broadcast).toHaveBeenCalledWith('Новый урок', 'Текст рассылки');
    expect(component.sent()).toBe(false);
    request.next();
    request.complete();
    fixture.detectChanges();
    expect(component.pendingSend()).toBeNull();
    expect(component.sending()).toBe(false);
    expect(component.sent()).toBe(true);
    expect(component.title()).toBe('');
    expect(component.body()).toBe('');
    expect(dialog.visible()).toBe(false);
  });

  it('shows an error within the open dialog, preserves data and retries the same confirmed payload', () => {
    const request = new Subject<void>();
    const retry = new Subject<void>();
    api.broadcast.mockReturnValueOnce(request).mockReturnValueOnce(retry);
    component.send();
    const pending = component.pendingSend();
    component.confirmSend();
    request.error(new Error('unavailable'));
    fixture.detectChanges();
    expect(component.pendingSend()).toBe(pending);
    expect(component.sending()).toBe(false);
    expect(component.title()).toBe(' Новый урок ');
    expect(component.body()).toBe(' Текст рассылки ');
    expect(fixture.nativeElement.querySelector('app-dialog [role=alert]').textContent).toBeTruthy();
    const dialog = fixture.debugElement.query(By.directive(DialogComponent)).componentInstance as DialogComponent;
    expect(dialog.closable()).toBe(true);
    expect(dialog.closeOnEscape()).toBe(true);
    component.confirmSend();
    expect(component.error()).toBeNull();
    expect(component.sending()).toBe(true);
    expect(api.broadcast).toHaveBeenCalledTimes(2);
    expect(api.broadcast).toHaveBeenLastCalledWith('Новый урок', 'Текст рассылки');
    retry.next();
    retry.complete();
    expect(component.pendingSend()).toBeNull();
    expect(component.sent()).toBe(true);
  });
});
