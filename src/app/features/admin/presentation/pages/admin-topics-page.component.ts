import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, Topic} from '../../infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent} from 'springest';

@Component({
  selector: 'hg-admin-topics-page',
  imports: [FormField, ButtonComponent, BasicInputComponent],
  template: `
    <h2 class="pagettl">Темы словаря</h2>
    <p class="pagesub">Категории слов: еда, знакомство, погода…</p>

    <div class="toolbar">
      <app-basic-input class="search" label="Code" placeholder="Например, food" [formField]="draftCodeField"/>
      <app-basic-input class="search" label="Название" [formField]="draftTitleField"/>
      <app-basic-input class="search icon" label="Иконка" placeholder="🍜" [formField]="draftIconField"/>
      <app-button label="Добавить" [disabled]="!draftCode() || !draftTitle()" (click)="create()" styleClass="hg-button"></app-button>
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
                <app-button label="Переименовать" (click)="rename(topic)" styleClass="hg-button hg-button--ghost hg-button--sm"></app-button>
                <app-button label="Удалить" (click)="remove(topic)" styleClass="hg-button hg-button--danger hg-button--sm"></app-button>
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

  readonly draftCode = signal('');
  readonly draftCodeField = form(this.draftCode, path => required(path));
  readonly draftTitle = signal('');
  readonly draftTitleField = form(this.draftTitle, path => required(path));
  readonly draftIcon = signal('');
  readonly draftIconField = form(this.draftIcon);

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
    if (this.draftCodeField().invalid() || this.draftTitleField().invalid()) return;
    this.api.createTopic({code: this.draftCode().trim(), title: this.draftTitle().trim(), icon: this.draftIcon().trim() || null})
      .subscribe({
        next: () => {
          this.draftCodeField().reset('');
          this.draftTitleField().reset('');
          this.draftIconField().reset('');
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
