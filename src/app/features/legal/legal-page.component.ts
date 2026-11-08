import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {map} from 'rxjs';
import {LegalDoc} from './legal-doc';

interface LegalSection {
  heading: string;
  body: string;
}

/** Static legal text (privacy policy / terms) for /privacy and /terms, picked by route data `doc`. */
@Component({
  selector: 'hg-legal-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPageComponent {
  private readonly doc = toSignal(
    inject(ActivatedRoute).data.pipe(map(data => data['doc'] as LegalDoc)),
    {initialValue: LegalDoc.Privacy},
  );

  readonly titleKey = computed(() => `legal.${this.doc()}.title`);
  readonly sectionsKey = computed(() => `legal.${this.doc()}.sections`);

  /** translate pipe returns the raw JSON array for an array key. */
  asSections(value: unknown): LegalSection[] {
    return Array.isArray(value) ? value : [];
  }
}
