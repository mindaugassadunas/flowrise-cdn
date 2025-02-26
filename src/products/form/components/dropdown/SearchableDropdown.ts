import { CustomDropdown } from './CustomDropdown';
import { DropdownOption, DropdownConfig } from './types/dropdownTypes';

export class SearchableDropdown extends CustomDropdown {
  private currentFilteredOptions: DropdownOption[] = [];

  constructor(element: HTMLElement, config: DropdownConfig) {
    super(element, config);
    this.initializeSearchInput();
    this.setupSearch();
  }

  private initializeSearchInput(): void {
    const searchInput = this.element.querySelector(
      '[fl-part="dropdown-search-input"]',
    );

    if (!searchInput || !(searchInput instanceof HTMLInputElement)) {
      throw new Error(
        'Search input element not found or is not an input element',
      );
    }

    this.elements.searchInput = searchInput;
  }

  private setupSearch(): void {
    if (!this.elements.searchInput) {
      throw new Error('Search input not initialized');
      // Or return early: return;
    }
    const searchInput = this.elements.searchInput;

    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      this.filterOptions(searchTerm);
      this.dispatchEvent('filter', { searchTerm });
    });

    searchInput.addEventListener('click', (e: Event) => {
      e.stopPropagation();
    });

    // Attach the same keyboard handler from BaseDropdown:
    searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Prevent dropdown close when touching search input
    searchInput.addEventListener('touchstart', (e: TouchEvent) => {
      e.stopPropagation();
    });
  }

  private filterOptions(searchTerm: string): void {
    this.currentFilteredOptions = this.options.filter(option =>
      option.label.toLowerCase().includes(searchTerm),
    );
    this.renderFilteredOptions(this.currentFilteredOptions);
  }

  protected selectOptionByIndex(index: number): void {
    // Override to use filtered options when search is active
    if (this.elements.searchInput?.value) {
      if (index >= 0 && index < this.currentFilteredOptions.length) {
        this.selectOption(this.currentFilteredOptions[index]);
      }
    } else {
      super.selectOptionByIndex(index);
    }
  }

  private renderFilteredOptions(filteredOptions: DropdownOption[]): void {
    this.elements.optionsContainer.innerHTML = '';
    this.currentFilteredOptions = filteredOptions; // Update tracked options

    if (filteredOptions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No results found';
      this.elements.optionsContainer.appendChild(noResults);
      return;
    }

    filteredOptions.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.setAttribute('role', 'option');
      optionElement.setAttribute('aria-selected', 'false');
      optionElement.classList.add('form_dropdown_option');
      optionElement.textContent = option.label;
      optionElement.addEventListener('click', () => this.selectOption(option));
      optionElement.addEventListener('mouseover', () => {
        this.activeIndex = index;
        this.updateActiveItem();
      });
      this.elements.optionsContainer.appendChild(optionElement);
    });
  }

  protected moveActiveIndex(direction: number): void {
    const options = this.elements.searchInput?.value
      ? this.currentFilteredOptions
      : this.options;
    const itemsCount = options.length;
    this.activeIndex = Math.max(
      0,
      Math.min(itemsCount - 1, this.activeIndex + direction),
    );
    this.updateActiveItem();
  }

  protected open(): void {
    super.open();
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
      this.elements.searchInput.focus();
    }
    this.renderOptions();
  }
}
