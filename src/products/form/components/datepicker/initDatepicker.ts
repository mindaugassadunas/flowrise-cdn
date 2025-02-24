import { DatepickerConfig } from './types/datepickerTypes';
import { Datepicker } from './Datepicker';

export function createDatepicker(
  element: HTMLElement,
  config: DatepickerConfig,
): Datepicker {
  const datepicker = new Datepicker(element, config);

  (element as any)._datepicker = datepicker;

  return datepicker;
}

// Initialize datepickers on load
// document.addEventListener('DOMContentLoaded', () => {
//   const elements = document.querySelectorAll('[fl=datepicker]');
//   elements.forEach(element => {
//     if (element instanceof HTMLElement) {
//       //   new DatePicker(element);
//       // Future dates only
//       const futurePicker = new Datepicker(element, {
//         format: 'YYYY-MM-DD',
//         allowInput: true,
//         rangeMode: DateRangeMode.PAST,
//         placeholder: 'Select future date',
//         showTodayButton: true,
//       });
//     }
//   });
// });
