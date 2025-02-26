// components/url/URLField.ts
import { BaseField } from '../../models/formTypes';
import {
  URLFieldConfig,
  URLFieldOptions,
  URLValidationResult,
} from './types/urlTypes';

export class URLField implements BaseField {
  private element: HTMLInputElement;
  private options: URLFieldOptions;
  private errors: string[] = [];
  private isVisible: boolean = true;

  constructor(element: HTMLElement, config: URLFieldConfig) {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error('URL field element must be an input element');
    }

    this.element = element;
    this.options = {
      removeParams: config.removeParams ?? false,
      requiredProtocol: config.requiredProtocol ?? false,
      allowedProtocols: config.allowedProtocols ?? ['http', 'https'],
      trimUrl: config.trimUrl ?? true,
    };

    this.init();
  }

  private init(): void {
    // Set input type to url for better mobile keyboard support
    this.element.type = 'url';

    // Add data attribute for identification
    this.element.setAttribute('data-fl-element', 'url');

    // Add event listeners
    this.element.addEventListener('input', this.handleInput.bind(this));
    this.element.addEventListener('blur', this.handleBlur.bind(this));
  }

  private handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // You could add real-time visual feedback here if needed
  }

  private handleBlur(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.validate();
    }
  }

  public validate(): URLValidationResult {
    const url = this.getValue();
    const result = this.validateUrl(url);

    this.errors = result.isValid ? [] : result.errors;

    // Update UI based on validation result
    if (result.isValid) {
      this.element.classList.remove('error');
      this.element.classList.add('valid');

      // Update with cleaned URL if available and different from current value
      if (result.cleanedUrl && result.cleanedUrl !== url) {
        this.setValue(result.cleanedUrl);
      }
    } else {
      this.element.classList.remove('valid');
      this.element.classList.add('error');
    }

    // Update error message display if it exists
    const errorElement = document.querySelector(
      `[data-error="${this.element.id}"]`,
    );
    if (errorElement) {
      errorElement.textContent = this.errors.join(', ');
      errorElement.classList.toggle('visible', this.errors.length > 0);
    }

    return result;
  }

  private validateUrl(url: string): URLValidationResult {
    const errors: string[] = [];
    let cleanedUrl = url;

    // Skip validation if empty and not required
    if (!url) {
      if (this.element.hasAttribute('required')) {
        errors.push('URL is required');
      }
      return { isValid: errors.length === 0, errors };
    }

    // Apply trimming if enabled
    if (this.options.trimUrl) {
      cleanedUrl = cleanedUrl.trim();
    }

    try {
      // Try to parse the URL to check validity
      let urlObj: URL;
      try {
        // If URL starts with www, add https:// protocol
        if (cleanedUrl.startsWith('www.')) {
          cleanedUrl = 'https://' + cleanedUrl;
        }

        urlObj = new URL(cleanedUrl);
      } catch (e) {
        // If parsing fails, try adding https:// and parse again
        try {
          if (!cleanedUrl.match(/^[a-zA-Z]+:\/\//)) {
            cleanedUrl = 'https://' + cleanedUrl;
            urlObj = new URL(cleanedUrl);
          } else {
            // If it still fails with a protocol, it's invalid
            errors.push('Please enter a valid URL');
            return { isValid: false, errors };
          }
        } catch (e) {
          errors.push('Please enter a valid URL');
          return { isValid: false, errors };
        }
      }

      // Check protocol requirements
      if (this.options.requiredProtocol) {
        const protocol = urlObj.protocol.replace(':', '');
        if (!this.options.allowedProtocols.includes(protocol)) {
          errors.push(
            `URL must use one of these protocols: ${this.options.allowedProtocols.join(', ')}`,
          );
        }
      }

      // Process URL parameters based on configuration
      if (this.options.removeParams && urlObj.search) {
        urlObj.search = '';
        cleanedUrl = urlObj.toString();
      }

      return {
        isValid: errors.length === 0,
        errors,
        cleanedUrl: errors.length === 0 ? cleanedUrl : undefined,
      };
    } catch (error) {
      errors.push('Please enter a valid URL');
      return { isValid: false, errors };
    }
  }

  public getValue(): string {
    return this.element.value;
  }

  public setValue(value: string): void {
    this.element.value = value;
  }

  public getErrors(): string[] {
    return this.errors;
  }

  public show(): void {
    if (!this.isVisible) {
      this.element.style.display = '';
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.isVisible) {
      this.element.style.display = 'none';
      this.isVisible = false;
    }
  }

  public destroy(): void {
    // Remove event listeners
    this.element.removeEventListener('input', this.handleInput.bind(this));
    this.element.removeEventListener('blur', this.handleBlur.bind(this));

    // Remove data attributes
    this.element.removeAttribute('data-fl-element');
  }
}
