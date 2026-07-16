import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ReviewFacade} from '../../../application/facades/review.facade';

@Component({
  selector: 'hg-review-hub-page',
  imports: [RouterLink],
  template: `
    <div class="wrap hubbox">
      <h2 class="pagettl">Review Dojo</h2>
      @if (facade.summary(); as summary) {
        <p class="pagesub">
          @if (summary.dueCount > 0) {
            Сегодня к повторению готово <b class="y">{{ summary.dueCount }} слов</b>. Выбери режим.
          } @else {
            Всё повторено! Загляни позже или пройди новый урок.
          }
        </p>
      } @else {
        <p class="pagesub">Выбери режим повторения.</p>
      }

      <div class="dojo">
        <a class="panel dtile" routerLink="/review/flashcards">
          <div class="ghost kr">뒤</div>
          <div class="ic c-b">🎴</div>
          <h3>Карточки 3D</h3>
          <p>Классика: лицо → переворот → самооценка. SM-2 сам решает, когда показать слово снова.</p>
          <span class="pill p-b cnt">{{ facade.summary()?.dueCount ?? '…' }} карточек ждут</span>
        </a>
        <a class="panel dtile" routerLink="/review/games">
          <div class="ghost kr">놀</div>
          <div class="ic c-y">🎮</div>
          <h3>Мини-игры</h3>
          <p>Match, Listen, Spell — быстрые визуальные раунды с таймером и комбо.</p>
          <span class="pill p-y cnt">Цель: 5 минут</span>
        </a>
        <a class="panel dtile" routerLink="/review/flashcards" [queryParams]="{quick: 1}">
          <div class="ghost kr">빠</div>
          <div class="ic c-j">⚡</div>
          <h3>Быстрый повтор</h3>
          <p>Смешанная сессия из самого срочного — идеально, когда времени в обрез.</p>
          <span class="pill p-j cnt">≈ 5 минут</span>
        </a>
        <a class="panel dtile" routerLink="/review/flashcards" [queryParams]="{difficult: 1}">
          <div class="ghost kr">어</div>
          <div class="ic c-r">🔥</div>
          <h3>Сложные слова</h3>
          <p>SRS собрал слова, которые ты забываешь чаще всего. Разберём их прицельно.</p>
          <span class="pill p-r cnt">{{ facade.summary()?.difficultCount ?? '…' }} слов буксуют</span>
        </a>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .hubbox { max-width: 820px; }
    .y { color: var(--hg-reward); }

    .dojo { display: grid; grid-template-columns: 1fr 1fr; gap: var(--hg-space-5); }

    .dtile {
      padding: 30px;
      cursor: pointer;
      transition: transform var(--hg-motion-nav), border-color var(--hg-motion-nav);
      text-decoration: none;
      color: var(--hg-text);

      &:hover { transform: translateY(-4px); border-color: var(--hg-route); }

      .ghost { right: -16px; bottom: -40px; font-size: 150px; }

      .ic {
        width: 52px;
        height: 52px;
        border-radius: var(--hg-radius-block);
        display: grid;
        place-items: center;
        font-size: 25px;
        margin-bottom: var(--hg-space-5);

        &.c-b { background: var(--hg-route-soft); }
        &.c-y { background: var(--hg-reward-soft); }
        &.c-j { background: var(--hg-success-soft); }
        &.c-r { background: var(--hg-danger-soft); }
      }

      h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
      p { font-size: 13.5px; color: var(--hg-text-muted); line-height: 1.55; }
      .cnt { margin-top: var(--hg-space-4); }
    }

    @media (max-width: 880px) {
      .dojo { grid-template-columns: 1fr; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewHubPageComponent {
  readonly facade = inject(ReviewFacade);

  constructor() {
    this.facade.loadSummary();
  }
}
