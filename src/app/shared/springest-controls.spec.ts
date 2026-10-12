import {Component, signal} from '@angular/core';
import {jest} from '@jest/globals';
import {TestBed} from '@angular/core/testing';
import {ButtonComponent} from 'springest';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {HgAudioButtonComponent} from './components/hg/hg-audio-button.component';

@Component({
  imports: [ButtonComponent, HgAudioButtonComponent],
  template: `<app-button [disabled]="disabled()" [loading]="loading()" [aria]="{'aria-label': 'Сохранить'}"
    (click)="save()">💾</app-button><div (click)="parent()"><hg-audio-button text="안녕" /></div>`,
})
class ControlsHost {
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly save = jest.fn();
  readonly parent = jest.fn();
}

describe('springest application integration', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('forwards ARIA and suppresses disabled/loading activation on the actual button', () => {
    TestBed.configureTestingModule({imports: [ControlsHost], providers: [{provide: KoreanTtsService, useValue: {speak: jest.fn()}}]});
    const fixture = TestBed.createComponent(ControlsHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Сохранить');
    expect(button.textContent).toContain('💾');
    button.click();
    expect(fixture.componentInstance.save).toHaveBeenCalledTimes(1);
    fixture.componentInstance.disabled.set(true); fixture.detectChanges();
    button.click();
    fixture.componentInstance.disabled.set(false);
    fixture.componentInstance.loading.set(true); fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    button.click();
    expect(fixture.componentInstance.save).toHaveBeenCalledTimes(1);
  });

  it('keeps audio activation from reaching its parent interaction', () => {
    const speak = jest.fn();
    TestBed.configureTestingModule({imports: [ControlsHost], providers: [{provide: KoreanTtsService, useValue: {speak}}]});
    const fixture = TestBed.createComponent(ControlsHost);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('hg-audio-button button').click();
    expect(speak).toHaveBeenCalledWith('안녕', null);
    expect(fixture.componentInstance.parent).not.toHaveBeenCalled();
  });
});
