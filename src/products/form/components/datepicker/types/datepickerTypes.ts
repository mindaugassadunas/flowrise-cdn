export enum DateRangeMode {
  ALL = 'all',
  PAST = 'past',
  FUTURE = 'future',
  CUSTOM = 'custom',
}

export type DateSeparator = '/' | '.' | '-';

export type DateFormat =
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY/MM/DD'
  | 'MM.DD.YYYY'
  | 'DD.MM.YYYY'
  | 'YYYY.MM.DD'
  | 'MM-DD-YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY-MM-DD';

export interface DatepickerConfig {
  type: 'datepicker';
  format?: DateFormat;
  placeholder?: string;
  initialDate?: Date;
  onChange?: (date: Date | null) => void;
  showTodayButton?: boolean;
  rangeMode?: DateRangeMode;
  minDate?: Date;
  maxDate?: Date;
  allowInput?: boolean;
}

export const DEFAULT_OPTIONS: Required<
  Pick<DatepickerConfig, 'format' | 'placeholder' | 'rangeMode' | 'allowInput'>
> = {
  format: 'MM/DD/YYYY',
  placeholder: 'Select date',
  rangeMode: DateRangeMode.ALL,
  allowInput: false,
};
