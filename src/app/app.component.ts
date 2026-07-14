import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ThemeService} from '@core/services/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: `
      <div class="bg-hangul" aria-hidden="true">
        <span style="top:-9%;left:-6%;font-size:380px;transform:rotate(-10deg)">한</span>
        <span style="top:6%;right:-9%;font-size:320px;transform:rotate(8deg)">걸</span>
        <span style="bottom:-11%;left:10%;font-size:300px;transform:rotate(4deg)">음</span>
        <span style="bottom:4%;right:4%;font-size:260px;transform:rotate(-6deg)">꿈</span>
        <span style="top:44%;left:46%;font-size:230px;transform:rotate(3deg)">길</span>
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
          font-family: var(--hg-font-display);
          color: rgba(255, 255, 255, .04);
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
  }
}
