import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, TextareaComponent} from 'springest';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [TranslatePipe, FormField, ButtonComponent, BasicInputComponent, TextareaComponent],
  template: `
    <h2 class="pagettl">{{ 'admin.notifications.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.notifications.subtitle' | translate }}</p>

    @if (sent()) {
      <div class="okbar">{{ 'admin.notifications.sent' | translate }}</div>
    }
    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel form">
      <app-basic-input [label]="'admin.notifications.subject' | translate" [formField]="titleField" [placeholder]="'admin.notifications.subjectPlaceholder' | translate"/>
      <app-textarea [label]="'admin.notifications.body' | translate" [formField]="bodyField" [placeholder]="'admin.notifications.bodyPlaceholder' | translate"/>
      <app-button [label]="'admin.notifications.send' | translate" [loading]="sending()" [disabled]="!title().trim()" (click)="send()" styleClass="hg-button"></app-button>
    </div>
  `,
  styleUrl: '../_admin.scss',
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
  private translate = inject(TranslateService);

  readonly title = signal('');
  readonly titleField = form(this.title, path => required(path));
  readonly body = signal('');
  readonly bodyField = form(this.body);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  send(): void {
    if (this.sending() || !this.title().trim()) return;
    if (!confirm(this.translate.instant('admin.notifications.sendConfirm', {title: this.title()}))) return;
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
        this.error.set(this.translate.instant('admin.notifications.sendError'));
      },
    });
  }
}
