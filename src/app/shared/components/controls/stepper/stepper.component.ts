import {
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    forwardRef,
    input,
    output,
    QueryList,
    signal,
    TemplateRef,
    AfterContentInit
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {StepperModule} from 'primeng/stepper';
import {ButtonModule} from 'primeng/button';
import {StepperStepDirective} from './stepper-step.directive';

/**
 * Interface representing a step configuration
 */
export interface StepConfig {
    /** Unique identifier for the step */
    value: number;
    /** Label displayed in the step header */
    label: string;
    /** Optional icon class for the step */
    icon?: string;
    /** Whether the step is disabled */
    disabled?: boolean;
    /** Custom data associated with the step */
    data?: unknown;
}

/**
 * Event emitted when the active step changes
 */
export interface StepChangeEvent {
    /** Previous step index */
    previousStep: number;
    /** Current step index */
    currentStep: number;
    /** Step configuration */
    step: StepConfig;
}

/**
 * A reusable stepper component based on PrimeNG's Stepper.
 * Implements ControlValueAccessor for reactive forms integration.
 *
 * @example
 * ```html
 * <app-stepper-control
 *   [steps]="stepConfigs"
 *   [linear]="true"
 *   [orientation]="'horizontal'"
 *   (stepChange)="onStepChange($event)">
 *
 *   <ng-template appStepperStep [step]="0" let-activateCallback="activateCallback">
 *     <div>Step 1 content</div>
 *     <button (click)="activateCallback(1)">Next</button>
 *   </ng-template>
 *
 *   <ng-template appStepperStep [step]="1" let-activateCallback="activateCallback">
 *     <div>Step 2 content</div>
 *     <button (click)="activateCallback(0)">Back</button>
 *     <button (click)="activateCallback(2)">Next</button>
 *   </ng-template>
 * </app-stepper-control>
 * ```
 */
@Component({
    selector: 'app-stepper-control',
    standalone: true,
    imports: [
        CommonModule,
        StepperModule,
        ButtonModule
    ],
    templateUrl: './stepper.component.html',
    styleUrl: './stepper.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => StepperControlComponent),
            multi: true
        }
    ]
})
export class StepperControlComponent implements ControlValueAccessor, AfterContentInit {
    /**
     * Array of step configurations
     */
    public steps = input.required<StepConfig[]>();

    /**
     * Whether steps must be completed in sequence
     */
    public linear = input<boolean>(false);

    /**
     * Orientation of the stepper: 'horizontal' or 'vertical'
     */
    public orientation = input<'horizontal' | 'vertical'>('horizontal');

    /**
     * Custom CSS class for the stepper container
     */
    public styleClass = input<string>('');

    /**
     * Whether to show navigation buttons
     */
    public showNavigation = input<boolean>(true);

    /**
     * Label for the "Back" button
     */
    public backLabel = input<string>('Back');

    /**
     * Label for the "Next" button
     */
    public nextLabel = input<string>('Next');

    /**
     * Label for the "Finish" button on the last step
     */
    public finishLabel = input<string>('Finish');

    /**
     * Emitted when the active step changes
     */
    public stepChange = output<StepChangeEvent>();

    /**
     * Emitted when the stepper is completed (last step finished)
     */
    public complete = output<void>();

    /**
     * Query list of step content templates
     */
    @ContentChildren(StepperStepDirective)
    stepTemplates!: QueryList<StepperStepDirective>;

    /**
     * Current active step value (signal-based state)
     */
    public activeStep = signal<number>(0);

    /**
     * Whether the component is disabled
     */
    public isDisabled = signal<boolean>(false);

    /**
     * Map of step templates by step value
     */
    public stepTemplateMap = signal<Map<number, TemplateRef<unknown>>>(new Map());

    private propagateChange: (value: number) => void = () => {};
    private propagateTouched: () => void = () => {};

    ngAfterContentInit(): void {
        this.buildTemplateMap();
        this.stepTemplates.changes.subscribe(() => {
            this.buildTemplateMap();
        });
    }

    /**
     * Build a map of step templates for quick lookup
     */
    private buildTemplateMap(): void {
        const map = new Map<number, TemplateRef<unknown>>();
        this.stepTemplates.forEach((directive) => {
            map.set(directive.step, directive.templateRef);
        });
        this.stepTemplateMap.set(map);
    }

    /**
     * Get the template for a specific step
     */
    getStepTemplate(stepValue: number): TemplateRef<unknown> | null {
        return this.stepTemplateMap().get(stepValue) ?? null;
    }

    /**
     * Navigate to a specific step
     */
    goToStep(stepValue: number): void {
        if (this.isDisabled()) {
            return;
        }

        const stepsArray = this.steps();
        const targetStep = stepsArray.find(s => s.value === stepValue);

        if (!targetStep || targetStep.disabled) {
            return;
        }

        if (this.linear()) {
            const currentIndex = stepsArray.findIndex(s => s.value === this.activeStep());
            const targetIndex = stepsArray.findIndex(s => s.value === stepValue);
            // In linear mode, can only go forward one step or backward
            if (targetIndex > currentIndex + 1) {
                return;
            }
        }

        const previousStep = this.activeStep();
        this.activeStep.set(stepValue);
        this.propagateChange(stepValue);
        this.stepChange.emit({
            previousStep,
            currentStep: stepValue,
            step: targetStep
        });
    }

    /**
     * Navigate to the next step
     */
    nextStep(): void {
        const stepsArray = this.steps();
        const currentIndex = stepsArray.findIndex(s => s.value === this.activeStep());

        if (currentIndex < stepsArray.length - 1) {
            const nextStepValue = stepsArray[currentIndex + 1].value;
            this.goToStep(nextStepValue);
        }
    }

    /**
     * Navigate to the previous step
     */
    previousStep(): void {
        const stepsArray = this.steps();
        const currentIndex = stepsArray.findIndex(s => s.value === this.activeStep());

        if (currentIndex > 0) {
            const prevStepValue = stepsArray[currentIndex - 1].value;
            this.goToStep(prevStepValue);
        }
    }

    /**
     * Check if the current step is the first step
     */
    isFirstStep(): boolean {
        const stepsArray = this.steps();
        return stepsArray.length > 0 && this.activeStep() === stepsArray[0].value;
    }

    /**
     * Check if the current step is the last step
     */
    isLastStep(): boolean {
        const stepsArray = this.steps();
        return stepsArray.length > 0 && this.activeStep() === stepsArray[stepsArray.length - 1].value;
    }

    /**
     * Handle finish action on the last step
     */
    onFinish(): void {
        this.complete.emit();
    }

    /**
     * Handle step header click
     */
    onStepClick(step: StepConfig): void {
        if (!step.disabled) {
            this.goToStep(step.value);
        }
    }

    /**
     * Check if a step is active
     */
    isStepActive(stepValue: number): boolean {
        return this.activeStep() === stepValue;
    }

    /**
     * Check if a step is completed (all previous steps in linear mode)
     */
    isStepCompleted(stepValue: number): boolean {
        const stepsArray = this.steps();
        const currentIndex = stepsArray.findIndex(s => s.value === this.activeStep());
        const stepIndex = stepsArray.findIndex(s => s.value === stepValue);
        return stepIndex < currentIndex;
    }

    // ControlValueAccessor implementation

    writeValue(value: number): void {
        if (value !== undefined && value !== null) {
            this.activeStep.set(value);
        }
    }

    registerOnChange(fn: (value: number) => void): void {
        this.propagateChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.propagateTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    onBlur(): void {
        this.propagateTouched();
    }
}
