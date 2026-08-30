import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';

// ponytail: статичная страница — одна, без domain-слоя и дробления на hero/feature-grid/…
@Component({
  selector: 'hg-landing-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly features = [
    {
      ghost: '문', icon: '📖', color: 'blue', title: 'landing.features.understanding.title', text: 'landing.features.understanding.text', src: 'landing.features.understanding.source',
    },
    {
      ghost: '놀', icon: '🎴', color: 'yellow', title: 'landing.features.cards.title', text: 'landing.features.cards.text', src: 'landing.features.cards.source',
    },
    {
      ghost: '말', icon: '🎬', color: 'red', title: 'landing.features.speech.title', text: 'landing.features.speech.text', src: 'landing.features.speech.source',
    },
  ];

  readonly year = new Date().getFullYear();
}
