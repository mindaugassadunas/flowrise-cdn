import { FormConfig } from '../models/formTypes';
import { BaseForm } from './BaseForm';
import { FormState } from '../models/formTypes';

export class SingleStepForm extends BaseForm {
  protected submitButton: HTMLButtonElement | null = null;
  protected resetButton: HTMLButtonElement | null = null;

  constructor(wrapper: HTMLElement, form: HTMLFormElement, config: FormConfig) {
    super(wrapper, form, config);
    this.cacheElements();
  }

  private cacheElements(): void {
    this.submitButton = this.form?.querySelector('[type="submit"]') || null;
    this.resetButton = this.form?.querySelector('[type="reset"]') || null;
  }

  protected attachEventListeners(): void {
    // Form events
    this.form?.addEventListener('submit', this.handleSubmit.bind(this));
    this.form?.addEventListener('reset', this.handleReset.bind(this));

    // Reset button
    this.resetButton?.addEventListener('click', this.handleReset.bind(this));

    // Live validation on input
    this.form?.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', this.handleFieldInput.bind(this));
      field.addEventListener('blur', this.handleFieldBlur.bind(this));
    });
  }

  protected handleStateChange(state: FormState): void {
    super.handleStateChange(state);
    this.updateSubmitButton(state);
    this.updateFormStatus(state);
  }

  protected async handleFieldInput(e: Event): Promise<void> {
    const field = e.target as HTMLInputElement;
    if (!field.id) return;

    // Update state with new value
    this.stateManager.setFieldValue(field.id, field.value);

    // Validate if the field has been touched before
    const fieldState = this.stateManager.getFieldState(field.id);
    if (fieldState?.isTouched) {
      await this.validator.executeFieldValidation(field);
    }
  }

  protected async handleFieldBlur(e: Event): Promise<void> {
    const field = e.target as HTMLInputElement;
    if (!field.id) return;

    // Mark field as touched
    this.stateManager.setFieldTouched(field.id);

    // Validate field
    await this.validator.executeFieldValidation(field);
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    // Start submission process
    this.stateManager.updateState({ isSubmitting: true });

    try {
      const isValid = await this.validator.validateAll();
      if (!isValid) {
        this.handleValidationError();
        return;
      }

      // Collect and submit form data
      const formData = this.collectFormData();
      await this.submitForm(formData);

      // Handle successful submission
      this.handleSubmitSuccess();
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.stateManager.updateState({ isSubmitting: false });
    }
  }

  protected handleReset(e: Event): void {
    e.preventDefault();

    // Reset form state
    this.stateManager.resetForm();

    // Reset DOM form
    this.form?.reset();

    // Clear validation state
    this.validator.clearValidationState();
  }

  protected updateSubmitButton(state: FormState): void {
    if (this.submitButton) {
      this.submitButton.disabled = !state.isValid || state.isSubmitting;

      // Update button text based on state
      this.submitButton.textContent = state.isSubmitting
        ? 'Submitting...'
        : 'Submit';
    }
  }

  private updateFormStatus(state: FormState): void {
    // Update form-level status message
    const statusElement = this.wrapper.querySelector('[data-form-status]');
    if (statusElement) {
      if (!state.isValid && state.isDirty) {
        statusElement.textContent = 'Please fix the errors before submitting';
        statusElement.className = 'error-message';
      } else if (state.isValid && state.isDirty) {
        statusElement.textContent = 'Form is ready to submit';
        statusElement.className = 'success-message';
      } else {
        statusElement.textContent = '';
      }
    }
  }

  protected handleValidationError(): void {
    // Focus first invalid field
    const firstInvalidField = Object.entries(
      this.stateManager.getState().fields,
    ).find(([_, fieldState]) => !fieldState.isValid)?.[0];

    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
    }
  }

  protected async submitForm(formData: Record<string, any>): Promise<void> {
    const response = await fetch(this.config.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Form submission failed');
    }
  }

  protected handleSubmitSuccess(): void {
    // Show success message if configured
    if (this.config.successMessage) {
      const successElement = document.createElement('div');
      successElement.className = 'success-message';
      successElement.textContent = this.config.successMessage;
      this.form?.insertAdjacentElement('beforebegin', successElement);
    }

    // Reset form
    this.handleReset(new Event('reset'));

    // Call abstract method for additional handling
    this.onSuccessfulSubmit();

    // Redirect if configured
    if (this.config.successRedirect) {
      window.location.href = this.config.successRedirect;
    }
  }

  protected handleSubmitError(error: any): void {
    console.error('Form submission error:', error);

    const errorElement = this.wrapper.querySelector('[data-form-error]');
    if (errorElement) {
      errorElement.textContent =
        this.config.errorMessage ||
        'An error occurred while submitting the form. Please try again.';
      errorElement.className = 'error-message';
    }
  }

  protected onSuccessfulSubmit(): void {
    // Implement any additional success handling
    const event = new CustomEvent('formSubmitSuccess', {
      detail: {
        formId: this.form?.id,
        timestamp: new Date().toISOString(),
      },
    });
    window.dispatchEvent(event);
  }

  // Public methods
  public reset(): void {
    this.handleReset(new Event('reset'));
  }

  public async validate(): Promise<boolean> {
    return await this.validator.validateAll();
  }

  public getFormData(): Record<string, any> {
    return this.collectFormData();
  }
}
