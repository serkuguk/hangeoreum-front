import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'dateTimeFormaterPipe',
  pure: true
})
export class DateTimeFormaterPipe implements PipeTransform {

  transform(value: string): any {
    if (!value) return '';

    const [date, time] = value.split('T');
    const reversedDate = this.dateStringToDate(date);
    return `${reversedDate} ${time}`;
  }

  private dateStringToDate(dateStr: string): string {
    return dateStr.split('-').reverse().join('-');
  }
}
