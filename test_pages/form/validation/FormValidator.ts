import JustValidate, { Rules, FieldRuleInterface } from 'just-validate';
import { FormStateManager } from '../managers/FormStateManager';

export class FormValidator {
  private validator: JustValidate;
  private customValidations: Map<string, Rules[]>;
  private invalidFields: Set<string> = new Set();
  private stateManager?: FormStateManager;

  constructor(
    formSelector: string,
    options: object = {},
    stateManager?: FormStateManager,
  ) {
    this.validator = new JustValidate(formSelector, {
      validateBeforeSubmitting: false,
      focusInvalidField: true,
      errorFieldCssClass: ['error'],
      errorLabelStyle: {
        display: 'block',
      },
      errorLabelCssClass: ['error-message'],
      successLabelCssClass: ['success'],
      ...options,
    });

    this.customValidations = new Map();
    this.stateManager = stateManager;

    // Add callback to update state manager on validation
    if (this.stateManager) {
      this.validator.onValidate(async ({ fields }) => {
        Object.entries(fields).forEach(([fieldId, validation]) => {
          // Ensure isValid always has a boolean value
          const isValid = validation.isValid ?? false;
          const errors =
            (validation as any)?.errors?.map(
              (error: { message: string }) => error.message,
            ) || [];

          // Update state manager with validation results
          this.stateManager?.setFieldValidation(
            fieldId.replace('#', ''),
            isValid,
            errors,
          );
        });
      });
    }
  }

  public initialize(form: HTMLFormElement): void {
    const allFields = form.querySelectorAll('input, select, textarea');

    allFields.forEach(field => {
      if (!field.id) {
        console.warn('Field missing ID attribute:', field);
        return;
      }

      let allRules: FieldRuleInterface[] = [];

      // Get automatic rules
      const automaticRules = this.getAutomaticValidationRules(
        field as HTMLInputElement,
      );
      allRules = allRules.concat(automaticRules);

      // Get custom rules
      if (field.hasAttribute('data-validate')) {
        const customRules = this.parseValidationRules(field);
        allRules = allRules.concat(customRules);
      }

      // Add field to validator if it has rules
      if (allRules.length > 0) {
        this.validator.addField(`#${field.id}`, allRules);
      }
    });

    this.addCustomValidations();
  }

  public async validateFields(fields: Element[]): Promise<boolean> {
    try {
      // Filter out invalid fields first
      const validFields = fields.filter(field => {
        if (!(field instanceof HTMLElement) || !field.id) {
          console.warn('Invalid field element:', field);
          return false;
        }
        if (!document.querySelector(`#${field.id}`)) {
          console.warn(`Field not found with selector: #${field.id}`);
          return false;
        }
        return true;
      });

      if (validFields.length === 0) {
        console.warn('No valid fields to validate');
        return false;
      }

      const validationPromises = validFields.map(field =>
        this.executeFieldValidation(field),
      );
      const results = await Promise.all(validationPromises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error validating fields:', error);
      return false;
    }
  }

  public async executeFieldValidation(field: Element): Promise<boolean> {
    const fieldId = field instanceof HTMLElement ? field.id : null;
    if (!fieldId) {
      console.warn('Field missing ID attribute:', field);
      return false;
    }

    const selector = `#${fieldId}`;
    if (!document.querySelector(selector)) {
      console.warn(`Field not found with selector: ${selector}`);
      return false;
    }

    const isValid = await this.validator.revalidateField(selector);

    if (isValid) {
      this.invalidFields.delete(fieldId);
    } else {
      this.invalidFields.add(fieldId);
    }

    return isValid;
  }

  public isFieldInvalid(fieldId: string): boolean {
    return this.invalidFields.has(fieldId);
  }

  public clearValidationState(): void {
    this.invalidFields.clear();

    // Clear validation state in state manager
    if (this.stateManager) {
      const state = this.stateManager.getState();
      Object.keys(state.fields).forEach(fieldId => {
        this.stateManager?.setFieldValidation(fieldId, true, []);
      });
    }
  }

  public async validateAll(): Promise<boolean> {
    const isValid = await this.validator.validate();

    // Update form-level validity in state manager
    this.stateManager?.updateState({
      isValid,
    });

    return isValid;
  }

  public addCustomValidation(
    fieldId: string,
    rules: Rules[],
    errorMessages?: Record<string, string>,
  ): void {
    this.customValidations.set(fieldId, rules);

    // Add field to validator with custom rules
    this.validator.addField(
      `#${fieldId}`,
      rules.map(rule => ({
        rule,
        errorMessage: errorMessages?.[rule] || this.getDefaultMessage(rule),
      })),
    );
  }

  public async revalidateField(fieldId: string): Promise<boolean> {
    const isValid = await this.validator.revalidateField(`#${fieldId}`);

    // Update state manager with field validation result
    this.stateManager?.setFieldValidation(fieldId, isValid);

    return isValid;
  }

  private getAutomaticValidationRules(
    field: HTMLInputElement,
  ): FieldRuleInterface[] {
    const rules: FieldRuleInterface[] = [];

    // Required validation
    if (field.required || field.hasAttribute('required')) {
      rules.push({
        rule: 'required' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-required') ||
          this.getDefaultMessage('required'),
      });
    }

    // Email validation
    if (field.type === 'email') {
      rules.push({
        rule: 'email' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-email') ||
          this.getDefaultMessage('email'),
      });
    }

    // Number validation with min/max
    if (field.type === 'number') {
      this.addNumberValidationRules(field, rules);
    }

    // Length validation
    this.addLengthValidationRules(field, rules);

    return rules;
  }

  private addNumberValidationRules(
    field: HTMLInputElement,
    rules: FieldRuleInterface[],
  ): void {
    const min = field.getAttribute('min');
    const max = field.getAttribute('max');

    rules.push({
      rule: 'number' as Rules,
      errorMessage:
        field.getAttribute('data-validate-message-number') ||
        this.getDefaultMessage('number'),
    });

    if (min !== null) {
      rules.push({
        rule: 'minNumber' as Rules,
        value: parseFloat(min),
        errorMessage:
          field.getAttribute('data-validate-message-min') ||
          `Value must be greater than or equal to ${min}`,
      });
    }

    if (max !== null) {
      rules.push({
        rule: 'maxNumber' as Rules,
        value: parseFloat(max),
        errorMessage:
          field.getAttribute('data-validate-message-max') ||
          `Value must be less than or equal to ${max}`,
      });
    }
  }

  private addLengthValidationRules(
    field: HTMLInputElement,
    rules: FieldRuleInterface[],
  ): void {
    const minLength = field.getAttribute('minlength');
    const maxLength = field.getAttribute('maxlength');

    if (minLength !== null) {
      rules.push({
        rule: 'minLength' as Rules,
        value: parseInt(minLength),
        errorMessage:
          field.getAttribute('data-validate-message-minlength') ||
          `Minimum length is ${minLength} characters`,
      });
    }

    if (maxLength !== null) {
      rules.push({
        rule: 'maxLength' as Rules,
        value: parseInt(maxLength),
        errorMessage:
          field.getAttribute('data-validate-message-maxlength') ||
          `Maximum length is ${maxLength} characters`,
      });
    }
  }

  private parseValidationRules(field: Element): FieldRuleInterface[] {
    const rules = field.getAttribute('data-validate-rules')?.split(',') || [];
    return rules.map(rule => ({
      rule: rule as Rules,
      errorMessage:
        field.getAttribute(`data-validate-message-${rule}`) ||
        this.getDefaultMessage(rule),
      ...this.getRuleParams(field, rule),
    }));
  }

  private getRuleParams(field: Element, rule: string): Record<string, any> {
    switch (rule) {
      case 'minLength':
        return {
          value: parseInt(field.getAttribute('data-validate-minlength') || '0'),
        };
      case 'maxLength':
        return {
          value: parseInt(field.getAttribute('data-validate-maxlength') || '0'),
        };
      case 'customRegexp':
        return {
          pattern: new RegExp(
            field.getAttribute('data-validate-pattern') || '',
          ),
        };
      default:
        return {};
    }
  }

  private getDefaultMessage(rule: string): string {
    const messages: Record<string, string> = {
      required: 'This field is required',
      email: 'Please enter a valid email',
      number: 'Please enter a valid number',
      minLength: 'Field is too short',
      maxLength: 'Field is too long',
      customRegexp: 'Invalid format',
      minNumber: 'Value is too small',
      maxNumber: 'Value is too large',
    };
    return messages[rule] || 'Invalid value';
  }

  private addCustomValidations(): void {
    this.customValidations.forEach((rules, fieldId) => {
      this.validator.addField(
        `#${fieldId}`,
        rules.map(rule => ({
          rule,
          errorMessage: this.getDefaultMessage(rule),
        })),
      );
    });
  }
}
