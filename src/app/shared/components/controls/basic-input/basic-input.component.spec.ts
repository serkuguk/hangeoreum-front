import { ComponentFixture, TestBed } from '@angular/core/testing';
import {FormControl} from "@angular/forms";

import { BasicInputComponent } from './basic-input.component';

describe('BasicInputComponent', () => {
  let component: BasicInputComponent;
  let fixture: ComponentFixture<BasicInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasicInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync the input value with the provided form control', () => {
    const control = new FormControl('Initial value');

    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('Initial value');

    control.setValue('Updated value');
    fixture.detectChanges();

    expect(component.value()).toBe('Updated value');
    expect(input.value).toBe('Updated value');
  });

  it('should write user input back to the form control and mark it touched on blur', () => {
    const control = new FormControl('');

    fixture.componentRef.setInput('control', control);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = 'Typed value';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(control.value).toBe('Typed value');
    expect(component.value()).toBe('Typed value');

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(control.touched).toBe(true);
    expect(component.touched()).toBe(true);
  });
});
