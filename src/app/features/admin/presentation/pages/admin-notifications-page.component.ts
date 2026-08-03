import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApi} from '../../infrastructure/admin.api';
import {HgButtonComponent, HgInputComponent, HgTextareaComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [FormsModule, HgButtonComponent, HgInputComponent, HgTextareaComponent],
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
      <hg-input label="Заголовок" required [(ngModel)]="title" placeholder="Новые уроки уже в курсе!"/>
      <hg-textarea label="Текст" [(ngModel)]="body" placeholder="Юнит 3 «В кафе» опубликован…"/>
      <hg-button label="Отправить всем" [loading]="sending()" [disabled]="!title.trim()" (pressed)="send()"/>
    </div>
  `,
  styleUrl: './_admin.scss',
  styles: `
    .form {
      max-width: 560px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      hg-button { align-self: flex-start; }
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
