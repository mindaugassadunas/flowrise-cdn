import { FormState } from '../models/formTypes';

export class FormUIManager {
  private submitButton: HTMLButtonElement | null = null;
  private errorContainer: HTMLElement | null = null;
  private loadingIndicator: HTMLElement | null = null;

  constructor(
    private wrapper: HTMLElement,
    private form: HTMLFormElement,
  ) {
    this.cacheUIElements();
  }

  private cacheUIElements(): void {
    this.submitButton = this.form.querySelector('[type="submit"]');
    this.errorContainer = this.wrapper.querySelector('[data-error-container]');
    this.loadingIndicator = this.wrapper.querySelector('[data-loading]');
  }

  updateUI(state: FormState): void {
    this.updateFieldsUI(state);
    this.updateSubmitButton(state);
    this.updateErrorContainer(state);
  }

  private updateFieldsUI(state: FormState): void {
    Object.entries(state.fields).forEach(([fieldId, fieldState]) => {
      const field = document.getElementById(fieldId);
      if (!field) return;

      // Update classes
      field.classList.toggle(
        'is-invalid',
        !fieldState.isValid && fieldState.isTouched,
      );
      field.classList.toggle(
        'is-valid',
        fieldState.isValid && fieldState.isTouched,
      );
      field.classList.toggle('is-dirty', fieldState.isDirty);

      // Update error messages
      this.updateFieldErrors(fieldId, fieldState.errors);
    });
  }

  private updateSubmitButton(state: FormState): void {
    if (this.submitButton) {
      this.submitButton.disabled = !state.isValid || state.isSubmitting;
    }
  }

  private updateErrorContainer(state: FormState): void {
    if (!this.errorContainer) return;

    const hasErrors = Object.values(state.fields).some(
      field => !field.isValid && field.isTouched,
    );

    this.errorContainer.style.display = hasErrors ? 'block' : 'none';
  }

  updateUIForSubmission(isSubmitting: boolean): void {
    if (this.submitButton) {
      this.submitButton.disabled = isSubmitting;
    }

    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = isSubmitting ? 'block' : 'none';
    }
  }

  updateFieldErrors(fieldId: string, errors: string[]): void {
    const errorContainer = this.wrapper.querySelector(
      `[data-error-for="${fieldId}"]`,
    );

    if (errorContainer instanceof HTMLElement) {
      errorContainer.textContent = errors.join(', ');
      errorContainer.style.display = errors.length ? 'block' : 'none';
    }
  }

  showErrorMessage(message: string): void {
    if (this.errorContainer) {
      this.errorContainer.textContent = message;
      this.errorContainer.style.display = 'block';
    }
  }

  showSuccessMessage(message: string): void {
    alert(message); // You might want to implement a better UI for success messages
  }

  handleValidationError(firstInvalidFieldId: string): void {
    const field = document.getElementById(firstInvalidFieldId);
    field?.focus();
  }

  // Getters for UI elements
  getSubmitButton(): HTMLButtonElement | null {
    return this.submitButton;
  }

  getErrorContainer(): HTMLElement | null {
    return this.errorContainer;
  }

  getLoadingIndicator(): HTMLElement | null {
    return this.loadingIndicator;
  }
}
