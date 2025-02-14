import { BaseFieldConfig } from '../../../models/formTypes';

export interface DropdownConfig extends BaseFieldConfig {
  type: 'dropdown';
  //   options: DropdownOption;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  removable?: boolean;
  usePortal?: boolean;
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
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownElements {
  input: HTMLElement;
  menu: HTMLElement;
  toggle: HTMLElement;
  optionsContainer: HTMLElement;
  searchInput?: HTMLInputElement;
}
