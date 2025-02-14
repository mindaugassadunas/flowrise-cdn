import { BaseFieldConfig } from '../../models/formTypes';
import { BaseDropdown } from './BaseDropdown';
import { CustomDropdown } from './CustomDropdown';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { SearchableDropdown } from './SearchableDropdown';
import { DropdownConfig } from './types/dropdownTypes';

export function createDropdown(
  element: HTMLElement,
  config: BaseFieldConfig,
): BaseDropdown {
  const dropdownConfig = config as DropdownConfig;

  const type = element.getAttribute('fl-type');

  switch (type) {
    case 'custom':
      return new CustomDropdown(element, dropdownConfig);
    case 'searchable':
      return new SearchableDropdown(element, dropdownConfig);
    case 'multi':
      return new MultiSelectDropdown(element, dropdownConfig);
    default:
      return new CustomDropdown(element, dropdownConfig);
  }
}
