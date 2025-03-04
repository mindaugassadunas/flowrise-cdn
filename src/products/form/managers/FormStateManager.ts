import {
  FormState,
  StateUpdateCallback,
  FieldState,
} from '../models/formTypes';

export class FormStateManager {
  private state: FormState;
  private subscribers: Set<StateUpdateCallback>;

  constructor(initialFields: string[]) {
    // Initialize with default field states
    const fields: Record<string, FieldState> = {};
    initialFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      fields[fieldId] = {
        value: '',
        isDirty: false,
        isTouched: false,
        isValid: true,
        errors: [],
        isDisabled: field?.hasAttribute('disabled') || false,
        isVisible: true,
        isFunctional: field?.hasAttribute('fl-functional-input') || false,
      };
    });

    this.state = {
      fields,
      currentStep: 0,
      totalSteps: 1,
      isSubmitting: false,
      isValid: true,
      isDirty: false,
      submitCount: 0,
    };

    this.subscribers = new Set();
  }

  public shouldValidateField(fieldId: string): boolean {
    // Get the DOM element
    const element = document.getElementById(fieldId);
    if (!element) return true; // Default behavior if element not found

    // Special case for functional hidden inputs (dropdown inputs)
    if (
      element.getAttribute('type') === 'hidden' &&
      element.hasAttribute('fl-functional-input')
    ) {
      // For dropdown inputs, check if the container is visible
      const container =
        element.closest('.form_input-group') ||
        element.closest('.form_dropdown-wrapper') ||
        element.parentElement;

      // Only validate if the container is visible
      if (container) {
        return window.getComputedStyle(container).display !== 'none';
      }
    }

    // For all other elements, use offsetParent check
    const isHiddenInDOM = element.offsetParent === null;
    return !isHiddenInDOM;
  }

  // Subscribe to state changes
  public subscribe(callback: StateUpdateCallback): () => void {
    this.subscribers.add(callback);
    // Return unsubscribe function
    return () => this.subscribers.delete(callback);
  }

  // Get current state
  public getState(): FormState {
    return { ...this.state };
  }

  // Get specific field state
  public getFieldState(fieldId: string): FieldState | undefined {
    return this.state.fields[fieldId];
  }

  // Update field value
  public setFieldValue(fieldId: string, value: any): void {
    this.updateState({
      fields: {
        ...this.state.fields,
        [fieldId]: {
          ...this.state.fields[fieldId],
          value,
          isDirty: true,
        },
      },
      isDirty: true,
    });
  }

  // Update field validation state
  public setFieldValidation(
    fieldId: string,
    isValid: boolean,
    errors: string[] = [],
  ): void {
    this.updateState({
      fields: {
        ...this.state.fields,
        [fieldId]: {
          ...this.state.fields[fieldId],
          isValid,
          errors,
        },
      },
    });
    this.updateFormValidity();
  }

  // Mark field as touched (e.g., after blur)
  public setFieldTouched(fieldId: string): void {
    this.updateState({
      fields: {
        ...this.state.fields,
        [fieldId]: {
          ...this.state.fields[fieldId],
          isTouched: true,
        },
      },
    });
  }

  // Update multiple fields at once
  public batchUpdateFields(updates: Record<string, Partial<FieldState>>): void {
    const updatedFields = { ...this.state.fields };

    Object.entries(updates).forEach(([fieldId, update]) => {
      updatedFields[fieldId] = {
        ...updatedFields[fieldId],
        ...update,
      };
    });

    this.updateState({
      fields: updatedFields,
    });
    this.updateFormValidity();
  }

  // Set current step for multi-step forms
  public setStep(step: number): void {
    this.updateState({
      currentStep: step,
    });
  }

  // Update total steps
  public setTotalSteps(total: number): void {
    this.updateState({
      totalSteps: total,
    });
  }

  // Start form submission
  public startSubmission(): void {
    this.updateState({
      isSubmitting: true,
      submitCount: this.state.submitCount + 1,
    });
  }

  // End form submission
  public endSubmission(): void {
    this.updateState({
      isSubmitting: false,
    });
  }

  // Reset form to initial state
  public resetForm(): void {
    const resetFields: Record<string, FieldState> = {};

    Object.keys(this.state.fields).forEach(fieldId => {
      const currentField = this.state.fields[fieldId];
      resetFields[fieldId] = {
        value: '',
        isDirty: false,
        isTouched: false,
        isValid: true,
        errors: [],
        isDisabled: false,
        isVisible: true,
        isFunctional: currentField.isFunctional,
      };
    });

    this.updateState({
      fields: resetFields,
      currentStep: 0,
      isSubmitting: false,
      isValid: true,
      isDirty: false,
    });
  }

  // Replace the existing updateState method with this fixed version
  public updateState(partial: Partial<FormState>): void {
    this.state = {
      ...this.state,
      ...partial,
      // Special handling for fields to merge properly
      fields: partial.fields
        ? {
            ...this.state.fields, // Preserve existing fields
            ...partial.fields, // Add/update the specified fields
          }
        : this.state.fields,
    };
    this.notifySubscribers();
  }

  // Update overall form validity based on field states
  private updateFormValidity(): void {
    const isValid = Object.values(this.state.fields).every(
      field => field.isValid,
    );
    if (isValid !== this.state.isValid) {
      this.updateState({ isValid });
    }
  }

  // Notify all subscribers of state change
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.getState()));
  }
}
