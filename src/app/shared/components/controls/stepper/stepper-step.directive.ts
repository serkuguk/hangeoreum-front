import {Directive, Input, TemplateRef, inject} from '@angular/core';

/**
 * Context interface for step template
 */
export interface StepperStepContext {
    /** Function to activate/navigate to a specific step */
    activateCallback: (stepValue: number) => void;
    /** The current step value */
    step: number;
    /** Whether this step is active */
    isActive: boolean;
    /** Index of this step in the steps array */
    index: number;
}

/**
 * Directive to define content for a specific step in the stepper.
 * Used with ng-template to provide step content.
 *
 * @example
 * ```html
 * <ng-template appStepperStep [step]="0" let-activateCallback="activateCallback">
 *   <div>Step content here</div>
 *   <button (click)="activateCallback(1)">Next</button>
 * </ng-template>
 * ```
 */
@Directive({
    selector: '[appStepperStep]',
    standalone: true
})
export class StepperStepDirective {
    /**
     * The step value this template corresponds to
     */
    @Input({required: true}) step!: number;

    /**
     * Reference to the template
     */
    public readonly templateRef = inject(TemplateRef<StepperStepContext>);
}
