import {ChangeDetectionStrategy, Component, booleanAttribute, input, output} from '@angular/core';
export type HgButtonType = 'button' | 'submit' | 'reset';
export type HgButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type HgControlSize = 'sm' | 'md' | 'lg';
@Component({
  selector: 'hg-button',
  template: `<button [attr.type]="type()" [class]="'button ' + variant() + ' ' + size()" [class.block]="block()" [disabled]="disabled() || loading()" [attr.aria-label]="ariaLabel() || label() || null" [attr.aria-busy]="loading() || null" (click)="pressed.emit($event)">
    @if (loading()) { <span class="spinner" aria-hidden="true"></span> } @else if (icon()) { <span aria-hidden="true">{{ icon() }}</span> }
    @if (label()) { <span>{{ label() }}</span> }<ng-content />
  </button>`,
  styles: `:host{display:inline-block}.button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.75rem;border:1px solid transparent;border-radius:var(--hg-radius-control,.75rem);padding:.65rem 1rem;font:inherit;font-weight:700;cursor:pointer;transition:.15s}.button:hover:not(:disabled){transform:translateY(-1px)}.button:focus-visible{outline:3px solid color-mix(in srgb,var(--hg-blue,#4f67ff) 35%,transparent);outline-offset:2px}.button:disabled{cursor:not-allowed;opacity:.58}.primary{background:var(--hg-blue,#4f67ff);color:#fff}.secondary{background:var(--hg-card-2,#eef1f7);color:var(--hg-text,#172033);border-color:var(--hg-border,#d8deea)}.ghost{background:transparent;color:var(--hg-text,#172033);border-color:var(--hg-border,#d8deea)}.danger{background:var(--hg-danger,#d13c4c);color:#fff}.sm{min-height:2.25rem;padding:.4rem .7rem;font-size:.875rem}.lg{min-height:3.25rem;padding:.8rem 1.25rem;font-size:1.05rem}.block{width:100%}.spinner{width:1em;height:1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .65s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HgButtonComponent {
  readonly label=input(''); readonly type=input<HgButtonType>('button'); readonly variant=input<HgButtonVariant>('primary'); readonly size=input<HgControlSize>('md'); readonly icon=input('');
  readonly loading=input(false,{transform:booleanAttribute}); readonly disabled=input(false,{transform:booleanAttribute}); readonly block=input(false,{transform:booleanAttribute}); readonly ariaLabel=input<string|null>(null); readonly pressed=output<MouseEvent>();
}
