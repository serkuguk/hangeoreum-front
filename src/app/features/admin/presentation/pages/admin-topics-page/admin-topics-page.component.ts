import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {AdminApi, Topic} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent} from 'springest';

@Component({
  selector: 'hg-admin-topics-page',
  imports: [TranslatePipe, FormField, ButtonComponent, BasicInputComponent],
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

  constructor() {
    this.load();
  }

  load(): void {
    this.api.topics().subscribe({
      next: topics => this.topics.set(topics),
      error: () => this.error.set(this.translate.instant('admin.topics.loadError')),
    });
  }

  create(): void {
    if (this.draftCodeField().invalid() || this.draftTitleField().invalid()) return;
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
    const title = prompt(this.translate.instant('admin.topics.renamePrompt'), topic.title)?.trim();
    if (!title) return;
    this.api.updateTopic(topic.id, {code: topic.code, title, icon: topic.icon}).subscribe(() => this.load());
  }

  remove(topic: Topic): void {
    if (!confirm(this.translate.instant('admin.topics.deleteConfirm', {title: topic.title}))) return;
    this.api.deleteTopic(topic.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.topics.deleteError')),
    });
  }
}
