import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {Avatar} from "primeng/avatar";
import {OverlayBadge} from "primeng/overlaybadge";

@Component({
    selector: 'app-avatar',
    standalone: true,
    imports: [
        Avatar,
        OverlayBadge
    ],
    templateUrl: './avatar.component.html',
    styleUrl: './avatar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarComponent {
    icon = input<string>("pi pi-user");
    className = input<string>();
    size = input<"normal" | "large" | "xlarge">("normal");
    style = input<any>();
    label = input<string>();
    shape = input<"square" | "circle">("circle");
    iconType = input<string>("icon");
    imageUrl = input<string>();
    overlayBadge = input<boolean>(false);
}
