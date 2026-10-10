import {ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {TooltipModule} from 'primeng/tooltip';
import {ButtonComponent} from 'springest';

export interface HgSidebarItem {
  readonly link: string;
  readonly label: string;
  readonly icon: string;
  readonly exact?: boolean;
}

@Component({
  selector: 'hg-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TooltipModule, ButtonComponent],
  templateUrl: './hg-sidebar.component.html',
  styleUrl: './hg-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[class.expanded]': 'expanded()', '(document:keydown.escape)': 'dismiss()', '(document:click)': 'onOutsideClick($event)'},
})
export class HgSidebarComponent {
  readonly items = input.required<readonly HgSidebarItem[]>();
  readonly navLabel = input.required<string>();
  readonly footerItem = input<HgSidebarItem>();
  readonly expandLabel = input.required<string>();
  readonly collapseLabel = input.required<string>();
  readonly expanded = signal(false);
  readonly toggleLabel = computed(() => this.expanded() ? this.collapseLabel() : this.expandLabel());
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toggle = viewChild.required('toggle', {read: ElementRef<HTMLElement>});

  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) this.expanded.set(false);
    });
  }

  private isPrimeIcon(item: HgSidebarItem): boolean {
    return item.icon.startsWith('pi-');
  }

  iconClass(item: HgSidebarItem): string {
    return this.isPrimeIcon(item) ? `icon pi ${item.icon}` : 'icon';
  }

  iconGlyph(item: HgSidebarItem): string {
    return this.isPrimeIcon(item) ? '' : item.icon;
  }

  onOutsideClick(event: MouseEvent): void {
    const host = this.element.nativeElement;
    if (this.expanded() && (host.ownerDocument.defaultView?.innerWidth ?? 768) < 768
        && event.target instanceof Node && !host.contains(event.target)) this.dismiss();
  }

  dismiss(): void {
    if (!this.expanded()) return;
    this.expanded.set(false);
    this.toggle().nativeElement.querySelector('button')?.focus();
  }
}
