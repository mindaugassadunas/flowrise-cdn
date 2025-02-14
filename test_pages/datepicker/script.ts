enum DateRangeMode {
  ALL = 'all',
  PAST = 'past',
  FUTURE = 'future',
  CUSTOM = 'custom',
}

type DateSeparator = '/' | '.' | '-';
type DateFormat =
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY/MM/DD'
  | 'MM.DD.YYYY'
  | 'DD.MM.YYYY'
  | 'YYYY.MM.DD'
  | 'MM-DD-YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY-MM-DD';

interface DatePickerOptions {
  format?: DateFormat;
  placeholder?: string;
  initialDate?: Date;
  onChange?: (date: Date) => void;
  showTodayButton?: boolean;
  rangeMode?: DateRangeMode;
  minDate?: Date;
  maxDate?: Date;
  allowInput?: boolean;
}

const DEFAULT_OPTIONS: Required<
  Pick<DatePickerOptions, 'format' | 'placeholder' | 'rangeMode' | 'allowInput'>
> = {
  format: 'MM/DD/YYYY',
  placeholder: 'Select date',
  rangeMode: DateRangeMode.ALL,
  allowInput: false,
};

class DatePicker {
  private element: HTMLElement;
  private input: HTMLInputElement;
  private calendar: HTMLDivElement;
  private selectedDate: Date | null;
  private options: DatePickerOptions;
  private isOpen: boolean = false;
  private rangeMode: DateRangeMode;
  private inputTimeout: NodeJS.Timeout | null = null;

  constructor(element: HTMLElement, options: Partial<DatePickerOptions> = {}) {
    this.element = element;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.rangeMode = this.options.rangeMode || DateRangeMode.ALL;
    this.selectedDate = this.validateInitialDate(options.initialDate);
    this.init();
  }

  private validateInitialDate(date: Date | undefined): Date | null {
    if (!date) return null;

    if (this.isDateDisabled(date)) {
      console.warn('Initial date is outside allowed range, ignoring...');
      return null;
    }

    return date;
  }

  private init(): void {
    this.createInput();
    this.createCalendar();
    this.attachEventListeners();
  }

  private createInput(): void {
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder =
      this.options.placeholder || DEFAULT_OPTIONS.placeholder;
    this.input.readOnly = !this.options.allowInput;
    this.input.className = 'fl-datepicker-input';

    if (this.selectedDate) {
      this.input.value = this.formatDate(this.selectedDate);
    }

    if (this.options.allowInput) {
      this.attachInputEvents();
    }

    this.element.appendChild(this.input);
  }

  private getFormatSeparator(format = this.options.format): DateSeparator {
    if (!format) return '/';
    if (format.includes('/')) return '/';
    if (format.includes('.')) return '.';
    if (format.includes('-')) return '-';
    return '/';
  }

  private createCalendar(): void {
    this.calendar = document.createElement('div');
    this.calendar.className = 'fl-datepicker-calendar';
    this.calendar.style.display = 'none';
    this.element.appendChild(this.calendar);
  }

  private attachEventListeners(): void {
    this.input.addEventListener('click', () => {
      if (!this.isOpen) {
        this.openCalendar();
      }
    });

    document.addEventListener('click', (e: Event) => {
      const target = e.target as Node;
      if (!this.element.contains(target)) {
        if (this.isOpen) {
          this.closeCalendar();
        }
        // Remove focus from input if clicking outside
        if (document.activeElement === this.input) {
          this.input.blur();
        }
      }
    });
  }

  private toggleCalendar(): void {
    if (this.isOpen) {
      this.closeCalendar();
    } else {
      this.openCalendar();
    }
  }

  private openCalendar(): void {
    this.isOpen = true;
    this.calendar.style.display = 'block';
    this.renderCalendar();
  }

  private closeCalendar(): void {
    this.isOpen = false;
    this.calendar.style.display = 'none';
  }

  private renderCalendar(): void {
    const currentDate = this.selectedDate || new Date();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const header = this.createCalendarHeader(currentDate);
    const daysGrid = this.createDaysGrid(firstDay, lastDay);

    this.calendar.innerHTML = '';
    this.calendar.appendChild(header);
    this.calendar.appendChild(daysGrid);
  }

  private createCalendarHeader(currentDate: Date): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'fl-datepicker-header';

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '←';
    prevButton.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.navigateMonth(-1);
    });

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '→';
    nextButton.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.navigateMonth(1);
    });

    const title = document.createElement('span');
    title.textContent = this.formatMonthYear(currentDate);

    header.appendChild(prevButton);
    header.appendChild(title);
    header.appendChild(nextButton);

    if (this.options.showTodayButton) {
      const todayButton = document.createElement('button');
      todayButton.className = 'fl-datepicker-today-btn';
      todayButton.textContent = 'Today';
      todayButton.setAttribute('type', 'button');
      todayButton.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const today = new Date();
        if (!this.isDateDisabled(today)) {
          this.selectDate(today);
        }
      });

      const headerActions = document.createElement('div');
      headerActions.className = 'fl-datepicker-header-actions';
      headerActions.appendChild(todayButton);
      header.appendChild(headerActions);
    }

    return header;
  }

  private createDaysGrid(firstDay: Date, lastDay: Date): HTMLDivElement {
    const grid = document.createElement('div');
    grid.className = 'fl-datepicker-grid';

    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'fl-datepicker-day-header';
      dayHeader.textContent = day;
      grid.appendChild(dayHeader);
    });

    // Add empty cells for days before first day of month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'fl-datepicker-day empty';
      grid.appendChild(emptyCell);
    }

    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(
        firstDay.getFullYear(),
        firstDay.getMonth(),
        day,
      );

      const dayCell = document.createElement('div');
      dayCell.className = 'fl-datepicker-day';
      dayCell.textContent = day.toString();

      const isDisabled = this.isDateDisabled(currentDate);
      const isSelected = this.isDateSelected(currentDate);
      const isToday = this.isToday(currentDate);

      if (isSelected) dayCell.classList.add('selected');
      if (isDisabled) dayCell.classList.add('disabled');
      if (isToday) dayCell.classList.add('today');

      if (!isDisabled) {
        dayCell.addEventListener('click', () => this.selectDate(currentDate));
      }

      grid.appendChild(dayCell);
    }

    return grid;
  }

  private navigateMonth(delta: number): void {
    const currentDate = this.selectedDate || new Date();
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + delta,
      1,
    );
    this.selectedDate = newDate;
    this.renderCalendar();
  }

  private selectDate(date: Date): void {
    if (this.isDateDisabled(date)) return;

    const previousDate = this.selectedDate;
    this.selectedDate = date;

    // Always update input value when selecting via calendar
    this.input.value = this.formatDate(date);

    // Close calendar only if date was selected via click (not via typing)
    if (!this.options.allowInput || document.activeElement !== this.input) {
      this.closeCalendar();
    } else {
      // If typing and month changed, update calendar view
      const monthChanged =
        !previousDate ||
        previousDate.getMonth() !== date.getMonth() ||
        previousDate.getFullYear() !== date.getFullYear();

      if (monthChanged) {
        this.renderCalendar();
      }
    }

    if (this.options.onChange) {
      this.options.onChange(date);
    }
  }

  private isDateSelected(date: Date): boolean {
    if (!this.selectedDate) return false;
    return (
      date.getDate() === this.selectedDate.getDate() &&
      date.getMonth() === this.selectedDate.getMonth() &&
      date.getFullYear() === this.selectedDate.getFullYear()
    );
  }

  private isDateDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    switch (this.rangeMode) {
      case DateRangeMode.PAST:
        return compareDate > today;

      case DateRangeMode.FUTURE:
        return compareDate < today;

      case DateRangeMode.CUSTOM:
        if (this.options.minDate) {
          const minDate = new Date(this.options.minDate);
          minDate.setHours(0, 0, 0, 0);
          if (compareDate < minDate) return true;
        }

        if (this.options.maxDate) {
          const maxDate = new Date(this.options.maxDate);
          maxDate.setHours(0, 0, 0, 0);
          if (compareDate > maxDate) return true;
        }
        return false;

      case DateRangeMode.ALL:
      default:
        return false;
    }
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  private attachInputEvents(): void {
    // Handle manual input
    this.input.addEventListener('input', (e: Event) => {
      const input = e.target as HTMLInputElement;
      const value = input.value;
      const format = this.options.format || DEFAULT_OPTIONS.format;
      const separator = this.getFormatSeparator(format);

      // Clear existing timeout
      if (this.inputTimeout) {
        clearTimeout(this.inputTimeout);
      }

      // Set new timeout for parsing
      this.inputTimeout = setTimeout(() => {
        // Only attempt to parse and format if we have a potentially complete date
        const parts = value.split(separator);
        if (parts.length === 3) {
          const lastPart = parts[2];
          // Only format if the last part (day or year depending on format) has the expected length
          const formatParts = format.split(separator);
          const expectedLength = formatParts[2] === 'YYYY' ? 4 : 2;

          if (lastPart.length === expectedLength) {
            this.handleDateInput(value);
          }
        }
      }, 100);
    });

    // Keep calendar open on focus
    this.input.addEventListener('focus', () => {
      if (!this.isOpen) {
        this.openCalendar();
      }
    });

    // Handle Enter key
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission and default behavior

        // If we have a valid date in the input, select it and close calendar
        const inputValue = this.input.value;
        const date = this.parseDate(inputValue);

        if (date && !this.isDateDisabled(date)) {
          this.selectDate(date);
          this.closeCalendar();
          this.input.blur(); // Remove focus from input
        }
      }
    });

    // Auto-insert separators as user types
    this.input.addEventListener('keyup', (e: KeyboardEvent) => {
      const input = e.target as HTMLInputElement;
      const value = input.value;
      const format = this.options.format || DEFAULT_OPTIONS.format;
      const separator = this.getFormatSeparator(format);

      // Get current cursor position and value without separators
      const cursorPosition = input.selectionStart || 0;
      const digitsOnly = value.replace(/\D/g, '');

      // Don't process if backspace/delete was pressed
      if (e.key === 'Backspace' || e.key === 'Delete') {
        return;
      }

      let formattedValue = '';
      let digitIndex = 0;
      const formatParts = format.split(separator);

      // Build the formatted string based on the input digits
      for (let i = 0; i < formatParts.length; i++) {
        const partLength = formatParts[i].length;
        const currentPart = digitsOnly.slice(
          digitIndex,
          digitIndex + partLength,
        );

        if (currentPart) {
          formattedValue += currentPart;
          // Add separator if this isn't the last part and we have all digits for current part
          if (i < formatParts.length - 1 && currentPart.length === partLength) {
            formattedValue += separator;
          }
        }

        digitIndex += partLength;
      }

      // Update input value only if it's different
      if (formattedValue !== value) {
        const newCursorPos = formattedValue.length;
        input.value = formattedValue;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  private handleDateInput(value: string): void {
    const date = this.parseDate(value);

    if (!date) {
      return;
    }

    if (this.isDateDisabled(date)) {
      return;
    }

    // Store the previous selected date (if any) to compare year and month.
    const previousDate = this.selectedDate;

    // Update selected date.
    this.selectedDate = date;

    // Compare both month and year to decide if we need to re-render the calendar.
    const previousMonth = previousDate ? previousDate.getMonth() : new Date().getMonth();
    const previousYear = previousDate ? previousDate.getFullYear() : new Date().getFullYear();

    if (previousMonth !== date.getMonth() || previousYear !== date.getFullYear()) {
      this.renderCalendar();
    } else {
      // If same month and year, just update the selection styling.
      const days = this.calendar.querySelectorAll('.fl-datepicker-day');
      days.forEach(day => {
        const dayNumber = parseInt(day.textContent || '0');
        if (dayNumber === date.getDate()) {
          day.classList.add('selected');
        } else {
          day.classList.remove('selected');
        }
      });
    }

    // Update the input value to the formatted date, retaining the cursor position.
    const formattedDate = this.formatDate(date);
    if (this.input.value !== formattedDate) {
      const prevCursorPosition = this.input.selectionStart;
      this.input.value = formattedDate;
      if (document.activeElement === this.input) {
        this.input.setSelectionRange(prevCursorPosition!, prevCursorPosition!);
      }
    }

    if (this.options.onChange) {
      this.options.onChange(date);
    }
  }

  private parseDate(value: string): Date | null {
    const format = this.options.format || DEFAULT_OPTIONS.format;
    // Remove any non-numeric characters except /
    const cleaned = value.replace(/[^\d/.-]/g, '');
    const parts = cleaned.split(/[/.-]/);

    if (parts.length !== 3) return null;

    let month: number, day: number, year: number;

    // Determine format type by checking first separator in format
    const formatType = format.split(/[/.-]/)[0].length;

    // YYYY* format
    if (formatType === 4) {
      [year, month, day] = parts.map(p => parseInt(p));
      month -= 1; // Convert to 0-based month
    }
    // MM* format
    else if (format.startsWith('MM')) {
      [month, day, year] = parts.map(p => parseInt(p));
      month -= 1;
    }
    // DD* format
    else {
      [day, month, year] = parts.map(p => parseInt(p));
      month -= 1;
    }

    // Basic validation
    if (
      month >= 0 &&
      month < 12 &&
      day > 0 &&
      day <= 31 &&
      year > 1900 &&
      year < 2100
    ) {
      const date = new Date(year, month, day);

      // Validate the date is real (handles edge cases like 02/31/2024)
      if (
        date.getMonth() === month &&
        date.getDate() === day &&
        date.getFullYear() === year
      ) {
        return date;
      }
    }

    return null;
  }

  private formatDate(date: Date): string {
    const format = this.options.format || DEFAULT_OPTIONS.format;
    const separator = this.getFormatSeparator(format);

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();

    // Determine format type by checking first part
    const formatType = format.split(/[/.-]/)[0].length;

    // YYYY* format
    if (formatType === 4) {
      return `${year}${separator}${month}${separator}${day}`;
    }
    // MM* format
    else if (format.startsWith('MM')) {
      return `${month}${separator}${day}${separator}${year}`;
    }
    // DD* format
    else {
      return `${day}${separator}${month}${separator}${year}`;
    }
  }

  private formatMonthYear(date: Date): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

// Initialize datepickers on load
document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('[fl=datepicker]');
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      //   new DatePicker(element);
      // Future dates only
      const futurePicker = new DatePicker(element, {
        format: 'YYYY-MM-DD',
        allowInput: true,
        rangeMode: DateRangeMode.PAST,
        placeholder: 'Select future date',
        showTodayButton: true,
      });
    }
  });
});

export default DatePicker;
