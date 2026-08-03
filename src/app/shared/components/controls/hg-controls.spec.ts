import {Component, Type} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HgButtonComponent} from './hg-button.component';
import {HgInputComponent} from './hg-input.component';
import {HgSegmentedControlComponent, HgSegmentedOption} from './hg-segmented-control.component';
import {HgTextareaComponent} from './hg-textarea.component';

@Component({imports: [ReactiveFormsModule, HgInputComponent], template: `<hg-input label="Email" error="Обязательное поле" [formControl]="control" />`})
class ReactiveInputHost { readonly control = new FormControl('first@example.com', {nonNullable: true}); }

@Component({imports: [FormsModule, HgTextareaComponent], template: `<hg-textarea label="Описание" [(ngModel)]="description" />`})
class NgModelHost { description = 'Начальный текст'; }

@Component({imports: [ReactiveFormsModule, HgSegmentedControlComponent], template: `<hg-segmented-control label="Режим" [options]="options" [formControl]="control" />`})
class SegmentedHost {
  readonly options: readonly HgSegmentedOption<string>[] = [
    {label: 'Первый', value: 'first'},
    {label: 'Недоступный', value: 'disabled', disabled: true},
    {label: 'Третий', value: 'third'},
  ];
  readonly control = new FormControl('first');
}

describe('shared controls', () => {
  it('connects hg-input to Reactive Forms and its accessible error', async () => {
    const fixture = await createFixture(ReactiveInputHost);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const error = fixture.nativeElement.querySelector('.error') as HTMLElement;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    input.value = 'next@example.com';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.value).toBe('next@example.com');
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('connects hg-textarea to ngModel in both directions', async () => {
    const fixture = await createFixture(NgModelHost);
    await fixture.whenStable(); fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Начальный текст');
    textarea.value = 'Новый текст'; textarea.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(fixture.componentInstance.description).toBe('Новый текст');
  });

  it('supports arrow-key radio navigation and skips disabled segments', async () => {
    const fixture = await createFixture(SegmentedHost);
    const buttons = fixture.nativeElement.querySelectorAll('[role="radio"]') as NodeListOf<HTMLButtonElement>;
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})); fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe('third');
    expect(buttons[2].getAttribute('aria-checked')).toBe('true');
  });

  it('blocks presses while loading and exposes the chosen variant', async () => {
    const fixture = await createFixture(HgButtonComponent, {label: 'Удалить', variant: 'danger', loading: true});
    let pressCount = 0; fixture.componentInstance.pressed.subscribe(() => pressCount++);
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList).toContain('danger'); expect(button.disabled).toBe(true); expect(button.getAttribute('aria-busy')).toBe('true');
    button.click(); expect(pressCount).toBe(0);
  });
});

async function createFixture<T>(component: Type<T>, inputs: Record<string, unknown> = {}): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({imports: [component]}).compileComponents();
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}
