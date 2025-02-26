import intlTelInput from 'intl-tel-input';
import { PhoneFieldConfig } from './types/phoneTypes';

export class PhoneField {
  private element: HTMLElement;
  private config: PhoneFieldConfig;
  private input: HTMLInputElement | null = null;
  private iti: any = null;

  constructor(element: HTMLElement, config: PhoneFieldConfig) {
    this.element = element;
    this.config = {
      validateOnBlur: true,
      defaultCountry: 'us',
      ...config,
    };
    this.init();
  }

  private init(): void {
    try {
      this.input = this.element as HTMLInputElement;
      console.log('PHONE INPUT', this.input);

      if (!this.input) {
        throw new Error(`Phone input element not found: ${this.input}`);
      }

      this.iti = intlTelInput(this.input, {
        onlyCountries: this.config.onlyCountries || [],
        // initialCountry: this.config.defaultCountry,
        initialCountry: 'auto',
        separateDialCode: false,
        formatOnDisplay: true,
        autoPlaceholder: 'aggressive',
        allowDropdown: true,
        geoIpLookup: function (callback: (countryCode: string) => void) {
          fetch('https://ipapi.co/json')
            .then(function (response) {
              if (response.ok) {
                return response.json();
              }
              throw new Error('Failed to fetch country');
            })
            .then(function (data) {
              callback(data.country_code);
            })
            .catch(function () {
              callback('lt'); // Default to LT
            });
        },
        loadUtils: () =>
          import(
            /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.0/build/js/utils.js'
          ),
      } as any);

      (this.input as any).iti = this.iti;

      // Wait for the utils script to load before attaching event listeners
      if (this.iti.promise) {
        this.iti.promise.then(() => {
          console.log('Utils loaded:', intlTelInput.utils);
          console.log('Utils loaded, attaching event listeners');
          this.attachEventListeners();
        });
      } else {
        console.log('no promide');
        // If for some reason the promise is not available, attach immediately
        this.attachEventListeners();
      }
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

    console.log('validateNumber......');
    console.log('Iti:', this.iti);
    console.log('Input value:', this.input.value);

    try {
      const isValid = this.iti.isValidNumber();
      console.log(isValid);
      this.updateValidationUI(isValid);
      return isValid;
    } catch (error) {
      console.error('Phone validation error:', error);
      this.updateValidationUI(false);
      return false;
    }
  }

  private updateValidationUI(isValid: boolean): void {
    if (!this.input) return;

    if (isValid) {
      this.input.classList.remove('error');
      this.input.classList.add('valid');
    } else {
      this.input.classList.remove('valid');
      this.input.classList.add('error');
    }
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

  public getValue(): string {
    return this.input?.value || '';
  }

  public setValue(value: string): void {
    if (this.input) {
      this.input.value = value;
    }
  }

  public async validate(): Promise<boolean> {
    if (!this.input || !this.iti) {
      console.warn('Phone field not properly initialized');
      return false;
    }

    // If field is not required and empty, it's valid
    if (!this.input.value && !this.input.hasAttribute('required')) {
      return true;
    }

    const isValid = this.validateNumber();
    return isValid;
  }

  public reset(): void {
    if (this.input) {
      this.input.value = '';
      this.input.classList.remove('error', 'valid');
    }
  }

  public enable(): void {
    if (this.input) {
      this.input.disabled = false;
    }
  }

  public disable(): void {
    if (this.input) {
      this.input.disabled = true;
    }
  }

  public show(): void {
    if (this.input) {
      this.input.style.display = 'block';
    }
  }

  public hide(): void {
    if (this.input) {
      this.input.style.display = 'none';
    }
  }

  public isValid(): boolean {
    return this.validateNumber();
  }

  public getErrors(): string[] {
    if (!this.input?.value) {
      return this.input?.hasAttribute('required')
        ? ['This field is required']
        : [];
    }

    return this.validateNumber() ? [] : ['Please enter a valid phone number'];
  }
}
