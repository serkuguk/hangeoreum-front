import {ChangeDetectionStrategy, Component, booleanAttribute, input} from '@angular/core';

/** Маскот «걸음이» — тигрёнок в обанссэк-палитре. */
@Component({
  selector: 'hg-mascot',
  templateUrl: './mascot.component.html',
  styleUrl: './mascot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MascotComponent {
  /** Реплика в облачке; пустая строка прячет облачко */
  readonly speech = input('화이팅! 🔥');
  readonly size = input(216);
  /** Показывать подиум-плиту под маскотом */
  readonly pedestal = input(true, {transform: booleanAttribute});
}
