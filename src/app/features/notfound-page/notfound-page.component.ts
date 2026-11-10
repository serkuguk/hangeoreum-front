import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
    selector: 'app-notfound-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './notfound-page.component.html',
    styleUrl: './notfound-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotfoundPageComponent {

}
