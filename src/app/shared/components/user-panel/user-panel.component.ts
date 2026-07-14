import {ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, OnInit, signal} from '@angular/core';
import {AsyncPipe} from "@angular/common";
import * as fromAuth from "@pages/auth";

import {select, Store} from "@ngrx/store";
import * as fromLoginAction from "@pages/auth/store/user.actions";
import * as fromLoginSelectors from "@pages/auth/store/user.selectors";
import {Observable} from "rxjs";

const ROLE_COLOR: Record<string, string> = {
    admin:     '#8B4513',
    librarian: '#2D5016',
    reader:    '#1A5A8A',
};

const ROLE_LABEL: Record<string, string> = {
    admin:     'Администратор',
    librarian: 'Библиотекарь',
    reader:    'Читатель',
};

@Component({
    selector: 'app-user-panel',
    imports: [AsyncPipe],
    templateUrl: './user-panel.component.html',
    styleUrl: './user-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPanelComponent implements OnInit {
    private readonly store: Store<fromAuth.State> = inject(Store);
    private elementRef = inject(ElementRef);

    public userData$: Observable<any | null> | undefined;
    public showPanel = signal<boolean>(false);

    private userData = signal<any>(null);

    public userInitials = computed<string>(() => {
        const name: string = this.userData()?.username ?? '';
        return name
            .split(/[\s._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w: string) => w[0].toUpperCase())
            .join('');
    });

    public roleColor = computed<string>(() => {
        const role: string = this.userData()?.role ?? '';
        return ROLE_COLOR[role] ?? ROLE_COLOR['librarian'];
    });

    public roleLabel = computed<string>(() => {
        const role: string = this.userData()?.role ?? '';
        return ROLE_LABEL[role] ?? 'Библиотекарь';
    });

    ngOnInit(): void {
        this.userData$ = this.store.pipe(select(fromLoginSelectors.getUser));
        this.userData$.subscribe(u => this.userData.set(u));
    }

    public userMenuToggle(): void {
        this.showPanel.update(v => !v);
    }

    @HostListener('document:click', ['$event'])
    public onClosePanelExternalClick(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target as HTMLElement) && this.showPanel()) {
            this.showPanel.set(false);
        }
    }

    public logout(): void {
        this.store.dispatch(fromLoginAction.logOut({user: null}));
    }
}
