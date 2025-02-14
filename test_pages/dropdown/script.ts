// Types and interfaces
interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownConfig {
  options: DropdownOption[];
  placeholder?: string;
  onChange?: (
    event: CustomEvent<{
      value: string | string[];
      previousValue: string | string[];
      source: 'select' | 'remove';
    }>,
  ) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onFilter?: (
    event: CustomEvent<{
      searchTerm: string;
    }>,
  ) => void;
  searchable?: boolean;
  multiSelect?: boolean;
  removable?: boolean;
}

interface DropdownElements {
  input: HTMLElement;
  menu: HTMLElement;
  toggle: HTMLElement;
  optionsContainer: HTMLElement;
  searchInput?: HTMLInputElement;
}

// Base Dropdown class with enhanced features
class BaseDropdown {
  protected element: HTMLElement;
  protected elements: DropdownElements;
  protected options: DropdownOption[];
  protected isOpen: boolean = false;
  protected selectedValues: string[] = [];
  protected config: DropdownConfig;
  protected activeIndex: number = -1;
  protected hiddenInput!: HTMLInputElement;
  protected toggleButton: HTMLButtonElement;
  protected removeButton?: HTMLButtonElement;
  private touchStarted: boolean = false;
  private touchTimer: number | null = null;

  constructor(element: HTMLElement, config: DropdownConfig) {
    this.element = element;
    this.config = config;
    this.options = config.options;
    this.validateAndInitializeElements();
    this.init();
    this.initializeHiddenInput();
    this.initializeButtons();
    if (this.config.removable && !this.config.multiSelect) {
      this.initializeRemoveButton();
    }
  }

  private validateAndInitializeElements(): void {
    const input = this.element.querySelector('[fl-part="dropdown-input"]');
    const menu = this.element.querySelector('[fl-part="dropdown-menu"]');
    const toggle = this.element.querySelector('[fl-part="dropdown-toggle"]');
    const optionsContainer = this.element.querySelector(
      '[fl-part="dropdown-options-container"]',
    );
    console.log(input);
    console.log(menu);
    console.log(toggle);
    console.log(optionsContainer);

    // Validate all required elements exist before assigning
    if (!input || !menu || !toggle || !optionsContainer) {
      throw new Error(`Required dropdown elements not found`);
    }

    // After validation, we can safely assert these are HTMLElements
    this.elements = {
      input: input as HTMLElement,
      menu: menu as HTMLElement,
      toggle: toggle as HTMLElement,
      optionsContainer: optionsContainer as HTMLElement,
    };
  }

  private initializeRemoveButton(): void {
    // Create a new button element for clearing the selection.
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('dropdown-remove-button');
    removeBtn.innerHTML = '×';
    // Initially hidden.
    removeBtn.style.display = 'none';

    // Append the remove button so that it overlays the toggle button.
    this.element.appendChild(removeBtn);
    this.removeButton = removeBtn;

    // When remove button is clicked, clear the selection and prevent propagation.
    removeBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.clearSelection();
    });

    // Show and hide the remove button—and hide or show the toggle button accordingly.
    const showRemoveButton = (): void => {
      if (this.hasSelection()) {
        removeBtn.style.display = 'block';
        // Hide the toggle button so it doesn't interfere.
        this.toggleButton.style.visibility = 'hidden';
      }
    };

    const hideRemoveButton = (e: MouseEvent): void => {
      // Only hide if the mouse has left both the input and the remove button.
      const related = e.relatedTarget as Node;
      if (
        !this.elements.input.contains(related) &&
        !removeBtn.contains(related)
      ) {
        removeBtn.style.display = 'none';
        // Restore the toggle button's visibility.
        this.toggleButton.style.visibility = 'visible';
      }
    };

    // Attach the events.
    this.elements.input.addEventListener('mouseenter', showRemoveButton);
    this.elements.input.addEventListener('mouseleave', hideRemoveButton);
    removeBtn.addEventListener('mouseenter', showRemoveButton);
    removeBtn.addEventListener('mouseleave', hideRemoveButton);
  }

  protected init(): void {
    this.setupKeyboardNavigation();
    this.attachEventListeners();
    this.setupTouchEvents();
    window.addEventListener('resize', this.updateMenuPosition);
  }

  private initializeButtons(): void {
    this.toggleButton = this.elements.toggle as HTMLButtonElement;
    this.setupButtonEvents();
  }

  private setupButtonEvents(): void {
    this.toggleButton.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.toggle();
      if (this.isOpen) {
        // Focus the input so that keyboard navigation is active.
        this.elements.input.focus();
      }
    });
  }

  protected hasSelection(): boolean {
    return this.selectedValues.length > 0;
  }

  public clearSelection(): void {
    if (!this.config.removable) return;

    const previousValue = this.getValue();
    this.selectedValues = [];
    this.updateInputValue('');
    this.hiddenInput.value = '';

    this.dispatchEvent('change', {
      value: '',
      previousValue,
      source: 'remove',
    });
  }

  protected handleKeyDown(e: KeyboardEvent): void {
    if (
      !this.isOpen &&
      (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')
    ) {
      e.preventDefault();
      this.open();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveActiveIndex(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveActiveIndex(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.activeIndex >= 0) {
          this.selectOptionByIndex(this.activeIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      default:
        break;
    }
  }

  protected setupKeyboardNavigation(): void {
    this.elements.input.addEventListener(
      'keydown',
      this.handleKeyDown.bind(this),
    );
  }

  protected moveActiveIndex(direction: number): void {
    const itemsCount = this.options.length;
    this.activeIndex = Math.max(
      0,
      Math.min(itemsCount - 1, this.activeIndex + direction),
    );
    this.updateActiveItem();
  }

  protected updateActiveItem(): void {
    const items =
      this.elements.optionsContainer.querySelectorAll('[role="option"]');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === this.activeIndex);
      item.setAttribute(
        'aria-selected',
        (index === this.activeIndex).toString(),
      );
    });

    // Scroll active item into view
    if (this.activeIndex >= 0) {
      const activeItem = items[this.activeIndex] as HTMLElement;
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  protected attachEventListeners(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e: Event) => {
      if (!this.element.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  private setupTouchEvents(): void {
    this.element.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.touchStarted) return;

      this.touchStarted = true;
      if (this.touchTimer) clearTimeout(this.touchTimer);

      this.touchTimer = window.setTimeout(() => {
        this.touchStarted = false;
      }, 500);
    });

    // Prevent scroll when interacting with dropdown
    this.elements.optionsContainer.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (this.isOpen) {
          e.stopPropagation();
        }
      },
      { passive: false },
    );
  }

  private updateMenuPosition = (): void => {
    if (!this.isOpen) return;

    const inputRect = this.elements.input.getBoundingClientRect();
    const menuHeight = this.elements.menu.offsetHeight;
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - inputRect.bottom;

    // Reset styles first
    this.elements.menu.style.top = '';
    this.elements.menu.style.bottom = '';
    this.elements.menu.style.maxHeight = '';

    if (spaceBelow < menuHeight) {
      // Not enough space below, check space above
      const spaceAbove = inputRect.top;
      const maxHeight = Math.max(spaceBelow, spaceAbove);

      if (spaceAbove > spaceBelow) {
        // Show above
        this.elements.menu.style.bottom = '100%';
        this.elements.menu.style.maxHeight = `${spaceAbove - 10}px`;
      } else {
        // Show below with scroll
        this.elements.menu.style.top = '100%';
        this.elements.menu.style.maxHeight = `${spaceBelow - 10}px`;
      }
    } else {
      // Enough space below
      this.elements.menu.style.top = '100%';
      this.elements.menu.style.maxHeight = `${spaceBelow - 10}px`;
    }
  };

  private initializeHiddenInput(): void {
    const existingInput = this.element.querySelector<HTMLInputElement>(
      'input[type="hidden"]',
    );

    if (existingInput) {
      this.hiddenInput = existingInput;
    } else {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = this.element.getAttribute('fl-name') || 'dropdown';
      this.element.appendChild(input);
      this.hiddenInput = input;
    }
  }

  protected open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    this.elements.input.setAttribute('aria-expanded', 'true');
    this.elements.menu.classList.add('show');
    this.updateMenuPosition();
    this.dispatchEvent('open');
  }

  protected close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.elements.input.setAttribute('aria-expanded', 'false');
    this.elements.menu.classList.remove('show');
    this.activeIndex = -1;
    this.dispatchEvent('close');
  }

  protected toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  protected selectOptionByIndex(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.selectOption(this.options[index]);
    }
  }

  protected selectOption(option: DropdownOption): void {
    const previousValue = this.getValue();
    this.selectedValues = [option.value];
    this.updateInputValue(option.label);
    this.hiddenInput.value = option.value;
    this.close();

    this.dispatchEvent('change', {
      value: option.value,
      previousValue,
      source: 'select',
    });
  }

  protected updateInputValue(value: string): void {
    if (this.elements.input) {
      this.elements.input.textContent = value || this.config.placeholder || '';
    }
  }

  protected dispatchEvent(name: string, detail: any = {}): void {
    const event = new CustomEvent(name, { detail });
    this.element.dispatchEvent(event);
  }

  // Public API Methods
  public getValue(): string | string[] {
    return this.selectedValues[0] || '';
  }

  public setValue(value: string): void {
    const option = this.options.find(opt => opt.value === value);
    if (option) {
      this.selectOption(option);
    }
  }

  public updateOptions(newOptions: DropdownOption[]): void {
    this.options = newOptions;
    this.renderOptions();
  }

  protected renderOptions(): void {
    // To be implemented by child classes
  }
}

// Custom Dropdown Implementation
class CustomDropdown extends BaseDropdown {
  private typeaheadBuffer: string = '';
  private typeaheadTimeout: number | null = null;

  constructor(element: HTMLElement, config: DropdownConfig) {
    super(element, config);
    this.setupCustomDropdown();
  }

  protected setupCustomDropdown(): void {
    this.renderOptions();
    this.setupInputEvents();
    this.setupToggleButton();
    this.setupTypeahead();
  }

  protected setupInputEvents(): void {
    this.elements.input.addEventListener('click', () => this.toggle());
  }

  protected setupToggleButton(): void {
    this.elements.toggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.toggle();
      if (this.isOpen) {
        // Focus the input so that keyboard navigation is active.
        this.elements.input.focus();
      }
    });
  }

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

// Searchable Dropdown Implementation
class SearchableDropdown extends CustomDropdown {
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

// Multi-select Dropdown Implementation
class MultiSelectDropdown extends SearchableDropdown {
  private tags: HTMLElement;

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

// Factory function to create appropriate dropdown type
function createDropdown(
  element: HTMLElement,
  config: DropdownConfig,
): BaseDropdown {
  const type = element.getAttribute('fl-type');

  switch (type) {
    case 'searchable':
      return new SearchableDropdown(element, config);
    case 'custom':
      return new CustomDropdown(element, config);
    case 'multi':
      return new MultiSelectDropdown(element, config);
    default:
      return new CustomDropdown(element, config);
  }
}

// Usage example
const dropdownConfig: DropdownConfig = {
  options: [
    { value: '1', label: 'Apple' },
    { value: '2', label: 'Orange' },
    { value: '3', label: 'Lemon' },
  ],
  placeholder: 'Select an option',
  onChange: value => console.log('Selected:', value),
  searchable: true,
  multiSelect: false,
  removable: true,
};

// Initialize dropdowns
document.querySelectorAll('[fl="dropdown"]').forEach(element => {
  createDropdown(element as HTMLElement, dropdownConfig);
});
