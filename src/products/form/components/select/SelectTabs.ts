export class SelectTabs {
  private container: HTMLElement;
  private hiddenInput: HTMLInputElement;
  private isMultiple: boolean;
  private tabs: NodeListOf<HTMLElement>;
  private selectedValues: Set<string>;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isMultiple = container.dataset.selectType === 'checkbox';

    console.log('SELECT', container.dataset.selectType);

    // Find hidden input
    this.hiddenInput = container.querySelector(
      'input[type="hidden"]',
    ) as HTMLInputElement;
    if (!this.hiddenInput) {
      throw new Error('Hidden input not found in select tabs container');
    }

    // Find all tabs
    this.tabs = container.querySelectorAll(
      '[fl-part="select-tab"]',
    ) as NodeListOf<HTMLElement>;
    this.selectedValues = new Set<string>();

    // Initialize from any pre-selected values
    const initialValue = this.hiddenInput.value;
    if (initialValue) {
      initialValue
        .split(',')
        .forEach(value => this.selectedValues.add(value.trim()));
    }

    this.init();
  }

  private init(): void {
    // Add click handlers
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.handleTabClick(tab));
    });

    // Add keyboard navigation
    this.container.addEventListener('keydown', e => this.handleKeyDown(e));

    // Make tabs focusable
    this.tabs.forEach(tab => {
      tab.setAttribute('tabindex', '0');
      tab.setAttribute('role', this.isMultiple ? 'checkbox' : 'radio');
    });

    // Initial UI update
    this.updateUI();
  }

  private handleTabClick(tab: HTMLElement): void {
    console.log('handle tab click');
    const value = tab.dataset.value;
    if (!value) return;

    if (this.isMultiple) {
      // Toggle selection for checkboxes
      if (this.selectedValues.has(value)) {
        this.selectedValues.delete(value);
      } else {
        this.selectedValues.add(value);
      }
    } else {
      // Single selection for radio
      this.selectedValues.clear();
      this.selectedValues.add(value);
    }

    this.updateUI();
    this.updateHiddenInput();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.getAttribute('fl-part') !== 'select-tab') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.handleTabClick(target);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        this.focusNextTab(target);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        this.focusPreviousTab(target);
        break;
    }
  }

  private focusNextTab(currentTab: HTMLElement): void {
    const currentIndex = Array.from(this.tabs).indexOf(currentTab);
    const nextTab = this.tabs[currentIndex + 1] || this.tabs[0];
    nextTab.focus();
  }

  private focusPreviousTab(currentTab: HTMLElement): void {
    const currentIndex = Array.from(this.tabs).indexOf(currentTab);
    const previousTab =
      this.tabs[currentIndex - 1] || this.tabs[this.tabs.length - 1];
    previousTab.focus();
  }

  private updateUI(): void {
    this.tabs.forEach(tab => {
      const value = tab.dataset.value;
      if (value && this.selectedValues.has(value)) {
        tab.classList.add('is-selected');
        tab.setAttribute('aria-checked', 'true');
      } else {
        tab.classList.remove('is-selected');
        tab.setAttribute('aria-checked', 'false');
      }
    });
  }

  private updateHiddenInput(): void {
    const values = Array.from(this.selectedValues);
    this.hiddenInput.value = values.join(',');

    // Dispatch change event
    const event = new Event('change', { bubbles: true });
    this.hiddenInput.dispatchEvent(event);

    // Also dispatch an input event to trigger immediate validation
    const inputEvent = new Event('input', { bubbles: true });
    this.hiddenInput.dispatchEvent(inputEvent);

    // Dispatch a blur event to mark the field as touched
    const blurEvent = new Event('blur', { bubbles: true });
    this.hiddenInput.dispatchEvent(blurEvent);
  }

  // Public methods
  public getValue(): string[] {
    return Array.from(this.selectedValues);
  }

  public setValue(values: string[]): void {
    this.selectedValues.clear();
    values.forEach(value => {
      if (Array.from(this.tabs).some(tab => tab.dataset.value === value)) {
        this.selectedValues.add(value);
      }
    });
    this.updateUI();
    this.updateHiddenInput();
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

  public destroy(): void {
    return;
  }
}
