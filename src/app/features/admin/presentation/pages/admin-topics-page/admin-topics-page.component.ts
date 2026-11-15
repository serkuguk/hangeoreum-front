import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal} from '@angular/core';
import {AdminApi, Topic} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, DialogComponent, FilePickerComponent} from 'springest';

const TOPIC_ICON_ACCEPT = 'image/png,image/jpeg,image/webp';

@Component({
  selector: 'hg-admin-topics-page',
  imports: [TranslatePipe, FormField, ButtonComponent, BasicInputComponent, DialogComponent, FilePickerComponent],
  templateUrl: './admin-topics-page.component.html',
  styleUrls: ['../_admin.scss', './admin-topics-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopicsPageComponent {
  private api = inject(AdminApi);
  private translate = inject(TranslateService);

  readonly topics = signal<Topic[]>([]);
  readonly error = signal<string | null>(null);

  readonly draftCode = signal('');
  readonly draftCodeField = form(this.draftCode, path => required(path));
  readonly draftTitle = signal('');
  readonly draftTitleField = form(this.draftTitle, path => required(path));
  readonly draftIcon = signal('');
  readonly draftIconField = form(this.draftIcon);
  readonly createDisabled = computed(() => !this.draftCode() || !this.draftTitle());

  readonly editing = signal<Topic | null>(null);
  readonly deleting = signal<Topic | null>(null);
  readonly saving = signal(false);
  readonly dialogError = signal<string | null>(null);

  readonly editCode = signal('');
  readonly editCodeField = form(this.editCode, path => required(path));
  readonly editTitle = signal('');
  readonly editTitleField = form(this.editTitle, path => required(path));
  readonly editIcon = signal('');
  readonly editIconField = form(this.editIcon);
  readonly editDisabled = computed(() => this.saving() || !this.editCode().trim() || !this.editTitle().trim());
  readonly editVisible = computed(() => this.editing() !== null);
  readonly deleteVisible = computed(() => this.deleting() !== null);
  readonly deleteMessage = computed(() =>
    this.translate.instant('admin.topics.deleteConfirm', {title: this.deleting()?.title ?? ''}));

  readonly iconAccept = TOPIC_ICON_ACCEPT;
  readonly uploadingIcon = signal(false);

  constructor() {
    this.load();
  }

  /** Uploaded icons are stored as a media URL; anything else is an emoji/text icon. */
  isImageIcon(icon: string | null): boolean {
    return !!icon && (icon.startsWith('/') || icon.startsWith('http'));
  }

  onIconPicked(files: File[], target: WritableSignal<string>, errorTarget: WritableSignal<string | null>): void {
    const file = files[0];
    if (!file) return;
    errorTarget.set(null);
    this.uploadingIcon.set(true);
    this.api.uploadTopicIcon(file).subscribe({
      next: ({url}) => {
        this.uploadingIcon.set(false);
        target.set(url);
      },
      error: () => {
        this.uploadingIcon.set(false);
        errorTarget.set(this.translate.instant('admin.topics.uploadIconError'));
      },
    });
  }

  load(): void {
    this.api.topics().subscribe({
      next: topics => this.topics.set(topics),
      error: () => this.error.set(this.translate.instant('admin.topics.loadError')),
    });
  }

  create(): void {
    if (this.draftCodeField().invalid() || this.draftTitleField().invalid()) return;
    this.error.set(null);
    this.api.createTopic({code: this.draftCode().trim(), title: this.draftTitle().trim(), icon: this.draftIcon().trim() || null})
      .subscribe({
        next: () => {
          this.draftCodeField().reset('');
          this.draftTitleField().reset('');
          this.draftIconField().reset('');
          this.load();
        },
        error: () => this.error.set(this.translate.instant('admin.topics.createError')),
      });
  }

  rename(topic: Topic): void {
    this.dialogError.set(null);
    this.editCode.set(topic.code);
    this.editTitle.set(topic.title);
    this.editIcon.set(topic.icon ?? '');
    this.editing.set(topic);
  }

  saveEdit(): void {
    const topic = this.editing();
    if (!topic || this.editDisabled()) return;
    this.saving.set(true);
    this.api.updateTopic(topic.id, {code: this.editCode().trim(), title: this.editTitle().trim(), icon: this.editIcon().trim() || null})
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeDialogs();
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.dialogError.set(this.translate.instant('admin.topics.updateError'));
        },
      });
  }

  remove(topic: Topic): void {
    this.deleting.set(topic);
  }

  confirmDelete(): void {
    const topic = this.deleting();
    if (!topic) return;
    this.closeDialogs();
    this.api.deleteTopic(topic.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.topics.deleteError')),
    });
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeDialogs();
  }

  closeDialogs(): void {
    this.editing.set(null);
    this.deleting.set(null);
  }
}
