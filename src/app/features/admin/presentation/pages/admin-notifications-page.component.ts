import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApi} from '../../infrastructure/admin.api';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [FormsModule],
  template: `
    <h2 class="pagettl">Уведомления</h2>
    <p class="pagesub">Системная рассылка — уходит всем пользователям (in-app).</p>

    @if (sent()) {
      <div class="okbar">✓ Рассылка отправлена</div>
    }
    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel form">
      <label>Заголовок *
        <input [(ngModel)]="title" placeholder="Новые уроки уже в курсе!">
      </label>
      <label>Текст
        <textarea [(ngModel)]="body" placeholder="Юнит 3 «В кафе» опубликован…"></textarea>
      </label>
      <button type="button" class="cta" [disabled]="!title.trim() || sending()" (click)="send()">
        {{ sending() ? 'Отправляем…' : 'Отправить всем' }}
      </button>
    </div>
  `,
  styleUrl: './_admin.scss',
  styles: `
    .form {
      max-width: 560px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      label { font-size: 12px; color: var(--hg-muted); display: flex; flex-direction: column; gap: 6px; }

      input, textarea {
        background: var(--hg-card-2);
        border: 1px solid var(--hg-line);
        border-radius: 10px;
        padding: 11px 13px;
        color: var(--hg-txt);
        font-size: 14px;
        font-family: inherit;
      }

      textarea { min-height: 110px; }
      .cta { align-self: flex-start; padding: 13px 26px; }
    }

    .okbar {
      background: rgba(31, 199, 155, .12);
      border: 1px solid rgba(31, 199, 155, .4);
      color: var(--hg-jade);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 14px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNotificationsPageComponent {
  private api = inject(AdminApi);

  title = '';
  body = '';
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  send(): void {
    if (!confirm(`Отправить рассылку «${this.title}» всем пользователям?`)) return;
    this.sending.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.api.broadcast(this.title.trim(), this.body.trim()).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.title = '';
        this.body = '';
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Не получилось отправить.');
      },
    });
  }
}
