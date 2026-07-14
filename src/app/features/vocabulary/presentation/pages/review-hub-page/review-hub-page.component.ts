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
    .y { color: var(--hg-yellow); }

    .dojo { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

    .dtile {
      padding: 30px;
      cursor: pointer;
      transition: .2s;
      text-decoration: none;
      color: var(--hg-txt);

      &:hover { transform: translateY(-4px); border-color: rgba(255, 255, 255, .18); }

      .ghost { right: -16px; bottom: -40px; font-size: 150px; }

      .ic {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        font-size: 25px;
        margin-bottom: 18px;

        &.c-b { background: rgba(59, 107, 255, .15); }
        &.c-y { background: rgba(255, 194, 60, .15); }
        &.c-j { background: rgba(31, 199, 155, .15); }
        &.c-r { background: rgba(255, 77, 94, .15); }
      }

      h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
      p { font-size: 13.5px; color: var(--hg-muted); line-height: 1.55; }
      .cnt { margin-top: 16px; }
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
