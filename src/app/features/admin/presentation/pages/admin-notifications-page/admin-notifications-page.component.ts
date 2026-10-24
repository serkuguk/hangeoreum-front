import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {AdminApi} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, DialogComponent, TextareaComponent} from 'springest';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [TranslatePipe, FormField, ButtonComponent, BasicInputComponent, DialogComponent, TextareaComponent],
  template: `
    <h2 class="pagettl">{{ 'admin.notifications.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.notifications.subtitle' | translate }}</p>

    @if (sent()) {
      <div class="okbar">{{ 'admin.notifications.sent' | translate }}</div>
    }

    <app-dialog [closeAriaLabel]="'common.closeDialog' | translate"
                [visible]="pendingSend() !== null" (visibleChange)="onDialogVisibleChange($event)"
                [header]="'admin.notifications.title' | translate" [closable]="!sending()" [closeOnEscape]="!sending()">
      <p>{{ confirmationMessage() }}</p>
      @if (error()) {
        <div class="errbar" role="alert">{{ error() }}</div>
      }
      <div dialogActions>
        <app-button [label]="'admin.notifications.send' | translate" [loading]="sending()" [disabled]="sending()"
                    (click)="confirmSend()" styleClass="hg-button"></app-button>
        <app-button [label]="'common.cancel' | translate" [disabled]="sending()"
                    (click)="closeDialog()" styleClass="hg-button hg-button--ghost"></app-button>
      </div>
    </app-dialog>

    <div class="panel form">
      <app-basic-input [label]="'admin.notifications.subject' | translate" [formField]="titleField" [placeholder]="'admin.notifications.subjectPlaceholder' | translate"/>
      <app-textarea [label]="'admin.notifications.body' | translate" [formField]="bodyField" [placeholder]="'admin.notifications.bodyPlaceholder' | translate"/>
      <app-button [label]="'admin.notifications.send' | translate" [loading]="sending()" [disabled]="sending() || !title().trim()" (click)="send()" styleClass="hg-button"></app-button>
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
  readonly pendingSend = signal<{title: string; body: string} | null>(null);
  readonly confirmationMessage = computed(() => this.translate.instant('admin.notifications.sendConfirm', {
    title: this.pendingSend()?.title ?? '',
  }));

  send(): void {
    if (this.sending() || this.pendingSend() || !this.title().trim()) return;
    this.error.set(null);
    this.pendingSend.set({title: this.title().trim(), body: this.body().trim()});
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeDialog();
  }

  closeDialog(): void {
    if (this.sending()) return;
    this.pendingSend.set(null);
    this.error.set(null);
  }

  confirmSend(): void {
    const pending = this.pendingSend();
    if (!pending || this.sending()) return;
    this.sending.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.api.broadcast(pending.title, pending.body).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.title.set('');
        this.body.set('');
        this.closeDialog();
      },
      error: () => {
        this.sending.set(false);
        this.error.set(this.translate.instant('admin.notifications.sendError'));
      },
    });
  }
}
