import {TestBed} from '@angular/core/testing';
import {TranslateService} from '@ngx-translate/core';
import {MascotComponent} from './mascot.component';

describe('MascotComponent', () => {
  it('keeps the original mascot, speech and pedestal by default', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('svg.hg-mascot__body')?.getAttribute('width')).toBe('216');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.hg-mascot__pedestal')).not.toBeNull();
    expect(element.querySelector('.hg-mascot__speech')?.textContent).toContain('화이팅! 🔥');
  });

  it('switches to an accessible image while preserving size, speech and pedestal inputs', () => {
    const fixture = TestBed.createComponent(MascotComponent);
    fixture.componentRef.setInput('imageSrc', 'assets/images/mascot-headphones.svg');
    fixture.componentRef.setInput('size', 180);
    fixture.componentRef.setInput('speech', '안녕하세요!');
    fixture.componentRef.setInput('pedestal', false);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const image = element.querySelector('img.hg-mascot__body');

    expect(image?.getAttribute('src')).toBe('assets/images/mascot-headphones.svg');
    expect(image?.getAttribute('width')).toBe('180');
    expect(image?.getAttribute('height')).toBe('180');
    expect(image?.getAttribute('alt')).toBe(TestBed.inject(TranslateService).instant('mascot.ariaLabel'));
    expect(element.querySelector('svg.hg-mascot__body')).toBeNull();
    expect(element.querySelector('.hg-mascot__pedestal')).toBeNull();
    expect(element.querySelector('.hg-mascot__speech')?.textContent).toContain('안녕하세요!');

    fixture.componentRef.setInput('imageSrc', '');
    fixture.componentRef.setInput('speech', '');
    fixture.detectChanges();
    expect(element.querySelector('svg.hg-mascot__body')).not.toBeNull();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.hg-mascot__speech')).toBeNull();
  });
});
