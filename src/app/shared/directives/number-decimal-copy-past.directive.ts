import {Directive, ElementRef, HostListener, Input} from '@angular/core';

@Directive({
  selector: '[numberDecimalCopyPast]',
  standalone: true
})
export class NumberDecimalCopyPastDirective {

  @Input() decimalPlaces: number | undefined;

  constructor(private el: ElementRef) {
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    let dataToPaste = event.clipboardData?.getData('text');
    let regEx = new RegExp('^[0-9\,]*$');

    if (dataToPaste && !regEx.test(dataToPaste)) {
      event.preventDefault();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Allow special keys
    if (['Delete',
      'Backspace',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Control',
      'Meta',
      'Shift',
      'Alt'].includes(event.key)) {
      return;
    }

    // Allow numbers, symbol - and decimal comma
    if ((Number(event.key) >= 0 && Number(event.key) <= 9) || event.key === ',') {
      return;
    }

    // Allow pasting with Ctrl+V or Cmd+V
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'
      || (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      return;
    }

    event.preventDefault();
  }

  @HostListener('input', ['$event'])
  onInputChange(event: Event) {
    const input = this.el.nativeElement as HTMLInputElement;
    const value = input.value;

    if (value.match(/^\d+,$/) || value.match(/^\d*$/)) {
      return;
    }

    if (this.isValidNumber(value)) {
      const parts = value.split(',');
      let integerPart = parts[0];
      let fractionalPart = parts[1] || '';

      if (integerPart.length > 4) {
        integerPart = integerPart.slice(0, 4);
      }

      if (fractionalPart) {
        fractionalPart = fractionalPart.slice(0, this.decimalPlaces);
      }

      input.value = integerPart + (fractionalPart.length > 0 ? ',' + fractionalPart : '');
    } else {
      input.value = input.value.slice(0, -1);
    }
  }

  isValidNumber(value: string): boolean {
    const regex = /^\d{0,4}(,\d*)?$/;
    return regex.test(value);
  }
}
