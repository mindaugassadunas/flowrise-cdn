import { Rules, FieldRuleInterface } from 'just-validate';
import { URLFieldOptions } from '../components/url/types/urlTypes';
import { URLValidationRules } from './URLValidationRules';

export class ValidationRulesBuilder {
  /**
   * Build automatic validation rules based on the field attributes.
   */
  static buildAutomaticRules(
    field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  ): FieldRuleInterface[] {
    const rules: FieldRuleInterface[] = [];

    // Required validation
    if (field.required || field.hasAttribute('required')) {
      rules.push({
        rule: 'required' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-required') ||
          'This field is required',
      });
    }

    // Email validation
    if (field.type === 'email') {
      rules.push({
        rule: 'email' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-email') ||
          'Please enter a valid email',
      });
    }

    // URL validation
    if (
      field.type === 'url' ||
      field.getAttribute('data-fl-element') === 'url'
    ) {
      if (field instanceof HTMLInputElement) {
        const options: URLFieldOptions = {
          removeParams: field.getAttribute('data-url-remove-params') === 'true',
          requiredProtocol:
            field.getAttribute('data-url-required-protocol') === 'true',
          allowedProtocols: field
            .getAttribute('data-url-allowed-protocols')
            ?.split(',') || ['http', 'https'],
          trimUrl: field.getAttribute('data-url-trim') !== 'false',
        };

        const urlRules = URLValidationRules.buildURLRules(field, options);
        rules.push(...urlRules);
      }
    }

    // Number validation with min/max rules
    if (field.type === 'number') {
      rules.push({
        rule: 'number' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-number') ||
          'Please enter a valid number',
      });

      const min = field.getAttribute('min');
      if (min !== null) {
        rules.push({
          rule: 'minNumber' as Rules,
          value: parseFloat(min),
          errorMessage:
            field.getAttribute('data-validate-message-min') ||
            `Value must be greater than or equal to ${min}`,
        });
      }

      const max = field.getAttribute('max');
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

    // Telephone validation using intl-tel-input
    if (field.type === 'tel') {
      rules.push({
        rule: 'function' as Rules,
        validator: () => {
          const iti = (field as any).iti;
          if (!iti) {
            console.warn('intl-tel-input not initialized for field:', field);
            return false;
          }
          return iti.isValidNumber();
        },
        errorMessage:
          field.getAttribute('data-validate-message-phone') ||
          'Please enter a valid phone number',
      });
    }

    // Fileupload field
    if (field.getAttribute('data-fl-element') === 'fileupload') {
      // File upload validation
      if (field.required || field.hasAttribute('required')) {
        rules.push({
          rule: 'function' as Rules,
          validator: (value: any): boolean => {
            if (!value) return !field.required;

            // For file uploads, value is typically a FileList or array of files
            if (value instanceof FileList || Array.isArray(value)) {
              return value.length > 0;
            }

            return false;
          },
          errorMessage:
            field.getAttribute('data-validate-message-required') ||
            'Please select at least one file',
        });
      }

      return rules; // Return early since we've handled all the validation for file uploads
    }

    // Length validations
    const minLength = field.getAttribute('minlength');
    if (minLength !== null) {
      rules.push({
        rule: 'minLength' as Rules,
        value: parseInt(minLength),
        errorMessage:
          field.getAttribute('data-validate-message-minlength') ||
          `Minimum length is ${minLength} characters`,
      });
    }

    const maxLength = field.getAttribute('maxlength');
    if (maxLength !== null) {
      rules.push({
        rule: 'maxLength' as Rules,
        value: parseInt(maxLength),
        errorMessage:
          field.getAttribute('data-validate-message-maxlength') ||
          `Maximum length is ${maxLength} characters`,
      });
    }

    console.log('ready to validate');
    // Add datepicker-specific validation
    if (field.getAttribute('data-fl-element') === 'datepicker') {
      // Add required validation if needed
      console.log('DATEPICKER DATEPICKER DATEPICKER');
      if (field.required || field.hasAttribute('required')) {
        rules.push({
          rule: 'required' as Rules,

          errorMessage:
            field.getAttribute('data-validate-message-required') ||
            'This field is required',
        });
      }

      // Add custom date validation
      //   rules.push({
      //     rule: 'function' as Rules,
      //     validator: (value: string | boolean): boolean => {
      //       if (!value && !field.required) return true;

      //       // Get datepicker instance
      //       const datepickerElement = field.closest(
      //         '[data-fl-element="datepicker"]',
      //       );
      //       if (!datepickerElement) return false;

      //       const datepicker = (datepickerElement as any)._datepicker;
      //       if (!datepicker) return false;

      //       return datepicker.validate();
      //     },
      //     errorMessage:
      //       field.getAttribute('data-validate-message-date') ||
      //       'Please enter a valid date',
      //   });

      // Add range validation if needed
      const rangeMode = field.getAttribute('data-date-range');
      if (rangeMode) {
        rules.push({
          rule: 'function' as Rules,
          validator: (value: string | boolean): boolean => {
            if (!value) return true;

            const datepickerElement = field.closest(
              '[data-fl-element="datepicker"]',
            );
            if (!datepickerElement) return false;

            const datepicker = (datepickerElement as any)._datepicker;
            if (!datepicker) return false;

            const date = datepicker.getValue();
            if (!date) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            switch (rangeMode) {
              case 'past':
                return date <= today;
              case 'future':
                return date >= today;
              default:
                return true;
            }
          },
          errorMessage:
            field.getAttribute('data-validate-message-range') ||
            'Date is outside allowed range',
        });
      }
    }

    return rules;
  }

  /**
   * Parse custom validation rules specified by the data attributes.
   */
  static parseCustomRules(field: Element): FieldRuleInterface[] {
    const rules: FieldRuleInterface[] = [];
    const ruleNames =
      field.getAttribute('data-validate-rules')?.split(',') || [];

    ruleNames.forEach(ruleName => {
      const trimmedRule = ruleName.trim();

      // Extend with additional cases as needed
      switch (trimmedRule) {
        case 'url':
          // Special handling for URL validation
          if (field instanceof HTMLInputElement) {
            const options: URLFieldOptions = {
              removeParams:
                field.getAttribute('data-url-remove-params') === 'true',
              requiredProtocol:
                field.getAttribute('data-url-required-protocol') === 'true',
              allowedProtocols: field
                .getAttribute('data-url-allowed-protocols')
                ?.split(',') || ['http', 'https'],
              trimUrl: field.getAttribute('data-url-trim') !== 'false', // Default to true
            };

            const urlRules = URLValidationRules.buildURLRules(field, options);
            rules.push(...urlRules);
          }
          break;
        // case 'customRegexp': {
        //   const pattern = field.getAttribute('data-validate-pattern') || '';
        //   rules.push({
        //     rule: 'customRegexp' as Rules,
        //     errorMessage:
        //       field.getAttribute(`data-validate-message-${trimmedRule}`) ||
        //       'Invalid format',
        //     pattern: new RegExp(pattern),
        //   });
        //   break;
        // }
        // Add more custom rules here

        default:
          // Fallback for simple rules without extra parameters
          rules.push({
            rule: trimmedRule as Rules,
            errorMessage:
              field.getAttribute(`data-validate-message-${trimmedRule}`) ||
              'Invalid value',
          });
          break;
      }
    });

    return rules;
  }
}
