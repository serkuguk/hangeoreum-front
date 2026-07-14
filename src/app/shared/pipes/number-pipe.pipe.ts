import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberPipe',
  pure: true
})
export class NumberPipe implements PipeTransform {

  transform(value: string):any {
    let retNumber = Number(parseFloat(value));
    return isNaN(retNumber) ? '' : retNumber;
  }
}
