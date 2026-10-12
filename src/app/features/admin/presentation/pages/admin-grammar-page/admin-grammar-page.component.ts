import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminTip} from '@features/admin/infrastructure/admin.api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-admin-grammar-page',
  imports: [TranslatePipe],
  template: `
    <h2 class="pagettl">{{ 'admin.grammar.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.grammar.subtitle' | translate }}</p>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>{{ 'admin.grammar.tipTitle' | translate }}</th><th>{{ 'admin.grammar.rule' | translate }}</th></tr></thead>
        <tbody>
          @for (tip of tips(); track tip.id) {
            <tr>
              <td><b>{{ tip.title }}</b></td>
              <td class="body">{{ tip.bodyMd }}</td>
            </tr>
          } @empty {
            <tr><td colspan="2" class="empty">{{ 'admin.grammar.empty' | translate }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: '../_admin.scss',
  styles: `.body { color: var(--hg-muted); max-width: 560px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGrammarPageComponent {
  private api = inject(AdminApi);
  private translate = inject(TranslateService);

  readonly tips = signal<AdminTip[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.tips().subscribe({
      next: tips => this.tips.set(tips),
      error: () => this.error.set(this.translate.instant('admin.grammar.loadError')),
    });
  }
}
