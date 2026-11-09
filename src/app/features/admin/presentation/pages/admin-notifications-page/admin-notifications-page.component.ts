import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {AdminApi} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, DialogComponent, TextareaComponent} from 'springest';

@Component({
  selector: 'hg-admin-notifications-page',
  imports: [TranslatePipe, FormField, ButtonComponent, BasicInputComponent, DialogComponent, TextareaComponent],
  templateUrl: './admin-notifications-page.component.html',
  styleUrls: ['../_admin.scss', './admin-notifications-page.component.scss'],
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
  readonly dialogOpen = computed(() => this.pendingSend() !== null);
  readonly sendDisabled = computed(() => this.sending() || !this.title().trim());
  readonly confirmationMessage = computed(() => this.translate.instant('admin.notifications.sendConfirm', {
    title: this.pendingSend()?.title ?? '',
  }));

  send(): void {
    if (this.sendDisabled() || this.dialogOpen()) return;
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
