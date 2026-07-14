import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ButtonModule} from "primeng/button";

export type ButtonType = 'button' | 'submit';
export type ButtonSizeType = "small" | "large";
export type ButtonIconPosition = 'left' | 'right' | 'top' | 'bottom';
export type badgeSeverityType = 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' | 'help' | 'primary';

@Component({
    selector: 'app-button',
    imports: [ButtonModule],
    templateUrl: './button.component.html',
    styleUrl: './button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
    type = input<ButtonType>('button');
    className = input<string>();
    style = input<Record<string, string | number>>();
    label = input<string>();
    iconPos = input<ButtonIconPosition>('left');
    styleClass = input<string>();
    icon = input<string>();
    disabled = input<boolean>(false);
    rounded = input<boolean>(false);
    badgeSeverity = input<badgeSeverityType>('warn');
    size = input<ButtonSizeType>('small');
    loading = input<boolean>(false);
}

