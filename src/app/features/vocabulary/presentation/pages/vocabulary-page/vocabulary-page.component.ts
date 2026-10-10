import {FormField, form, required} from '@angular/forms/signals';
import {ButtonComponent, BasicInputComponent, BasicSelectComponent, SegmentedControlComponent, DialogComponent, PaginationComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, of} from 'rxjs';
import {HgAudioButtonComponent} from '@shared/components/hg';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {UserWord} from '@features/vocabulary/domain/entities/user-word.entity';
import {Deck} from '@features/vocabulary/domain/repositories/vocabulary.repository';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

const PAGE_SIZE = 20;

const VocabularyTab = {WORDS: 'words', DECKS: 'decks'} as const;
type VocabularyTab = typeof VocabularyTab[keyof typeof VocabularyTab];

@Component({
  selector: 'hg-vocabulary-page',
  imports: [
    FormField,
    RouterLink,
    HgAudioButtonComponent,
    ButtonComponent,
    DialogComponent,
    BasicInputComponent,
    BasicSelectComponent,
    PaginationComponent,
    SegmentedControlComponent,
    TranslatePipe,
  ],
  templateUrl: './vocabulary-page.component.html',
  styleUrl: './vocabulary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabularyPageComponent {
  readonly facade = inject(VocabularyFacade);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private readonly optionLabels = toSignal<Record<string, string>, Record<string, string>>(this.translate.stream([
    'vocabulary.tabs.words', 'vocabulary.tabs.decks', 'common.all',
    'vocabulary.levels.new', 'vocabulary.levels.learned',
    'vocabulary.sort.due', 'vocabulary.sort.created', 'vocabulary.sort.alpha',
  ]).pipe(catchError(() => of({}))), {initialValue: {}});

  readonly tab = signal<VocabularyTab>(VocabularyTab.WORDS);
  readonly search = signal(this.route.snapshot.queryParamMap.get('search') ?? '');
  readonly level = signal<number | null>(numOrNull(this.route.snapshot.queryParamMap.get('level')));
  readonly sort = signal(this.route.snapshot.queryParamMap.get('sort') ?? 'due');
  readonly page = signal(0);
  readonly expandedId = signal<string | null>(null);
  readonly deckPickWord = signal<UserWord | null>(null);
  readonly newDeckTitle = signal('');
  readonly deckForm = form(this.newDeckTitle, path => required(path));
  readonly defaultWordImage = '/assets/illustrations/word-default.svg';
  private readonly failedImageUrls = signal(new Set<string>());

  readonly pageSize = PAGE_SIZE;
  readonly isWordsTab = computed(() => this.tab() === VocabularyTab.WORDS);
  readonly firstRow = computed(() => this.page() * PAGE_SIZE);
  readonly totalPages = computed(() => Math.ceil(this.facade.totalElements() / PAGE_SIZE));

  readonly tabs = computed(() => [
    {value: VocabularyTab.WORDS, label: this.optionLabels()['vocabulary.tabs.words'] ?? ''},
    {value: VocabularyTab.DECKS, label: this.optionLabels()['vocabulary.tabs.decks'] ?? ''},
  ]);

  readonly levels = computed(() => [
    {value: null, label: this.optionLabels()['common.all'] ?? ''},
    {value: 0, label: this.optionLabels()['vocabulary.levels.new'] ?? ''},
    {value: 1, label: '★ 1'},
    {value: 2, label: '★ 2'},
    {value: 3, label: '★ 3'},
    {value: 4, label: '★ 4'},
    {value: 5, label: this.optionLabels()['vocabulary.levels.learned'] ?? ''},
  ]);

  readonly sorts = computed(() => [
    {value: 'due', label: this.optionLabels()['vocabulary.sort.due'] ?? ''},
    {value: 'created', label: this.optionLabels()['vocabulary.sort.created'] ?? ''},
    {value: 'alpha', label: this.optionLabels()['vocabulary.sort.alpha'] ?? ''},
  ]);

  constructor() {
    // фильтры → запрос (дебаунс в фасаде) + шеримая ссылка в query params
    effect(() => {
      const query = {
        search: this.search() || undefined,
        level: this.level() ?? undefined,
        sort: this.sort(),
        page: this.page(),
        size: PAGE_SIZE,
      };
      this.facade.search(query);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {search: query.search ?? null, level: query.level ?? null, sort: query.sort},
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
    this.facade.loadDecks();
  }

  setTab(value: unknown): void {
    if (Object.values<unknown>(VocabularyTab).includes(value)) this.tab.set(value as VocabularyTab);
  }

  setSort(value: unknown): void {
    if (typeof value !== 'string') return;
    this.sort.set(value);
    this.page.set(0);
  }

  setLevel(level: unknown): void {
    if (level !== null && typeof level !== 'number') return;
    this.level.set(level);
    this.page.set(0);
  }

  difficultLabelKey(word: UserWord): string {
    return word.isDifficult ? 'vocabulary.removeDifficult' : 'vocabulary.markDifficult';
  }

  difficultClass(word: UserWord): string {
    return word.isDifficult ? 'hg-native-button diffbtn on' : 'hg-native-button diffbtn';
  }

  wordAria(word: UserWord): string {
    return `${word.word.hangul}, ${word.word.translation}`;
  }

  stateClass(word: UserWord): string {
    return `state-${this.wordState(word)}`;
  }

  rowAria(word: UserWord): Record<string, string | boolean> {
    return {
      'aria-expanded': this.expandedId() === word.id,
      'aria-controls': word.word.exampleKo ? this.exampleId(word) : '',
      'aria-label': this.wordAria(word),
    };
  }

  exampleId(word: UserWord): string {
    return `word-example-${word.id}`;
  }

  stars(word: UserWord): string {
    return '★'.repeat(Math.min(5, word.level)) + '☆'.repeat(Math.max(0, 5 - word.level));
  }

  /** Состояние слова для визуального разделения строки — не только цвет звёзд. */
  wordState(word: UserWord): 'new' | 'difficult' | 'due' | 'learned' {
    if (word.level === 0) return 'new';
    if (word.isDifficult) return 'difficult';
    if (new Date(word.dueDate).getTime() <= Date.now()) return 'due';
    return 'learned';
  }

  dueLabel(word: UserWord): string {
    const days = Math.ceil((new Date(word.dueDate).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) return this.translate.instant('vocabulary.due.today');
    if (days === 1) return this.translate.instant('vocabulary.due.tomorrow');
    return this.translate.instant('vocabulary.due.inDays', {days});
  }

  toggleExpand(word: UserWord): void {
    this.expandedId.update(id => id === word.id ? null : word.id);
  }

  imageUrl(url: string | null): string {
    const imageUrl = url?.trim();
    return imageUrl && !this.failedImageUrls().has(imageUrl) ? imageUrl : this.defaultWordImage;
  }

  onImageError(url: string | null): void {
    const imageUrl = url?.trim();
    if (!imageUrl || imageUrl === this.defaultWordImage || this.failedImageUrls().has(imageUrl)) return;
    this.failedImageUrls.update(urls => new Set(urls).add(imageUrl));
  }

  createDeck(): void {
    const title = this.newDeckTitle().trim();
    if (!title) return;
    this.facade.createDeck(title);
    this.newDeckTitle.set('');
  }

  renameDeck(deck: Deck): void {
    const title = prompt(this.translate.instant('vocabulary.deck.renamePrompt'), deck.title)?.trim();
    if (title) this.facade.renameDeck(deck, title);
  }

  deleteDeck(deck: Deck): void {
    if (confirm(this.translate.instant('vocabulary.deck.deleteConfirm', {title: deck.title}))) this.facade.deleteDeck(deck);
  }

  addToDeck(deck: Deck): void {
    const word = this.deckPickWord();
    if (word) this.facade.addToDeck(deck.id, word.word.id);
    this.deckPickWord.set(null);
  }

  closeDeckPicker(): void {
    this.deckPickWord.set(null);
  }
}

function numOrNull(value: string | null): number | null {
  return value === null || value === '' ? null : +value;
}
