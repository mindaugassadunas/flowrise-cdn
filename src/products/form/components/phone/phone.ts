import 'intl-tel-input/build/css/intlTelInput.css';
import { PhoneField } from './PhoneField';
import { PhoneFieldConfig } from './types/phoneTypes';

export function createPhoneField(
  element: HTMLElement,
  config: PhoneFieldConfig,
) {
  return new PhoneField(element, config);
}

// // Initialize only when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//   const phoneField = new PhoneField({
//     selector: '#phone-input',
//     validateOnBlur: true,
//     onValidation: (isValid, number, countryData) => {
//       console.log('Is valid:', isValid);
//       console.log('Number:', number);
//       console.log('Country:', countryData);
//     },
//     onCountryChange: countryData => {
//       console.log('Country changed:', countryData);
//     },
//   });
// });
