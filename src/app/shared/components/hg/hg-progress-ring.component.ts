import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

/** Кольцо прогресса (SVG stroke-dashoffset), как в блоке «цель дня». */
@Component({
  selector: 'hg-progress-ring',
  template: `
    <div class="ring" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()">
        <circle [attr.cx]="half()" [attr.cy]="half()" [attr.r]="radius()"
                fill="none" stroke="var(--hg-card-2)" [attr.stroke-width]="stroke()"/>
        <circle [attr.cx]="half()" [attr.cy]="half()" [attr.r]="radius()"
                fill="none" [attr.stroke]="color()" [attr.stroke-width]="stroke()"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference()"
                [attr.stroke-dashoffset]="dashOffset()"
                [style.transform]="'rotate(-90deg)'"
                [style.transform-origin]="'center'"
                class="progress"/>
      </svg>
      <div class="hole"><ng-content/></div>
    </div>
  `,
  styles: `
    .ring { position: relative; flex-shrink: 0; }
    svg { display: block; }
    .progress { transition: stroke-dashoffset .6s ease; }
    .hole {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HgProgressRingComponent {
  /** 0–100 */
  readonly percent = input.required<number>();
  readonly size = input(84);
  readonly stroke = input(10);
  readonly color = input('var(--hg-jade)');

  readonly half = computed(() => this.size() / 2);
  readonly radius = computed(() => this.half() - this.stroke() / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.percent()));
    return this.circumference() * (1 - pct / 100);
  });
}
