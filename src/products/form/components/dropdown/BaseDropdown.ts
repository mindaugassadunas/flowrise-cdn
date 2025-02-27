import { Portal } from '../../utils/Portal';
import {
  DropdownElements,
  DropdownConfig,
  DropdownOption,
} from './types/dropdownTypes';

export class BaseDropdown {
  protected element: HTMLElement;
  protected elements!: DropdownElements;
  protected options: DropdownOption[];
  protected isOpen: boolean = false;
  protected selectedValues: string[] = [];
  protected config: DropdownConfig;
  protected activeIndex: number = -1;
  protected hiddenInput!: HTMLInputElement;
  protected toggleButton!: HTMLButtonElement;
  protected removeButton?: HTMLButtonElement;
  private touchStarted: boolean = false;
  private touchTimer: number | null = null;
  private portal: Portal | null = null;

  constructor(element: HTMLElement, config: DropdownConfig) {
    this.element = element;
    this.config = config;
    this.options = this.initializeOptions();
    this.validateAndInitializeElements();
    this.init();
    this.initializeHiddenInput();
    this.initializeButtons();
    if (this.config.removable && !this.config.multiSelect) {
      this.initializeRemoveButton();
    }
    this.setupPortal();
  }

  private setupPortal(): void {
    this.portal = new Portal('dropdown-portal');
  }

  private moveToPortal(): void {
    if (!this.portal || !this.elements.menu) return;

    this.elements.menu.style.display = 'flex';
    this.portal.mount(this.elements.menu);
  }

  private removeFromPortal(): void {
    if (!this.portal) return;
    this.portal.unmount();
  }

  private initializeOptions(): DropdownOption[] {
    // First check for inline HTML options
    const inlineOptions = this.getInlineOptions();

    // If inline options exist, use them
    if (inlineOptions.length > 0) {
      return inlineOptions;
    }

    // Otherwise, use config options if they exist
    if (this.config.options) {
      return Array.isArray(this.config.options)
        ? this.config.options
        : [this.config.options];
    }

    // If no options are found, return empty array
    return [];
  }

  private getInlineOptions(): DropdownOption[] {
    const optionElements = this.element.querySelectorAll(
      '[fl-part="dropdown-option"]',
    );

    return Array.from(optionElements).map(element => {
      const value = element.getAttribute('value') || '';
      const label = element.textContent || '';
      // Optional: get additional data attributes
      const dataset = (element as HTMLElement).dataset;
      const data = Object.keys(dataset).reduce(
        (acc, key) => {
          acc[key] = dataset[key] || '';
          return acc;
        },
        {} as Record<string, string>,
      );

      return {
        value,
        label,
        data,
      };
    });
  }

  private validateAndInitializeElements(): void {
    console.log('this dropdown', this.element);
    const input = this.element.querySelector('[fl-part="dropdown-input"]');
    const menu = this.element.querySelector('[fl-part="dropdown-menu"]');
    const toggle = this.element.querySelector('[fl-part="dropdown-toggle"]');
    const optionsContainer = this.element.querySelector(
      '[fl-part="dropdown-options-wrapper"]',
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
    if (this.config.placeholder) {
      this.updateInputValue(this.config.placeholder);
    }
    window.addEventListener('resize', this.updateMenuPosition);
    // window.addEventListener('scroll', this.updateMenuPosition, true);
  }

  private initializeButtons(): void {
    this.toggleButton = this.elements.toggle as HTMLButtonElement;
    this.setupButtonEvents();
  }

  private setupButtonEvents(): void {
    this.toggleButton.addEventListener('click', (e: Event) => {
      console.log('click on toggle');
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
      item.classList.toggle('is-active', index === this.activeIndex);
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
      const target = e.target as Node;

      // If this component has a portal, check if click is in own portal
      if (this.portal) {
        const portalId = this.portal.getPortalId();
        const clickedPortal = (target as HTMLElement).closest(
          '[data-portal-id]',
        );

        // If clicked in our portal or component, do nothing
        if (
          (clickedPortal &&
            clickedPortal.getAttribute('data-portal-id') === portalId) ||
          this.element.contains(target)
        ) {
          return;
        }
      }

      // If we get here, click was outside both portal and component
      this.close();
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
    if (!this.isOpen || !this.portal || !this.elements.menu) return;

    const inputRect = this.elements.input.getBoundingClientRect();
    const menuHeight = this.elements.menu.offsetHeight;
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - inputRect.bottom;

    // Position portal container
    this.portal.updatePosition(this.elements.input, {
      placement: 'auto',
      offset: 4,
      maxHeight: spaceBelow < menuHeight ? spaceBelow - 10 : undefined,
    });

    // Reset styles first
    this.elements.menu.style.position = 'static';
    this.elements.menu.style.width = '100%';
    this.elements.menu.style.maxHeight = '';

    // // Calculate maximum height based on available space
    // if (spaceBelow < menuHeight) {
    //   const spaceAbove = inputRect.top;
    //   if (spaceAbove > spaceBelow) {
    //     // Show above
    //     this.portalContainer.style.top = `${inputRect.top - Math.min(menuHeight, spaceAbove - 10)}px`;
    //     this.elements.menu.style.maxHeight = `${spaceAbove - 10}px`;
    //   } else {
    //     // Show below with scroll
    //     this.elements.menu.style.maxHeight = `${spaceBelow - 10}px`;
    //   }
    // } else {
    //   // Enough space below
    //   this.elements.menu.style.maxHeight = `${spaceBelow - 10}px`;
    // }
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
    console.log('OPEN');

    console.log('OPEN, isOpen before:', this.isOpen);
    this.isOpen = true;
    console.log('OPEN, isOpen after:', this.isOpen);
    this.elements.input.setAttribute('aria-expanded', 'true');
    this.elements.menu.classList.add('show');
    this.moveToPortal();
    this.updateMenuPosition();
    this.dispatchEvent('open');
  }

  protected close(): void {
    if (!this.isOpen) return;
    console.log('CLOSE');

    console.log('CLOSE, isOpen before:', this.isOpen);
    this.isOpen = false;
    console.log('CLOSE, isOpen after:', this.isOpen);
    this.elements.input.setAttribute('aria-expanded', 'false');
    this.elements.menu.classList.remove('show');
    this.elements.menu.style.display = 'none';
    this.removeFromPortal();
    this.activeIndex = -1;
    this.dispatchEvent('close');
  }

  protected toggle(): void {
    console.log('Toggle called, current isOpen state:', this.isOpen);
    this.isOpen ? this.close() : this.open();
    console.log('After toggle, isOpen is now:', this.isOpen);
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

    // Dispatch events to update validation state
    const inputEvent = new Event('input', { bubbles: true });
    this.hiddenInput.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    this.hiddenInput.dispatchEvent(changeEvent);

    // Trigger blur to update validation state
    const focusEvent = new Event('focus', { bubbles: true });
    this.hiddenInput.dispatchEvent(focusEvent);

    const blurEvent = new Event('blur', { bubbles: true });
    this.hiddenInput.dispatchEvent(blurEvent);

    this.close();

    this.dispatchEvent('change', {
      value: option.value,
      previousValue,
      source: 'select',
    });
  }

  protected updateInputValue(value: string): void {
    if (this.elements.input) {
      const displayText = value || this.config.placeholder || 'Select...';
      const isPlaceholder =
        displayText === (this.config.placeholder || 'Select...');

      this.elements.input.textContent = displayText;

      // Toggle placeholder class based on whether we're showing a placeholder
      if (isPlaceholder) {
        this.elements.input.classList.add('is-placeholder');
      } else {
        this.elements.input.classList.remove('is-placeholder');
      }
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
    if (!this.elements.optionsContainer) return;

    // Clear existing options
    this.elements.optionsContainer.innerHTML = '';

    // Render each option
    this.options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.setAttribute('role', 'option');
      optionElement.setAttribute('aria-selected', 'false');
      optionElement.setAttribute('fl-part', 'dropdown-option');
      optionElement.classList.add('dropdown-option');
      optionElement.dataset.value = option.value;

      // Add data attributes if they exist
      if (option.data) {
        Object.entries(option.data).forEach(([key, value]) => {
          optionElement.dataset[key] = value;
        });
      }

      // Create and append the label
      const labelElement = document.createElement('span');
      labelElement.textContent = option.label;
      optionElement.appendChild(labelElement);

      // Add click handler
      optionElement.addEventListener('click', () => {
        this.selectOption(option);
      });

      // Add to container
      this.elements.optionsContainer.appendChild(optionElement);
    });
  }

  // Methods to dynamically add/remove options
  public addOption(option: DropdownOption): void {
    this.options.push(option);
    this.renderOptions();
  }

  public removeOption(value: string): void {
    this.options = this.options.filter(opt => opt.value !== value);
    this.renderOptions();
  }

  public destroy(): void {
    window.removeEventListener('resize', this.updateMenuPosition);
    window.removeEventListener('scroll', this.updateMenuPosition, true);
    this.portal?.destroy();
    // ... any other cleanup
  }

  public show(): void {
    return;
  }
  public hide(): void {
    return;
  }
  public getErrors(): string[] {
    return [];
  }
}
