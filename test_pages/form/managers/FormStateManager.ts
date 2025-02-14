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
      fields[fieldId] = {
        value: '',
        isDirty: false,
        isTouched: false,
        isValid: true,
        errors: [],
        isDisabled: false,
        isVisible: true,
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
      resetFields[fieldId] = {
        value: '',
        isDirty: false,
        isTouched: false,
        isValid: true,
        errors: [],
        isDisabled: false,
        isVisible: true,
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

  // Private helper to update state and notify subscribers
  public updateState(partial: Partial<FormState>): void {
    this.state = {
      ...this.state,
      ...partial,
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
