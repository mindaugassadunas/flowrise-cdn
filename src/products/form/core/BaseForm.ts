import { ConditionalFieldConfig, FormConfig } from '../models/formTypes';
import { FormValidator } from '../validation/FormValidator';
import { FormState } from '../models/formTypes';
import { FormStateManager } from '../managers/FormStateManager';
import { StorageManager } from '../utils/storage';
import { ConditionalFieldManager } from '../managers/ConditionalFieldManager';
import { FormFieldManager } from '../managers/FormFieldManager';

export interface FormSubmitData {
  formData: Record<string, any>;
  state: FormState;
}

export abstract class BaseForm {
  protected wrapper: HTMLElement;
  protected form: HTMLFormElement;
  protected config: FormConfig;
  protected validator: FormValidator;
  protected stateManager: FormStateManager;
  protected fieldManager!: FormFieldManager;
  protected conditionalManager!: ConditionalFieldManager;

  // UI Elements cache
  protected submitButton: HTMLButtonElement | null = null;
  protected errorContainer: HTMLElement | null = null;
  protected loadingIndicator: HTMLElement | null = null;

  constructor(wrapper: HTMLElement, form: HTMLFormElement, config: FormConfig) {
    this.wrapper = wrapper;
    this.form = form;
    this.config = config;

    // Initialize validator
    this.validator = new FormValidator(`#${form.id}`);

    // Initialize state manager with field IDs from the form
    const fieldIds = Array.from(form.elements)
      .filter(element => element instanceof HTMLElement && element.id)
      .map(element => (element as HTMLElement).id);

    this.stateManager = new FormStateManager(fieldIds);

    // Initialize conditional field manager after state manager and validator
    this.conditionalManager = new ConditionalFieldManager(
      this.form,
      this.stateManager,
      this.validator,
    );

    // Initialize form
    this.init();
  }

  protected init(): void {
    this.createHiddenFields();
    this.createSystemFields();
    console.log('baseform init');
    this.fieldManager = new FormFieldManager(this.form, this.config);
    console.log(this.fieldManager);
    // Prefill if needed
    if (this.config.storage) {
      StorageManager.prefillForm(this.form, this.config.storage);
    }

    this.initializeValidator();
    this.cacheUIElements();
    this.setupEventListeners();
    this.stateManager.subscribe(this.handleStateChange.bind(this));

    // Initialize form data from URL params if needed
    this.initializeFromURL();

    // Trigger initial validation
    // this.validateForm();

    // Set up conditional fields
    this.initializeConditionalFields();
  }

  protected async createHiddenFields(): Promise<void> {
    if (!this.config.hiddenFields) return;

    const timeout = 500;

    await Promise.all(
      this.config.hiddenFields.map(async fieldConfig => {
        // Create hidden input
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = fieldConfig.name;
        hiddenInput.name = fieldConfig.name;

        // Get value with timeout
        const value = await StorageManager.getValue(fieldConfig, timeout);
        if (value) {
          hiddenInput.value = value;

          // Add to state manager
          this.stateManager.setFieldValue(fieldConfig.name, value);
        }

        // Add to form
        this.form.appendChild(hiddenInput);
      }),
    );
  }

  protected cacheUIElements(): void {
    this.submitButton = this.form.querySelector('[type="submit"]');
    this.errorContainer = this.wrapper.querySelector('[data-error-container]');
    this.loadingIndicator = this.wrapper.querySelector('[data-loading]');
  }

  protected setupEventListeners(): void {
    // Form-level events
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.form.addEventListener('reset', this.handleReset.bind(this));

    // Field-level events
    const fields = Array.from(
      this.form.querySelectorAll<HTMLElement>('input, select, textarea'),
    );

    fields.forEach(field => {
      // Input event for real-time validation
      field.addEventListener('input', this.handleFieldInput.bind(this));

      // Blur event for touched state
      field.addEventListener('blur', this.handleFieldBlur.bind(this));

      // Change event for select elements
      if (field instanceof HTMLSelectElement) {
        field.addEventListener('change', this.handleFieldChange.bind(this));
      }
    });

    if (this.config.storage?.storeMode === 'live') {
      const fields = Array.from(
        this.form.querySelectorAll<HTMLElement>('input, select, textarea'),
      );

      fields.forEach(field => {
        field.addEventListener('blur', () => {
          StorageManager.storeFormData(this.form, this.config.storage!);
        });
      });
    }
  }

  protected initializeValidator(): void {
    if (!this.form) {
      console.error('Form element not found');
      return;
    }

    this.validator.init(this.form);
  }

  protected initializeFromURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const fields = Array.from(this.form.elements) as HTMLFormElement[];

    fields.forEach(field => {
      if (field.id && urlParams.has(field.id)) {
        const value = urlParams.get(field.id);
        if (value) {
          field.value = value;
          this.stateManager.setFieldValue(field.id, value);
        }
      }
    });
  }

  protected async handleFieldInput(e: Event): Promise<void> {
    const field = e.target as HTMLInputElement;
    if (!field.id) return;

    this.stateManager.setFieldValue(field.id, field.value);
    if (this.shouldValidateOnInput(field)) {
      await this.validateField(field);
    }
  }

  protected handleFieldBlur(e: Event): void {
    const field = e.target as HTMLInputElement;
    console.log('Blurred field:', field.id);
    if (!field.id) return;

    // Mark as touched
    this.stateManager.setFieldTouched(field.id);

    // Always validate on blur
    this.validateField(field);
  }

  protected handleFieldChange(e: Event): void {
    const field = e.target as HTMLSelectElement;
    if (!field.id) return;

    this.stateManager.setFieldValue(field.id, field.value);

    // Validate immediately for select elements
    this.validateField(field);
  }

  protected shouldValidateOnInput(field: HTMLInputElement): boolean {
    // Add your validation strategy here
    // For example, only validate after field has been touched
    const fieldState = this.stateManager.getFieldState(field.id);
    return fieldState?.isTouched || false;
  }

  protected async validateField(field: HTMLElement): Promise<boolean> {
    const fieldId = field.id;
    const fieldState = this.stateManager.getFieldState(fieldId);

    console.log(
      'Validating field:',
      field.id,
      'isVisible?',
      fieldState?.isVisible,
      fieldState,
    );

    // // Skip validation for explicitly hidden fields (undefined means visible)
    // if (fieldState?.isVisible === false) {
    //   return true;
    // }

    if (!this.stateManager.shouldValidateField(fieldId)) {
      return true;
    }

    return await this.validator.executeFieldValidation(field);
  }

  protected async validateForm(): Promise<boolean> {
    try {
      const allFields = Array.from(this.form.elements);
      const validatableFields = allFields.filter(element => {
        // Exclude buttons and elements without IDs
        if (element instanceof HTMLButtonElement) return false;
        if (!(element instanceof HTMLElement) || !element.id) return false;

        const fieldId = (element as HTMLElement).id;
        const fieldState = this.stateManager.getFieldState(fieldId);

        // Check both state manager visibility and DOM visibility
        const isVisibleInDOM = (element as HTMLElement).offsetParent !== null;
        const isVisibleInState = fieldState?.isVisible !== false;

        // Only include visible fields that are actual form controls
        return (
          isVisibleInState &&
          isVisibleInDOM &&
          (element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement)
        );
      });

      console.log(
        'Validating fields for submission:',
        validatableFields.map(f => (f as HTMLElement).id),
      );

      const isValid =
        (await this.validator.validateFields(validatableFields as Element[])) ??
        false;
      return isValid;
    } catch (error) {
      console.error('Error validating form:', error);
      return false;
    }
  }

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    // Start submission process
    this.stateManager.startSubmission();
    this.updateUIForSubmission(true);

    try {
      // Validate all fields
      const isValid = await this.validateForm();
      if (!isValid) {
        this.handleValidationError();
        return;
      }

      // Convert phone numbers to international format
      this.convertPhoneNumbersToInternational();

      // Collect form data
      const submitData = this.collectFormData();

      // Store to localstorage
      if (this.config.storage?.storeMode === 'submit') {
        StorageManager.storeFormData(this.form, this.config.storage);
      }

      // Submit the form
      await this.submitForm(submitData);

      // Handle success
      this.handleSubmitSuccess();
    } catch (error) {
      // Handle error
      this.handleSubmitError(error);
    } finally {
      // End submission process
      this.stateManager.endSubmission();
      this.updateUIForSubmission(false);
    }
  }

  private convertPhoneNumbersToInternational(): void {
    // Find all phone inputs that have intl-tel-input initialized
    const phoneInputs = this.form.querySelectorAll('input[type="tel"]');

    phoneInputs.forEach(input => {
      const inputElement = input as HTMLInputElement;

      // Check if this input has the intl-tel-input initialized
      if ((input as any).iti) {
        const iti = (input as any).iti;
        // Only update if valid
        if (iti.isValidNumber()) {
          inputElement.value = iti.getNumber();
        }
      }
    });
  }

  protected handleReset(e: Event): void {
    e.preventDefault();

    // Reset form state
    this.stateManager.resetForm();

    // Reset actual form
    this.form.reset();

    // Clear validation state
    this.validator.clearValidationState();

    // Reset UI
    this.updateUI(this.stateManager.getState());
  }

  // protected handleStateChange(state: FormState): void {
  //   this.updateUI(state);
  // }

  private _lastStateHash: string = '';
  protected handleStateChange(state: FormState): void {
    // Generate a simple hash of the validation state
    const newStateHash = JSON.stringify(
      Object.entries(state.fields).map(
        ([id, field]) =>
          `${id}:${field.isValid}:${field.isTouched}:${field.isDirty}`,
      ),
    );

    // Only update UI if validation state has actually changed
    if (this._lastStateHash !== newStateHash) {
      this._lastStateHash = newStateHash;

      // First, update standard UI elements
      this.updateFieldsUI(state);
      this.updateSubmitButton(state);
      this.updateErrorContainer(state);
    }
  }

  protected updateUI(state: FormState): void {
    this.updateFieldsUI(state);
    this.updateSubmitButton(state);
    this.updateErrorContainer(state);
  }

  private _uiUpdateDebounceTimer: any = null;
  protected updateFieldsUI(state: FormState): void {
    // Debounce the UI updates
    if (this._uiUpdateDebounceTimer) {
      clearTimeout(this._uiUpdateDebounceTimer);
    }

    this._uiUpdateDebounceTimer = setTimeout(() => {
      // Existing updateFieldsUI code
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

      this._uiUpdateDebounceTimer = null;
    }, 50); // 50ms debounce should be enough
  }

  protected updateSubmitButton(state: FormState): void {
    if (this.submitButton) {
      this.submitButton.disabled = !state.isValid || state.isSubmitting;
    }
  }

  protected updateErrorContainer(state: FormState): void {
    if (!this.errorContainer) return;

    const hasErrors = Object.values(state.fields).some(
      field => !field.isValid && field.isTouched,
    );

    this.errorContainer.style.display = hasErrors ? 'block' : 'none';
  }

  protected updateUIForSubmission(isSubmitting: boolean): void {
    if (this.submitButton) {
      // Store original button text if needed
      console.log('IS SUBMITTING', isSubmitting);
      if (isSubmitting && !this.submitButton.dataset.originalText) {
        this.submitButton.dataset.originalText =
          this.submitButton.textContent || '';
      }

      // Update button text based on data-wait attribute
      if (isSubmitting && this.submitButton.dataset.wait) {
        console.log('SUBMIT TEXT', this.submitButton.dataset.wait);
        this.submitButton.textContent = this.submitButton.dataset.wait;
      } else if (!isSubmitting && this.submitButton.dataset.originalText) {
        this.submitButton.textContent = this.submitButton.dataset.originalText;
        delete this.submitButton.dataset.originalText;
      }

      console.log('BUTTON STATUS');
      this.submitButton.disabled = isSubmitting;
      console.log(this.submitButton.disabled);
    }

    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = isSubmitting ? 'block' : 'none';
    }
  }

  protected updateFieldErrors(fieldId: string, errors: string[]): void {
    const errorContainer = this.wrapper.querySelector(
      `[data-error-for="${fieldId}"]`,
    );

    if (errorContainer instanceof HTMLElement) {
      errorContainer.textContent = errors.join(', ');
      errorContainer.style.display = errors.length ? 'block' : 'none';
    }
  }

  protected collectFormData(): FormSubmitData {
    const formData = new FormData(this.form);
    const data: Record<string, any> = {};

    formData.forEach((value, key) => {
      data[key] = value;
    });

    return {
      formData: data,
      state: this.stateManager.getState(),
    };
  }

  protected async submitForm(submitData: FormSubmitData): Promise<void> {
    if (!this.config.action) {
      throw new Error('No action URL provided in form configuration.');
    }

    const response = await fetch(this.config.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData.formData),
    });

    if (!response.ok) {
      throw new Error('Form submission failed');
    }
  }

  protected handleValidationError(): void {
    // Focus first invalid field
    const firstInvalidField = Object.entries(
      this.stateManager.getState().fields,
    ).find(([_, state]) => !state.isValid)?.[0];

    if (firstInvalidField) {
      const field = document.getElementById(firstInvalidField);
      field?.focus();
    }
  }

  protected handleSubmitSuccess(): void {
    // Reset form after successful submission
    this.stateManager.resetForm();
    this.form.reset();
    this.validator.clearValidationState();

    // Clear stored data after successful submission if clearOnSubmit is not explicitly false
    if (this.config.storage && this.config.storage.clearOnSubmit !== false) {
      StorageManager.clearStoredFormData(this.config.storage.key);
    }

    if (this.config.successRedirect) {
      const redirectUrl = this.buildRedirectUrl();
      window.location.href = redirectUrl;
      return;
    }

    // Show success message or redirect
    if (this.config.successMessage) {
      this.form.style.display = 'none';
      const successElement = this.wrapper.querySelector(
        '[fl-form="success-message"]',
      );
      if (successElement instanceof HTMLElement) {
        successElement.style.display = 'block';
      }
    }
  }

  protected handleSubmitError(error: any): void {
    console.error('Form submission error:', error);

    // Show error message
    if (this.errorContainer) {
      this.errorContainer.textContent =
        this.config.errorMessage || 'An error occurred. Please try again.';
      this.errorContainer.style.display = 'block';
    }
  }

  private buildRedirectUrl(): string {
    let baseUrl = this.config.successRedirect!;

    // Handle relative paths
    if (!baseUrl.startsWith('http') && !baseUrl.startsWith('//')) {
      // Remove leading slash if exists to prevent double slashes
      baseUrl = baseUrl.startsWith('/') ? baseUrl : '/' + baseUrl;
      baseUrl = window.location.origin + baseUrl;
    }

    if (!this.config.redirectParams?.length) {
      return baseUrl;
    }

    const params = new URLSearchParams();

    this.config.redirectParams.forEach(param => {
      let value: string | undefined;

      if (param.value) {
        // Use static value
        value = param.value;
      } else if (param.fieldId) {
        // Get value from form field
        const field = document.getElementById(
          param.fieldId,
        ) as HTMLInputElement;
        if (field) {
          value = field.value;
        }
      }

      if (value) {
        params.append(param.key, value);
      }
    });

    const queryString = params.toString();
    if (!queryString) {
      return baseUrl;
    }

    // Check if the URL already has parameters
    return baseUrl.includes('?')
      ? `${baseUrl}&${queryString}`
      : `${baseUrl}?${queryString}`;
  }

  // Public methods for external use
  public reset(): void {
    this.handleReset(new Event('reset'));
  }

  public async validate(): Promise<boolean> {
    return await this.validateForm();
  }

  public getState(): FormState {
    return this.stateManager.getState();
  }

  // Conditional fields
  protected initializeConditionalFields(): void {
    // First, initialize all fields with isVisible: true
    const allFields = this.form.querySelectorAll('input, select, textarea');
    allFields.forEach(field => {
      if (field instanceof HTMLElement && field.id) {
        this.stateManager.updateState({
          fields: {
            [field.id]: {
              ...this.stateManager.getFieldState(field.id),
              isVisible: true,
              value: (field as HTMLInputElement).value || '',
              isDirty: false,
              isTouched: false,
              isValid: true,
              errors: [],
              isDisabled: false,
            },
          },
        });
      }
    });

    // Then process conditional fields
    if (this.config.conditionalFields) {
      this.config.conditionalFields.forEach(fieldConfig => {
        this.setupConditionalField(fieldConfig);
      });
    }

    // Process data-attribute based rules
    this.setupDataAttributeRules();

    // Initialize all rules AFTER registration
    this.conditionalManager.initializeRules();
  }

  private setupConditionalField(config: ConditionalFieldConfig): void {
    const targetField = document.getElementById(config.targetFieldId);
    if (!targetField) {
      console.warn(`Target field ${config.targetFieldId} not found`);
      return;
    }

    // Set initial visibility based on default state
    // if (config.defaultState) {
    //   const isVisible = config.defaultState === 'visible';
    //   targetField.style.display = isVisible ? '' : 'none';
    // }

    // Add conditional rule
    this.conditionalManager.addRule({
      targetFieldId: config.targetFieldId,
      conditions: config.conditions,
      action: config.action,
      operator: config.operator,
      onStateChange: (isVisible: boolean) => {
        if (!isVisible && config.clearOnHide) {
          const field = document.getElementById(config.targetFieldId);
          if (field) {
            // Only proceed if field exists
            this.clearFieldValue(config.targetFieldId);
          }
        }
        if (isVisible && config.validateOnShow) {
          const field = document.getElementById(config.targetFieldId);
          if (field) {
            // Only proceed if field exists
            this.validateField(field);
          }
        }
      },
    });
  }

  private setupDataAttributeRules(): void {
    const conditionalFields = this.form.querySelectorAll('[data-conditional]');

    conditionalFields.forEach(field => {
      const rulesAttr = field.getAttribute('data-conditional');
      if (!rulesAttr) return;

      try {
        const config = JSON.parse(rulesAttr) as ConditionalFieldConfig;
        this.setupConditionalField(config);
      } catch (error) {
        console.error(
          `Invalid conditional rules for field ${field.id}:`,
          error,
        );
      }
    });
  }

  private clearFieldValue(fieldId: string): void {
    const field = document.getElementById(fieldId) as
      | HTMLInputElement
      | HTMLSelectElement;
    if (!field) return;

    // Clear field value
    field.value = '';

    // Update state manager
    this.stateManager.setFieldValue(fieldId, '');

    // Clear validation state
    this.validator.clearValidationState();
  }

  private createSystemFields(): void {
    // Form name
    const nameInput = document.createElement('input');
    nameInput.type = 'hidden';
    nameInput.id = 'form_name';
    nameInput.name = 'form_name';
    nameInput.value = this.form.name;
    this.form.appendChild(nameInput);

    // Path
    const pathInput = document.createElement('input');
    pathInput.type = 'hidden';
    pathInput.id = 'path';
    pathInput.name = 'path';
    pathInput.value = this.config.path;
    this.form.appendChild(pathInput);

    // Create UUID field
    const uuidInput = document.createElement('input');
    uuidInput.type = 'hidden';
    uuidInput.id = 'uuid';
    uuidInput.name = 'uuid';
    uuidInput.value = crypto.randomUUID();
    this.form.appendChild(uuidInput);

    // Create timestamp field
    const timestampInput = document.createElement('input');
    timestampInput.type = 'hidden';
    timestampInput.id = 'timestamp';
    timestampInput.name = 'timestamp';
    timestampInput.value = new Date().toISOString();
    this.form.appendChild(timestampInput);

    // GA4
    const ga4cookie = StorageManager.getCookie('_ga');
    if (ga4cookie) {
      const gaInput = document.createElement('input');
      gaInput.type = 'hidden';
      gaInput.id = 'ga_client_id';
      gaInput.name = 'ga_client_id';
      gaInput.value = ga4cookie.substring(6) || '';
      this.form.appendChild(gaInput);
    }
  }
}
