import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {StepperControlComponent, StepConfig} from './stepper.component';
import {StepperStepDirective} from './stepper-step.directive';

@Component({
    standalone: true,
    imports: [StepperControlComponent, StepperStepDirective, ReactiveFormsModule],
    template: `
        <app-stepper-control
            [steps]="steps"
            [formControl]="stepControl">
            <ng-template appStepperStep [step]="0">
                <div class="step-1-content">Step 1 Content</div>
            </ng-template>
            <ng-template appStepperStep [step]="1">
                <div class="step-2-content">Step 2 Content</div>
            </ng-template>
            <ng-template appStepperStep [step]="2">
                <div class="step-3-content">Step 3 Content</div>
            </ng-template>
        </app-stepper-control>
    `
})
class TestHostComponent {
    steps: StepConfig[] = [
        {value: 0, label: 'Step 1'},
        {value: 1, label: 'Step 2'},
        {value: 2, label: 'Step 3'}
    ];
    stepControl = new FormControl(0);
}

describe('StepperControlComponent', () => {
    let component: StepperControlComponent;
    let fixture: ComponentFixture<StepperControlComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StepperControlComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(StepperControlComponent);
        component = fixture.componentInstance;

        // Set required input
        fixture.componentRef.setInput('steps', [
            {value: 0, label: 'Step 1'},
            {value: 1, label: 'Step 2'},
            {value: 2, label: 'Step 3'}
        ]);

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have initial active step of 0', () => {
        expect(component.activeStep()).toBe(0);
    });

    it('should navigate to next step', () => {
        component.nextStep();
        expect(component.activeStep()).toBe(1);
    });

    it('should navigate to previous step', () => {
        component.goToStep(2);
        component.previousStep();
        expect(component.activeStep()).toBe(1);
    });

    it('should identify first step correctly', () => {
        expect(component.isFirstStep()).toBe(true);
        component.nextStep();
        expect(component.isFirstStep()).toBe(false);
    });

    it('should identify last step correctly', () => {
        expect(component.isLastStep()).toBe(false);
        component.goToStep(2);
        expect(component.isLastStep()).toBe(true);
    });

    it('should emit stepChange event when navigating', () => {
        const stepChangeSpy = jest.spyOn(component.stepChange, 'emit');
        component.goToStep(1);
        expect(stepChangeSpy).toHaveBeenCalledWith({
            previousStep: 0,
            currentStep: 1,
            step: {value: 1, label: 'Step 2'}
        });
    });

    it('should emit complete event on finish', () => {
        const completeSpy = jest.spyOn(component.complete, 'emit');
        component.onFinish();
        expect(completeSpy).toHaveBeenCalled();
    });

    it('should implement ControlValueAccessor writeValue', () => {
        component.writeValue(2);
        expect(component.activeStep()).toBe(2);
    });

    it('should implement ControlValueAccessor setDisabledState', () => {
        component.setDisabledState(true);
        expect(component.isDisabled()).toBe(true);
    });

    it('should not navigate when disabled', () => {
        component.setDisabledState(true);
        component.goToStep(1);
        expect(component.activeStep()).toBe(0);
    });

    it('should not navigate to disabled step', () => {
        fixture.componentRef.setInput('steps', [
            {value: 0, label: 'Step 1'},
            {value: 1, label: 'Step 2', disabled: true},
            {value: 2, label: 'Step 3'}
        ]);
        fixture.detectChanges();

        component.goToStep(1);
        expect(component.activeStep()).toBe(0);
    });

    describe('linear mode', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('linear', true);
            fixture.detectChanges();
        });

        it('should prevent skipping steps in linear mode', () => {
            component.goToStep(2);
            expect(component.activeStep()).toBe(0);
        });

        it('should allow going to next step in linear mode', () => {
            component.goToStep(1);
            expect(component.activeStep()).toBe(1);
        });

        it('should allow going back in linear mode', () => {
            component.goToStep(1);
            component.goToStep(0);
            expect(component.activeStep()).toBe(0);
        });
    });
});

describe('StepperControlComponent with host', () => {
    let hostComponent: TestHostComponent;
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TestHostComponent]
        }).compileComponents();

        hostFixture = TestBed.createComponent(TestHostComponent);
        hostComponent = hostFixture.componentInstance;
        hostFixture.detectChanges();
    });

    it('should work with reactive forms', () => {
        expect(hostComponent.stepControl.value).toBe(0);
    });
});
