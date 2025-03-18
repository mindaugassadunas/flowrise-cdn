import { FormConfig } from '../models/formTypes';
import { BaseForm, FormSubmitData } from './BaseForm';
import { FormState } from '../models/formTypes';
import { StorageManager } from '../utils/storage';

export class SingleStepForm extends BaseForm {
  constructor(wrapper: HTMLElement, form: HTMLFormElement, config: FormConfig) {
    super(wrapper, form, config);
  }

  protected init(): void {
    console.log('INIT SINGLE STEP FORM');
    // Call the parent implementation to use the enhanced initialization
    super.init();

    // Any additional initialization specific to SingleStepForm can go here
  }

  protected setupEventListeners(): void {
    // Call the parent implementation for comprehensive event handling
    super.setupEventListeners();

    // Add any additional SingleStepForm specific event listeners
    const formStatusElement = this.wrapper.querySelector('[data-form-status]');
    if (formStatusElement) {
      this.stateManager.subscribe(state => {
        this.updateFormStatus(state);
      });
    }
  }

  protected handleStateChange(state: FormState): void {
    // Call the parent implementation first
    super.handleStateChange(state);

    // Then add SingleStepForm specific updates
    this.updateFormStatus(state);
  }

  private updateFormStatus(state: FormState): void {
    // Update form-level status message
    const statusElement = this.wrapper.querySelector('[data-form-status]');
    if (statusElement instanceof HTMLElement) {
      if (!state.isValid && state.isDirty) {
        statusElement.textContent = 'Please fix the errors before submitting';
        statusElement.className = 'error-message';
        statusElement.style.display = 'block';
      } else if (state.isValid && state.isDirty) {
        statusElement.textContent = 'Form is ready to submit';
        statusElement.className = 'success-message';
        statusElement.style.display = 'block';
      } else {
        statusElement.textContent = '';
        statusElement.style.display = 'none';
      }
    }
  }

  protected updateUIForSubmission(isSubmitting: boolean): void {
    // Call parent implementation first
    super.updateUIForSubmission(isSubmitting);

    // Add SingleStepForm specific UI updates
    if (this.submitButton && this.submitButton instanceof HTMLButtonElement) {
      this.submitButton.textContent = isSubmitting ? 'Submitting...' : 'Submit';
    }

    // Update form status element during submission
    const statusElement = this.wrapper.querySelector('[data-form-status]');
    if (statusElement instanceof HTMLElement && isSubmitting) {
      statusElement.textContent = 'Submitting your information...';
      statusElement.className = 'info-message';
      statusElement.style.display = 'block';
    }
  }

  // We don't need to override handleSubmit, handleFieldInput, handleFieldBlur
  // as the BaseForm implementation is now comprehensive

  protected handleValidationError(): void {
    // Call parent implementation
    super.handleValidationError();

    // Additional SingleStepForm specific error handling
    const statusElement = this.wrapper.querySelector('[data-form-status]');
    if (statusElement instanceof HTMLElement) {
      statusElement.textContent =
        'Please fix the highlighted errors before submitting';
      statusElement.className = 'error-message';
      statusElement.style.display = 'block';
    }
  }

  protected handleSubmitSuccess(): void {
    // Call parent implementation first to handle redirects, success elements, etc.
    super.handleSubmitSuccess();

    // Then add any SingleStepForm specific success handling
    if (!this.config.successRedirect) {
      // Only do this if we're not redirecting (otherwise it won't be seen)
      this.onSuccessfulSubmit();
    }
  }

  protected handleSubmitError(error: any): void {
    // Call parent implementation first
    super.handleSubmitError(error);

    // Additional error handling specific to SingleStepForm
    const errorElement = this.wrapper.querySelector('[data-form-error]');
    if (errorElement instanceof HTMLElement) {
      errorElement.textContent =
        this.config.errorMessage ||
        'An error occurred while submitting the form. Please try again.';
      errorElement.className = 'error-message';
      errorElement.style.display = 'block';
    }
  }

  protected async onSuccessfulSubmit(): Promise<void> {
    const submitData = await this.collectFormData();
    // Dispatch custom event for external integrations
    const event = new CustomEvent('formSubmitSuccess', {
      detail: {
        formId: this.form?.id,
        timestamp: new Date().toISOString(),
        data: submitData,
      },
      bubbles: true,
    });

    this.form.dispatchEvent(event);
    window.dispatchEvent(event);

    // Show a custom success message if configured
    if (this.config.successMessage && !this.config.successRedirect) {
      const existingSuccessElement = this.wrapper.querySelector(
        '.form-success-message',
      );

      if (!existingSuccessElement) {
        const successElement = document.createElement('div');
        successElement.className = 'form-success-message success-message';
        successElement.textContent = this.config.successMessage;
        this.form.insertAdjacentElement('beforebegin', successElement);
      }
    }
  }

  protected setupKeyboardHandlers(): void {
    // Override the base implementation with SingleStepForm-specific behavior
    const inputFields = this.form.querySelectorAll('input, textarea');

    inputFields.forEach(field => {
      field.addEventListener('keydown', async (e: Event) => {
        // Cast the event to KeyboardEvent
        const keyEvent = e as KeyboardEvent;

        // Check if the Enter key was pressed
        if (keyEvent.key === 'Enter') {
          // Prevent the default form submission
          e.preventDefault();

          // For single-step forms, validate and submit if valid
          const isValid = await this.validateForm();
          if (isValid) {
            // Simulate the form submission through our handler
            this.handleSubmit(new Event('submit'));
          } else {
            this.handleValidationError();
          }
        }
      });
    });
  }

  // Public methods

  // This is a convenience method to access form data directly
  public async getFormData(): Promise<FormSubmitData> {
    return await this.collectFormData();
  }
}
