import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'numberToDecimalPipe',
  pure: true
})
export class NumberToDecimalPipe implements PipeTransform {

  transform(value: string): any {
    if (!value) return '';
    value = String(value);
    let cleanedString = value.replace(/[^0-9,.]/g, '');
    cleanedString = cleanedString.replace('.', ',');
    return cleanedString;
  }
}
