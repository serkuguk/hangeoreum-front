import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminTip} from '../../infrastructure/admin.api';

@Component({
  selector: 'hg-admin-grammar-page',
  template: `
    <h2 class="pagettl">Грамматика · Learning Tips</h2>
    <p class="pagesub">Все подсказки курса. Редактирование — в конструкторе урока.</p>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>Заголовок</th><th>Правило</th></tr></thead>
        <tbody>
          @for (tip of tips(); track tip.id) {
            <tr>
              <td><b>{{ tip.title }}</b></td>
              <td class="body">{{ tip.bodyMd }}</td>
            </tr>
          } @empty {
            <tr><td colspan="2" class="empty">Tips пока нет — добавь через конструктор урока.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './_admin.scss',
  styles: `.body { color: var(--hg-muted); max-width: 560px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGrammarPageComponent {
  private api = inject(AdminApi);

  readonly tips = signal<AdminTip[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.tips().subscribe({
      next: tips => this.tips.set(tips),
      error: () => this.error.set('Не получилось загрузить tips.'),
    });
  }
}
