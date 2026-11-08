import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {ExerciseChoiceComponent} from './exercise-choice.component';
import {ExerciseTypeComponent} from './exercise-type.component';
import {ExerciseMatchComponent} from './exercise-match.component';

describe('springest exercise controls', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('reports actual match mistakes once after all pairs are solved', () => {
    jest.useFakeTimers();
    try {
      TestBed.configureTestingModule({imports: [ExerciseMatchComponent]});
      const fixture = TestBed.createComponent(ExerciseMatchComponent);
      fixture.componentRef.setInput('payload', {pairs: [{left: 'a', right: 'A'}, {left: 'b', right: 'B'}]});
      const component = fixture.componentInstance;
      const result = jest.fn();
      component.result.subscribe(result);
      const cells = component.cells();
      const a = cells.find(cell => cell.pairIndex === 0 && cell.side === 'left')!;
      const b = cells.find(cell => cell.pairIndex === 1 && cell.side === 'right')!;
      component.pick(a);
      component.pick(b);
      expect(result).not.toHaveBeenCalled();
      for (const index of [0, 1]) {
        component.pick(cells.find(cell => cell.pairIndex === index && cell.side === 'left')!);
        component.pick(cells.find(cell => cell.pairIndex === index && cell.side === 'right')!);
      }
      component.pick(a);
      component.pick(b);
      expect(result).toHaveBeenCalledTimes(1);
      expect(result).toHaveBeenCalledWith({correct: false, mistakes: 1});
      jest.runOnlyPendingTimers();
    } finally {
      jest.useRealTimers();
    }
  });

  it('submits Korean input once and locks the actual input and submit button', () => {
    TestBed.configureTestingModule({imports: [ExerciseTypeComponent]});
    const fixture = TestBed.createComponent(ExerciseTypeComponent);
    fixture.componentRef.setInput('payload', {translation: 'Кофе', answer: '커피'});
    const result = jest.fn();
    fixture.componentInstance.result.subscribe(result);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('app-basic-input input');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('app-button.checkbtn button');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    expect(button.disabled).toBe(true);
    expect(input.lang).toBe('ko');
    expect(input.getAttribute('autocapitalize')).toBe('off');
    expect(input.getAttribute('autocomplete')).toBe('off');
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(result).not.toHaveBeenCalled();
    input.value = '커피';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    fixture.detectChanges();
    expect(result).toHaveBeenCalledTimes(1);
    expect(result).toHaveBeenCalledWith(expect.objectContaining({correct: true}));
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    button.click();
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(result).toHaveBeenCalledTimes(1);
  });

  it('types Korean through the on-screen and physical keyboard', () => {
    TestBed.configureTestingModule({imports: [ExerciseTypeComponent]});
    const fixture = TestBed.createComponent(ExerciseTypeComponent);
    fixture.componentRef.setInput('payload', {translation: 'Друг', answer: '친구'});
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('button.kbdtoggle')!.click();
    fixture.detectChanges();
    const keys = Array.from(root.querySelectorAll<HTMLButtonElement>('hg-korean-keyboard button.kbd-key'));
    for (const jamo of 'ㅊㅣㄴ') keys.find(key => key.textContent?.trim() === jamo)!.click();
    const input = root.querySelector<HTMLInputElement>('app-basic-input input')!;
    for (const code of ['KeyR', 'KeyN']) input.dispatchEvent(new KeyboardEvent('keydown', {code, bubbles: true, cancelable: true}));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('친구');
    expect(input.value).toBe('친구');
  });

  it('keeps choice grading, state classes and ARIA on the library button', () => {
    TestBed.configureTestingModule({
      imports: [ExerciseChoiceComponent],
      providers: [{provide: KoreanTtsService, useValue: {speak: jest.fn()}}],
    });
    const fixture = TestBed.createComponent(ExerciseChoiceComponent);
    fixture.componentRef.setInput('payload', {
      question: '커피', options: [{text: 'Кофе', correct: true}, {text: 'Чай'}],
    });
    const result = jest.fn();
    fixture.componentInstance.result.subscribe(result);
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button.opt')) as HTMLButtonElement[];
    const correct = buttons.find(button => button.textContent?.includes('Кофе'))!;
    expect(correct.getAttribute('aria-pressed')).toBe('false');
    correct.click();
    fixture.detectChanges();
    expect(result).toHaveBeenCalledWith(expect.objectContaining({correct: true}));
    expect(correct.classList.contains('pick')).toBe(true);
    expect(correct.getAttribute('aria-pressed')).toBe('true');
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      button.click();
    }
    expect(result).toHaveBeenCalledTimes(1);
  });
});
