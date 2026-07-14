import {ChangeDetectionStrategy, Component, input, model, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FormValueControl} from '@angular/forms/signals';
import {DatePickerModule} from 'primeng/datepicker';
import {FloatLabelModule} from 'primeng/floatlabel';

@Component({
    selector: 'global-calendar',
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss'],
    imports: [DatePickerModule, FloatLabelModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements FormValueControl<Date | null> {

    public placeholder = input<string>();
    public maxDate = input<Date>();
    public minDate = input<Date>();
    public disabled = input<boolean>(false);
    public touched = model<boolean>(false);
    public value = model<Date | null>(null);
    public changed = output<Date | null>();
    public closed = output<void>();

    onChanged(event: Date | null): void {
        this.value.set(event);
        this.changed.emit(event);
    }

    onClosed(): void {
        this.touched.set(true);
        this.closed.emit();
    }
}
