import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminTip} from '@features/admin/infrastructure/admin.api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-admin-grammar-page',
  imports: [TranslatePipe],
  templateUrl: './admin-grammar-page.component.html',
  styleUrls: ['../_admin.scss', './admin-grammar-page.component.scss'],
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
