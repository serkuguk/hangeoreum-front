import {Directive, HostListener, Input} from '@angular/core';

@Directive({
  selector: '[numberOnlyCopyPast]'
})
export class NumberOnlyCopyPastDirective {

  @Input() pasteType: string = 'default';
  @Input() isSpace: string = '';

  @HostListener('keyboard', ['$event'])
  onKeyBoard(event: KeyboardEvent) {
    if (event.metaKey) {
      if (event.key.toLowerCase() === 'a'
        || event.key.toLowerCase() === 'c'
        || event.key.toLowerCase() === 'v') {
        return;
      }
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    let dataToPaste = event.clipboardData?.getData('text') ?? '';

    // \\t: Representa un carácter de tabulación.
    // \\n: Representa un carácter de nueva línea.
    // \\r: Representa un carácter de retorno de carro.
    // \\f: Representa un carácter de avance de formulario.
    // \\v: Representa un carácter de tabulación vertical.
    let regEx: RegExp = new RegExp('^[0-9]*$');
    switch (this.pasteType) {
      case 'withDotAndComma':
        regEx = new RegExp('^[0-9\\-\\;\\ \\t\\n\\r\\f\\v]*$');
        break;
      case 'default':
      default:
        regEx = new RegExp('^[0-9]*$');
        break;
    }

    if (!regEx.test(dataToPaste)) {
      event.preventDefault();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Allow special keys
    if (['Delete',
      'Backspace',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Control',
      'Meta',
      'Shift',
      'Alt'].includes(event.key)) {
      return;
    }

    const isNumberKey = event.key >= '0' && event.key <= '9';
    const isSemicolon = event.key === ';';
    if ((this.pasteType === 'withDotAndComma' && (isNumberKey || isSemicolon)) || (this.pasteType === 'default' && isNumberKey)) {
      return;
    }

    // Allow pasting with Ctrl+V or Cmd+V
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'
      || (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      return;
    }

    event.preventDefault();
  }

  @HostListener('keydown.space', ['$event'])
  onSpaceKeyDown(event: KeyboardEvent) {
    if (this.pasteType === 'default' && event.key === ' ') {
      event.preventDefault();
    }
  }
}
