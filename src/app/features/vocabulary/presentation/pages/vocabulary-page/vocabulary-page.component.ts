import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HgAudioButtonComponent} from '@shared/components/hg';
import {VocabularyFacade} from '../../../application/facades/vocabulary.facade';
import {UserWord} from '../../../domain/entities/user-word.entity';
import {Deck} from '../../../domain/repositories/vocabulary.repository';

const PAGE_SIZE = 20;

@Component({
  selector: 'hg-vocabulary-page',
  imports: [FormsModule, RouterLink, HgAudioButtonComponent],
  templateUrl: './vocabulary-page.component.html',
  styleUrl: './vocabulary-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabularyPageComponent {
  readonly facade = inject(VocabularyFacade);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly tab = signal<'words' | 'decks'>('words');
  readonly search = signal(this.route.snapshot.queryParamMap.get('search') ?? '');
  readonly level = signal<number | null>(numOrNull(this.route.snapshot.queryParamMap.get('level')));
  readonly sort = signal(this.route.snapshot.queryParamMap.get('sort') ?? 'due');
  readonly page = signal(0);
  readonly expandedId = signal<string | null>(null);
  readonly deckPickWord = signal<UserWord | null>(null);
  readonly newDeckTitle = signal('');

  readonly totalPages = computed(() => Math.ceil(this.facade.totalElements() / PAGE_SIZE));

  readonly levels = [
    {value: null, label: 'Все'},
    {value: 0, label: '☆ Новые'},
    {value: 1, label: '★ 1'},
    {value: 2, label: '★ 2'},
    {value: 3, label: '★ 3'},
    {value: 4, label: '★ 4'},
    {value: 5, label: '★★★ Выучено'},
  ];

  readonly sorts = [
    {value: 'due', label: 'По сроку'},
    {value: 'created', label: 'По дате'},
    {value: 'alpha', label: 'По алфавиту'},
  ];

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

  setLevel(level: number | null): void {
    this.level.set(level);
    this.page.set(0);
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
    if (days <= 0) return 'сегодня';
    if (days === 1) return 'завтра';
    return `через ${days} д`;
  }

  toggleExpand(word: UserWord): void {
    this.expandedId.update(id => id === word.id ? null : word.id);
  }

  createDeck(): void {
    const title = this.newDeckTitle().trim();
    if (!title) return;
    this.facade.createDeck(title);
    this.newDeckTitle.set('');
  }

  renameDeck(deck: Deck): void {
    const title = prompt('Новое название колоды:', deck.title)?.trim();
    if (title) this.facade.renameDeck(deck, title);
  }

  deleteDeck(deck: Deck): void {
    if (confirm(`Удалить колоду «${deck.title}»?`)) this.facade.deleteDeck(deck);
  }

  addToDeck(deck: Deck): void {
    const word = this.deckPickWord();
    if (word) this.facade.addToDeck(deck.id, word.word.id);
    this.deckPickWord.set(null);
  }
}

function numOrNull(value: string | null): number | null {
  return value === null || value === '' ? null : +value;
}
