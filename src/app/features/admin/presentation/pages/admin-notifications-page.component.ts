import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi} from '../../infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, TextareaComponent} from 'springest';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [FormField, ButtonComponent, BasicInputComponent, TextareaComponent],
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
      <app-basic-input label="Заголовок" [formField]="titleField" placeholder="Новые уроки уже в курсе!"/>
      <app-textarea label="Текст" [formField]="bodyField" placeholder="Юнит 3 «В кафе» опубликован…"/>
      <app-button label="Отправить всем" [loading]="sending()" [disabled]="!title().trim()" (click)="send()" styleClass="hg-button"></app-button>
    </div>
  `,
  styleUrl: './_admin.scss',
  styles: `
    .form {
      max-width: 560px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      app-button { align-self: flex-start; }
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

  readonly title = signal('');
  readonly titleField = form(this.title, path => required(path));
  readonly body = signal('');
  readonly bodyField = form(this.body);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  send(): void {
    if (this.sending() || !this.title().trim()) return;
    if (!confirm(`Отправить рассылку «${this.title()}» всем пользователям?`)) return;
    this.sending.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.api.broadcast(this.title().trim(), this.body().trim()).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.title.set('');
        this.body.set('');
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Не получилось отправить.');
      },
    });
  }
}
