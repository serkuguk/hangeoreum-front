import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideTranslateService} from '@ngx-translate/core';
import {jest} from '@jest/globals';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {UserWord} from '@features/vocabulary/domain/entities/user-word.entity';
import {GamesFacade} from '@features/vocabulary/application/facades/games.facade';
import {ReviewFacade} from '@features/vocabulary/application/facades/review.facade';
import {GamesPageComponent} from './games-page.component';

const word: UserWord = {
  id: 'uw-1',
  word: {
    id: 'w-1', hangul: '아아나', romanization: '', translation: 'тест',
    partOfSpeech: null, topicId: null, exampleKo: null, exampleTranslation: null,
    grammarNote: null, audioUrl: null, imageUrl: null,
  },
  level: 0, isDifficult: false, dueDate: '2026-07-31T00:00:00Z', repetitions: 0, easeFactor: 2.5,
};

describe('GamesPageComponent SPELL', () => {
  function setup() {
    jest.useFakeTimers();
    const review = {
      loading: signal(false), error: signal<string | null>(null), queue: signal<UserWord[]>([word]),
      result: signal(null), saving: signal(false), saveError: signal<string | null>(null),
      start: jest.fn(), finishWithAnswers: jest.fn(),
    };
    TestBed.configureTestingModule({
      imports: [GamesPageComponent],
      providers: [provideRouter([]), provideTranslateService(), GamesFacade,
        {provide: ReviewFacade, useValue: review}, {provide: KoreanTtsService, useValue: {speak: jest.fn()}}],
    });
    const facade = TestBed.inject(GamesFacade);
    facade.start('SPELL');
    TestBed.flushEffects();
    facade.bank.set(['아', '아', '나', '가']);
    facade.typed.set([]);
    const fixture = TestBed.createComponent(GamesPageComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const tiles = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(`${sel} button`));
    const render = () => fixture.detectChanges();
    return {facade, fixture, el, tiles, render};
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.useRealTimers();
  });

  it('renders field and bank tiles from typed/bank, tracked by index', () => {
    const {facade, el, tiles, render} = setup();
    expect(el.querySelector('.typed .ph')).not.toBeNull();
    tiles('.bank')[0].click();
    tiles('.bank')[0].click();
    render();
    expect(facade.typed()).toEqual(['아', '아']);
    expect(tiles('.typed').map(b => b.textContent?.trim())).toEqual(['아', '아']);
    expect(el.querySelector('.typed .ph')).toBeNull();
    tiles('.typed')[1].click();
    render();
    expect(tiles('.typed').length).toBe(1);
    expect(tiles('.bank').map(b => b.textContent?.trim())).toEqual(['나', '가', '아']);
  });

  it('disables the check button until the field is full and checks on click', () => {
    const {facade, el, tiles, render} = setup();
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.actions button'));
    expect(buttons().length).toBe(2);
    expect(buttons()[0].disabled).toBe(true);
    facade.typed.set(['아', '아', '나']);
    facade.bank.set(['가']);
    render();
    expect(buttons()[0].disabled).toBe(false);
    buttons()[0].click();
    render();
    expect(facade.lastAnswer()).toBe('ok');
    expect(buttons()[0].disabled).toBe(true);
    expect(tiles('.typed').length).toBe(3);
  });

  it('ignores the click that ends a drag and accepts a later click', () => {
    const {facade, fixture} = setup();
    const page = fixture.componentInstance;
    facade.typed.set(['아', '아', '나']);
    facade.bank.set([]);
    page.onDragStarted();
    page.onDragEnded();
    page.returnSyllable(0);
    expect(facade.typed().length).toBe(3);
    jest.advanceTimersByTime(1);
    page.returnSyllable(0);
    expect(facade.typed()).toEqual(['아', '나']);
  });

  it('forwards a drop to moveSyllable', () => {
    const {facade, fixture} = setup();
    facade.typed.set(['아', '나', '가']);
    fixture.componentInstance.onDrop({previousIndex: 0, currentIndex: 2} as never);
    expect(facade.typed()).toEqual(['나', '가', '아']);
  });
});
