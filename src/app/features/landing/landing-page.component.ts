import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';

// ponytail: статичная страница — одна, без domain-слоя и дробления на hero/feature-grid/…
@Component({
  selector: 'hg-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly features = [
    {
      ghost: '문', icon: '📖', color: 'blue', title: 'Сначала понимание',
      text: 'Каждый урок начинается с короткого «Learning Tip» — одно правило грамматики, разобранное на живых примерах с подсветкой частиц.',
      src: 'Подход LingoDeer',
    },
    {
      ghost: '놀', icon: '🎴', color: 'yellow', title: 'Карточки и мини-игры',
      text: 'Слова закрепляются визуально: 3D-карточки, match, listen, spell. Алгоритм SRS сам подбирает то, что ты вот-вот забудешь.',
      src: 'Подход Drops',
    },
    {
      ghost: '말', icon: '🎬', color: 'red', title: 'Речь настоящих носителей',
      text: 'Видео-Story после каждого юнита и лента Immerse с короткими клипами. Никакой синтетики — только живой корейский.',
      src: 'Подход Memrise',
    },
  ];

  readonly year = new Date().getFullYear();
}
