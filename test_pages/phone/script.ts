// script.ts
import 'intl-tel-input/build/css/intlTelInput.css';
import intlTelInput from 'intl-tel-input';

interface PhoneFieldConfig {
  selector: string;
  onlyCountries?: string[];
  defaultCountry?: string;
  validateOnBlur?: boolean;
  onValidation?: (isValid: boolean, number?: string, countryData?: any) => void;
  onCountryChange?: (countryData: any) => void;
}

class PhoneFieldHandler {
  private input: HTMLInputElement | null = null;
  private iti: any = null;
  private config: PhoneFieldConfig;

  constructor(config: PhoneFieldConfig) {
    this.config = {
      validateOnBlur: true,
      defaultCountry: 'us',
      ...config,
    };
    this.init();
  }

  private init(): void {
    try {
      this.input = document.querySelector(
        this.config.selector,
      ) as HTMLInputElement;

      if (!this.input) {
        throw new Error(
          `Phone input element not found: ${this.config.selector}`,
        );
      }

      this.iti = intlTelInput(this.input, {
        onlyCountries: this.config.onlyCountries || [],
        initialCountry: this.config.defaultCountry,
        separateDialCode: true,
        formatOnDisplay: true,
        autoPlaceholder: 'aggressive',
        allowDropdown: true,
        utilsScript:
          'https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.0/build/js/utils.js',
      } as any);

      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to initialize phone input:', error);
    }
  }

  private attachEventListeners(): void {
    if (!this.input || !this.iti) return;

    if (this.config.validateOnBlur) {
      this.input.addEventListener('blur', () => this.validateNumber());
    }

    this.input.addEventListener('countrychange', () => {
      const countryData = this.iti.getSelectedCountryData();
      this.config.onCountryChange?.(countryData);
    });
  }

  public validateNumber(): boolean {
    if (!this.input || !this.iti) return false;

    const isValid = this.iti.isValidNumber();
    const number = isValid ? this.iti.getNumber() : undefined;
    const countryData = this.iti.getSelectedCountryData();

    this.config.onValidation?.(isValid, number, countryData);

    if (isValid) {
      this.input.classList.remove('error');
      this.input.classList.add('valid');
    } else {
      this.input.classList.remove('valid');
      this.input.classList.add('error');
    }

    return isValid;
  }

  public getNumber(): string | undefined {
    if (!this.iti || !this.iti.isValidNumber()) return undefined;
    return this.iti.getNumber();
  }

  public getCountry(): string {
    if (!this.iti) return '';
    return this.iti.getSelectedCountryData().iso2;
  }

  public destroy(): void {
    if (this.iti) {
      this.iti.destroy();
      this.iti = null;
    }
  }
}

// Initialize only when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const phoneField = new PhoneFieldHandler({
    selector: '#phone-input',
    validateOnBlur: true,
    onValidation: (isValid, number, countryData) => {
      console.log('Is valid:', isValid);
      console.log('Number:', number);
      console.log('Country:', countryData);
    },
    onCountryChange: countryData => {
      console.log('Country changed:', countryData);
    },
  });
});

export default PhoneFieldHandler;
