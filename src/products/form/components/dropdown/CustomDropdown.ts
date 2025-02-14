import { BaseDropdown } from './BaseDropdown';
import { DropdownConfig } from './types/dropdownTypes';

// Custom Dropdown Implementation
export class CustomDropdown extends BaseDropdown {
  private typeaheadBuffer: string = '';
  private typeaheadTimeout: number | null = null;

  constructor(element: HTMLElement, config: DropdownConfig) {
    super(element, config);
    this.setupCustomDropdown();
  }

  protected setupCustomDropdown(): void {
    this.renderOptions();
    this.setupInputEvents();
    // this.setupToggleButton();
    this.setupTypeahead();
  }

  protected setupInputEvents(): void {
    this.elements.input.addEventListener('click', () => this.toggle());
  }

  // protected setupToggleButton(): void {
  //   this.elements.toggle.addEventListener('click', (e: Event) => {
  //     e.stopPropagation();
  //     this.toggle();
  //     if (this.isOpen) {
  //       // Focus the input so that keyboard navigation is active.
  //       this.elements.input.focus();
  //     }
  //   });
  // }

  protected renderOptions(): void {
    this.elements.optionsContainer.innerHTML = '';

    this.options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.setAttribute('role', 'option');
      optionElement.setAttribute('aria-selected', 'false');
      optionElement.classList.add('dropdown-item');
      optionElement.textContent = option.label;
      optionElement.addEventListener('click', () => this.selectOption(option));
      optionElement.addEventListener('mouseover', () => {
        this.activeIndex = index;
        this.updateActiveItem();
      });
      this.elements.optionsContainer.appendChild(optionElement);
    });
  }

  private setupTypeahead(): void {
    this.elements.input.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore control keys
      if (e.key.length > 1) return;

      // Clear timeout if exists
      if (this.typeaheadTimeout) {
        clearTimeout(this.typeaheadTimeout);
      }

      // Add character to buffer
      this.typeaheadBuffer += e.key.toLowerCase();

      // Find matching option
      const matchingIndex = this.options.findIndex(option =>
        option.label.toLowerCase().startsWith(this.typeaheadBuffer),
      );

      if (matchingIndex >= 0) {
        this.activeIndex = matchingIndex;
        this.updateActiveItem();
        if (!this.isOpen) {
          this.selectOptionByIndex(matchingIndex);
        }
      }

      // Clear buffer after delay
      this.typeaheadTimeout = window.setTimeout(() => {
        this.typeaheadBuffer = '';
      }, 500); // 500ms delay
    });
  }
}
