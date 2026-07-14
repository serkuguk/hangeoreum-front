import {ChangeDetectionStrategy, Component, HostListener, computed, inject, input, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {HgAudioButtonComponent} from '@shared/components/hg';
import {ReviewFacade} from '../../../application/facades/review.facade';
import {SrsQuality} from '../../../domain/entities/user-word.entity';

@Component({
  selector: 'hg-flashcards-page',
  imports: [RouterLink, HgAudioButtonComponent],
  templateUrl: './flashcards-page.component.html',
  styleUrl: './flashcards-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlashcardsPageComponent {
  // query params: quick=1 → лимит 10, difficult=1 → только сложные
  readonly quick = input<string | undefined>();
  readonly difficult = input<string | undefined>();

  readonly facade = inject(ReviewFacade);
  private router = inject(Router);

  readonly isFlipped = signal(false);
  readonly accuracy = computed(() => {
    const answered = this.facade.index();
    return answered === 0 ? 100 : Math.round(this.facade.correctCount() / answered * 100);
  });

  readonly ratings: {quality: SrsQuality; label: string; cls: string}[] = [
    {quality: 1, label: 'Снова', cls: 'again'},
    {quality: 3, label: 'Трудно', cls: 'hard'},
    {quality: 4, label: 'Хорошо', cls: 'good'},
    {quality: 5, label: 'Легко', cls: 'easy'},
  ];

  constructor() {
    setTimeout(() => this.facade.start('FLASHCARDS', {
      limit: this.quick() ? 10 : undefined,
      difficultOnly: !!this.difficult(),
    }));
  }

  flip(): void {
    this.isFlipped.update(v => !v);
  }

  rate(quality: SrsQuality): void {
    this.isFlipped.set(false);
    this.facade.rate(quality);
  }

  again(): void {
    this.router.navigate(['/review']);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.facade.current()) return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.flip();
    }
    if (this.isFlipped() && ['1', '2', '3', '4'].includes(event.key)) {
      this.rate(this.ratings[+event.key - 1].quality);
    }
  }
}
