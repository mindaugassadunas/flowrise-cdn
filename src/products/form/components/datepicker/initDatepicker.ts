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
