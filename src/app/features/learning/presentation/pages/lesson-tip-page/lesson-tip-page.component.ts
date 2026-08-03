import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Location} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {LessonFacade} from '../../../application/facades/lesson.facade';
import {TipExample} from '../../../domain/entities/exercise.entity';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

@Component({
  selector: 'hg-lesson-tip-page',
  imports: [RouterLink, HgButtonComponent],
  templateUrl: './lesson-tip-page.component.html',
  styleUrl: './lesson-tip-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonTipPageComponent {
  readonly id = input.required<string>();

  readonly facade = inject(LessonFacade);
  private location = inject(Location);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  constructor() {
    setTimeout(() => this.facade.loadTip(this.id()));
  }

  back(): void {
    this.location.back();
  }

  /** Экранируем текст и оборачиваем подсвечиваемые частицы (조사) в span. */
  highlighted(example: TipExample): SafeHtml {
    let html = escapeHtml(example.ko);
    for (const part of example.highlight ?? []) {
      html = html.split(escapeHtml(part)).join(`<span class="p">${escapeHtml(part)}</span>`);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
