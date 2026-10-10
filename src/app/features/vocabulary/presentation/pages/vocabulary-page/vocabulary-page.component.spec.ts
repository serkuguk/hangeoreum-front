import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {jest} from '@jest/globals';
import {Subject} from 'rxjs';
import {provideTranslateService, TranslateLoader} from '@ngx-translate/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {VocabularyFacade} from '../../../application/facades/vocabulary.facade';
import {UserWord} from '../../../domain/entities/user-word.entity';
import {VocabularyPageComponent} from './vocabulary-page.component';

const userWord: UserWord = {
  id: 'user-word-1', level: 2, isDifficult: false,
  dueDate: '2020-01-01T00:00:00Z', repetitions: 2, easeFactor: 2.5,
  word: {
    id: 'word-1', hangul: '커피', romanization: 'keopi', translation: 'Кофе',
    partOfSpeech: null, topicId: null, grammarNote: null,
    exampleKo: '커피를 마셔요.', exampleTranslation: 'Я пью кофе.',
    imageUrl: '/uploads/coffee.png', audioUrl: '/uploads/coffee.mp3',
  },
};

function vocabularyMock() {
  return {
    words: signal<UserWord[]>([userWord]), totalElements: signal(1),
    loading: signal(false), error: signal<string | null>(null),
    decks: signal([{id: 'deck-1', title: 'Напитки', wordCount: 0}]),
    search: jest.fn(), loadDecks: jest.fn(), toggleDifficult: jest.fn(), addToDeck: jest.fn(), createDeck: jest.fn(),
  };
}

describe('Vocabulary word cards', () => {
  let fixture: ComponentFixture<VocabularyPageComponent>;
  let facade: ReturnType<typeof vocabularyMock>;
  let speak: jest.Mock;

  beforeEach(async () => {
    facade = vocabularyMock();
    speak = jest.fn();
    TestBed.configureTestingModule({
      imports: [VocabularyPageComponent],
      providers: [
        provideRouter([]), {provide: VocabularyFacade, useValue: facade},
        {provide: KoreanTtsService, useValue: {speak}},
      ],
    });
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(VocabularyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('renders image, hangul, romanization, translation and existing SRS metadata', () => {
    const card: HTMLElement = fixture.nativeElement.querySelector('.vrow');
    const image = card.querySelector('img')!;
    expect(image.getAttribute('src')).toBe(userWord.word.imageUrl);
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('width')).toBe('80');
    expect(card.querySelector('.wh')?.textContent).toContain('커피');
    expect(card.querySelector('.wh')?.getAttribute('lang')).toBe('ko');
    expect(card.querySelector('.rom')?.textContent).toContain('keopi');
    expect(card.querySelector('.tr')?.textContent).toContain('Кофе');
    expect(card.querySelector('.stars')?.textContent).toBe('★★☆☆☆');
    expect(card.querySelector('.due')?.textContent).toBeTruthy();
    expect(card.classList.contains('state-due')).toBe(true);
    expect(card.querySelector('button button')).toBeNull();
  });

  it.each([null, '', '   '])('uses the default drawing for absent image %p', imageUrl => {
    facade.words.set([{...userWord, word: {...userWord.word, imageUrl}}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src'))
      .toBe(fixture.componentInstance.defaultWordImage);
  });

  it('falls back on load failure, tolerates fallback errors and displays a replacement URL', () => {
    const image: HTMLImageElement = fixture.nativeElement.querySelector('.word-image');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(fixture.componentInstance.defaultWordImage);

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe(fixture.componentInstance.defaultWordImage);

    facade.words.set([{...userWord, word: {...userWord.word, imageUrl: '/uploads/replaced.png'}}]);
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe('/uploads/replaced.png');
  });

  it('keeps audio and difficult actions independent from expanding the example', () => {
    const card: HTMLElement = fixture.nativeElement.querySelector('.vrow');
    (card.querySelector('hg-audio-button button') as HTMLButtonElement).click();
    expect(speak).toHaveBeenCalledWith('커피', '/uploads/coffee.mp3');
    expect(fixture.componentInstance.expandedId()).toBeNull();

    const difficult: HTMLButtonElement = card.querySelector('button.diffbtn')!;
    expect(difficult.getAttribute('aria-label')).toBeTruthy();
    difficult.click();
    expect(facade.toggleDifficult).toHaveBeenCalledWith(userWord);
    expect(fixture.componentInstance.expandedId()).toBeNull();

    const expand: HTMLButtonElement = card.querySelector('button.rowmain')!;
    expand.click();
    fixture.detectChanges();
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(card.querySelector('.example')?.id).toBe(expand.getAttribute('aria-controls'));
    expect(card.querySelector('.example')?.textContent).toContain('커피를 마셔요.');
    expect(card.querySelector('.example')?.textContent).toContain('Я пью кофе.');
    expand.click();
    fixture.detectChanges();
    expect(card.querySelector('.example')).toBeNull();
  });

  it('opens the deck picker separately and adds the domain word id to the chosen deck', () => {
    (fixture.nativeElement.querySelector('button.deckbtn') as HTMLButtonElement).click();
    expect(fixture.componentInstance.deckPickWord()).toBe(userWord);
    expect(fixture.componentInstance.expandedId()).toBeNull();
    fixture.componentInstance.addToDeck(facade.decks()[0]);
    expect(facade.addToDeck).toHaveBeenCalledWith('deck-1', 'word-1');
    expect(fixture.componentInstance.deckPickWord()).toBeNull();
  });

  it('loads zero-based pages from the real record total and resets the offset after a search', () => {
    facade.totalElements.set(41);
    fixture.detectChanges();
    const next: HTMLButtonElement = fixture.nativeElement.querySelector('.p-paginator-next');
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
    expect(facade.search).toHaveBeenLastCalledWith(expect.objectContaining({page: 1, size: 20}));
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(2);
    expect(next.disabled).toBe(true);
    const search: HTMLInputElement = fixture.nativeElement.querySelector('.searchbox input');
    search.value = '커피';
    search.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
    expect(facade.search).toHaveBeenLastCalledWith(expect.objectContaining({page: 0, search: '커피'}));
    expect((fixture.nativeElement.querySelector('.p-paginator-prev') as HTMLButtonElement).disabled).toBe(true);
    facade.words.set([]);
    facade.totalElements.set(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pagination')).toBeNull();
  });

  it('creates trimmed deck names through the signal form and clears the field', async () => {
    fixture.componentInstance.tab.set('decks');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.newdeck input');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('.newdeck');
    input.value = '   ';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    expect(facade.createDeck).not.toHaveBeenCalled();
    input.value = ' Напитки ';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    fixture.detectChanges();
    await fixture.whenStable();
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(facade.createDeck).toHaveBeenCalledWith('Напитки');
    expect(input.value).toBe('');
  });
});

describe('Vocabulary delayed translations', () => {
  const matchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (matchMedia) Object.defineProperty(window, 'matchMedia', matchMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('updates tab, level and sort labels when the initial language finishes loading', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({matches: false, addEventListener() {}, removeEventListener() {}}),
    });
    const translations = new Subject<Record<string, unknown>>();
    TestBed.configureTestingModule({
      imports: [VocabularyPageComponent],
      providers: [
        provideRouter([]), {provide: VocabularyFacade, useValue: vocabularyMock()},
        {provide: KoreanTtsService, useValue: {speak: jest.fn()}},
        provideTranslateService({
          lang: 'ru', fallbackLang: 'ru',
          loader: {provide: TranslateLoader, useValue: {getTranslation: () => translations}},
        }),
      ],
    });
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(VocabularyPageComponent);
    fixture.detectChanges();
    const labels = () => Array.from(fixture.nativeElement.querySelectorAll('[role=button], [role=option]') as NodeListOf<HTMLElement>)
      .map(option => option.textContent?.trim());
    expect(labels()).not.toContain('Слова');

    translations.next({
      common: {all: 'Все'},
      vocabulary: {
        tabs: {words: 'Слова', decks: 'Колоды'},
        levels: {new: 'Новые', learned: 'Выученные'},
        sort: {due: 'По сроку', created: 'По добавлению', alpha: 'По алфавиту'},
      },
    });
    translations.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('app-basic-select .p-select') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(labels()).toEqual(expect.arrayContaining([
      'Слова', 'Колоды', 'Все', 'Новые', 'Выученные', 'По сроку', 'По добавлению', 'По алфавиту',
    ]));
    expect(labels().some(label => label?.startsWith('vocabulary.'))).toBe(false);
    fixture.destroy();
  });
});
