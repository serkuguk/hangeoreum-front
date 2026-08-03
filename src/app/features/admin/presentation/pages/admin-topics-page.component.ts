import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AdminApi, Topic} from '../../infrastructure/admin.api';
import {HgButtonComponent, HgInputComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-admin-topics-page',
  imports: [FormsModule, HgButtonComponent, HgInputComponent],
  template: `
    <h2 class="pagettl">Темы словаря</h2>
    <p class="pagesub">Категории слов: еда, знакомство, погода…</p>

    <div class="toolbar">
      <hg-input class="search" label="Code" placeholder="Например, food" [(ngModel)]="draftCode"/>
      <hg-input class="search" label="Название" [(ngModel)]="draftTitle"/>
      <hg-input class="search icon" label="Иконка" placeholder="🍜" [(ngModel)]="draftIcon"/>
      <hg-button label="Добавить" [disabled]="!draftCode || !draftTitle" (pressed)="create()"/>
    </div>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th></th><th>Code</th><th>Название</th><th></th></tr></thead>
        <tbody>
          @for (topic of topics(); track topic.id) {
            <tr>
              <td>{{ topic.icon }}</td>
              <td>{{ topic.code }}</td>
              <td>{{ topic.title }}</td>
              <td>
                <hg-button label="Переименовать" variant="ghost" size="sm" (pressed)="rename(topic)"/>
                <hg-button label="Удалить" variant="danger" size="sm" (pressed)="remove(topic)"/>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="empty">Тем пока нет.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './_admin.scss',
  styles: `
    .icon { max-width: 90px; flex: 0; }
    .cta { padding: 11px 20px; font-size: 14px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopicsPageComponent {
  private api = inject(AdminApi);

  readonly topics = signal<Topic[]>([]);
  readonly error = signal<string | null>(null);

  draftCode = '';
  draftTitle = '';
  draftIcon = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.api.topics().subscribe({
      next: topics => this.topics.set(topics),
      error: () => this.error.set('Не получилось загрузить темы.'),
    });
  }

  create(): void {
    this.api.createTopic({code: this.draftCode.trim(), title: this.draftTitle.trim(), icon: this.draftIcon.trim() || null})
      .subscribe({
        next: () => {
          this.draftCode = this.draftTitle = this.draftIcon = '';
          this.load();
        },
        error: () => this.error.set('Не получилось создать тему (code должен быть уникальным).'),
      });
  }

  rename(topic: Topic): void {
    const title = prompt('Новое название:', topic.title)?.trim();
    if (!title) return;
    this.api.updateTopic(topic.id, {code: topic.code, title, icon: topic.icon}).subscribe(() => this.load());
  }

  remove(topic: Topic): void {
    if (!confirm(`Удалить тему «${topic.title}»?`)) return;
    this.api.deleteTopic(topic.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось удалить — тема используется словами.'),
    });
  }
}
