import { SearchableDropdown } from './SearchableDropdown';
import { DropdownConfig, DropdownOption } from './types/dropdownTypes';

export class MultiSelectDropdown extends SearchableDropdown {
  private tags!: HTMLElement;

  constructor(element: HTMLElement, config: DropdownConfig) {
    super(element, config);
    this.initializeTags();
  }

  private initializeTags(): void {
    this.tags = document.createElement('div');
    this.tags.setAttribute('fl-part', 'dropdown-tags');
    this.elements.input.appendChild(this.tags);
  }

  protected selectOption(option: DropdownOption): void {
    if (!this.selectedValues.includes(option.value)) {
      const previousValues = [...this.selectedValues];
      this.selectedValues.push(option.value);
      this.renderTags();
      this.updateHiddenInputs();

      this.dispatchEvent('change', {
        value: this.selectedValues,
        previousValue: previousValues,
        source: 'select',
      });
    }
  }

  private renderTags(): void {
    this.tags.innerHTML = '';

    this.selectedValues.forEach(value => {
      const option = this.options.find(opt => opt.value === value);
      if (option) {
        const tag = document.createElement('span');
        tag.className = 'dropdown-tag';
        tag.innerHTML = `
            ${option.label}
            <button class="dropdown-tag-remove" aria-label="Remove ${option.label}">×</button>
          `;

        tag
          .querySelector('.dropdown-tag-remove')
          ?.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.removeValue(value);
          });

        this.tags.appendChild(tag);
      }
    });
  }

  private updateHiddenInputs(): void {
    // Clear existing hidden inputs
    const existingInputs = this.element.querySelectorAll(
      'input[type="hidden"]',
    );
    existingInputs.forEach(input => input.remove());

    // Create new hidden inputs for each selected value
    this.selectedValues.forEach(value => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'multi_dropdown[]'; // Use array notation for multiple values
      input.value = value;
      this.element.appendChild(input);
    });
  }
  private removeValue(value: string): void {
    const previousValues = [...this.selectedValues];
    this.selectedValues = this.selectedValues.filter(v => v !== value);
    this.renderTags();
    this.updateHiddenInputs();

    this.dispatchEvent('change', {
      value: this.selectedValues,
      previousValue: previousValues,
      source: 'remove',
    });
  }

  public getValue(): string[] {
    return this.selectedValues;
  }
}
