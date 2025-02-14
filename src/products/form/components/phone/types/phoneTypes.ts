import { BaseFieldConfig } from '../../../models/formTypes';

export interface PhoneFieldConfig extends BaseFieldConfig {
  onlyCountries?: string[];
  defaultCountry?: string;
  validateOnBlur?: boolean;
  onValidation?: (isValid: boolean, number?: string, countryData?: any) => void;
  onCountryChange?: (countryData: any) => void;
}
