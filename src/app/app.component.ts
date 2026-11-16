import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {RouterOutlet} from '@angular/router';
import {ThemeService} from '@core/services/theme.service';
import {TranslateService} from '@ngx-translate/core';
import {take} from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: `
      <div class="bg-hangul" aria-hidden="true">
        <span style="--s:380;top:-9%;left:-6%;transform:rotate(-10deg)">한</span>
        <span style="--s:320;top:6%;right:-9%;transform:rotate(8deg)">걸</span>
        <span style="--s:300;bottom:-11%;left:10%;transform:rotate(4deg)">음</span>
        <span style="--s:260;bottom:4%;right:4%;transform:rotate(-6deg)">꿈</span>
        <span style="--s:230;top:44%;left:46%;transform:rotate(3deg)">길</span>
      </div>
      <router-outlet/>
    `,
    styles: `
      .bg-hangul {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;

        span {
          position: absolute;
          // glyphs scale with the viewport: at fixed desktop sizes they pile onto each other on a phone
          font-size: clamp(calc(var(--s) * .42px), calc(var(--s) * .083vw), calc(var(--s) * 1px));
          font-family: var(--hg-font-display);
          color: var(--hg-text);
          opacity: .04;
          line-height: .8;
          white-space: nowrap;
          user-select: none;
        }
      }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  constructor() {
    inject(ThemeService).init();
    const translate = inject(TranslateService);
    const title = inject(Title);
    const meta = inject(Meta);

    translate.get([
      'metadata.title',
      'metadata.description',
      'metadata.ogTitle',
      'metadata.ogDescription',
    ]).pipe(take(1)).subscribe(copy => {
      title.setTitle(copy['metadata.title']);
      meta.updateTag({name: 'description', content: copy['metadata.description']});
      meta.updateTag({property: 'og:title', content: copy['metadata.ogTitle']});
      meta.updateTag({property: 'og:description', content: copy['metadata.ogDescription']});
    });
  }
}
