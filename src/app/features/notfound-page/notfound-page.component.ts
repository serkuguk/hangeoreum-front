import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
    selector: 'app-notfound-page',
    imports: [TranslatePipe],
    templateUrl: './notfound-page.component.html',
    styleUrl: './notfound-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotfoundPageComponent {

}
