// components/url/url.ts
import { URLField } from './URLField';
import { URLFieldConfig } from './types/urlTypes';

export function createURLField(
  element: HTMLElement,
  config: URLFieldConfig,
): URLField {
  return new URLField(element, config);
}
