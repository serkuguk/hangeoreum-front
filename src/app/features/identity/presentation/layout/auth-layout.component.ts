import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter, map, startWith} from 'rxjs/operators';

/** Split-layout auth-экранов: слева бренд-панель (контент зависит от страницы), справа форма. */
@Component({
  selector: 'hg-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth">
      <div class="brand">
        @if (page() === 'register') {
          <div class="ghost kr">길</div>
          <div class="mark">한</div>
          <h2>Начни свой<br>한걸음 сегодня.</h2>
          <p>Бесплатно. Учи слова, проходи уроки, следи за прогрессом и не теряй серию.</p>
          <div class="quote kr">시작이 반이다<small>Начало — половина дела</small></div>
        } @else {
          <div class="ghost kr">한</div>
          <div class="mark">한</div>
          <h2>С возвращением.<br>Продолжим путь.</h2>
          <p>Один урок сегодня — и ты ещё ближе к свободному корейскому.</p>
          <div class="quote kr">천 리 길도 한 걸음부터<small>Дорога в тысячу ли начинается с одного шага</small></div>
        }
      </div>
      <div class="formside">
        <router-outlet/>
      </div>
    </div>
  `,
  styles: `
    .auth {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;
    }

    .brand {
      position: relative;
      overflow: hidden;
      background: linear-gradient(150deg, var(--hg-blue), #5a2bcf);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px;

      .ghost { right: -40px; bottom: -80px; font-size: 340px; color: rgba(255, 255, 255, .07); }

      .mark {
        width: 54px;
        height: 54px;
        border-radius: 16px;
        background: rgba(255, 255, 255, .16);
        display: grid;
        place-items: center;
        font-family: var(--hg-font-display);
        font-size: 30px;
        margin-bottom: 30px;
      }

      h2 { font-size: var(--hg-fs-3xl); font-weight: 600; line-height: 1.2; margin-bottom: 16px; }
      p { font-size: 15px; opacity: .85; max-width: 340px; line-height: 1.6; }

      .quote {
        margin-top: 40px;
        font-family: var(--hg-font-display);
        font-size: 30px;

        small { display: block; font-family: var(--hg-font-ui); font-size: 14px; opacity: .8; margin-top: 6px; }
      }
    }

    .formside {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    @media (max-width: 860px) {
      .auth { grid-template-columns: 1fr; }
      .brand { display: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly page = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.firstChild?.snapshot?.url?.[0]?.path ?? 'login'),
    ),
    {initialValue: 'login'},
  );
}
