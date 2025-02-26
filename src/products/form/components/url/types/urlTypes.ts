import { BaseFieldConfig } from '../../../models/formTypes';

export interface URLFieldConfig extends BaseFieldConfig {
  type: 'url';
  removeParams?: boolean; // Whether to remove URL parameters when validating/storing
  requiredProtocol?: boolean; // Whether protocol (http/https) is required
  allowedProtocols?: string[]; // List of allowed protocols (e.g., ['http', 'https'])
  trimUrl?: boolean; // Whether to trim the URL before validation/storage
}

export interface URLFieldOptions {
  removeParams: boolean;
  requiredProtocol: boolean;
  allowedProtocols: string[];
  trimUrl: boolean;
}

export interface URLValidationResult {
  isValid: boolean;
  errors: string[];
  cleanedUrl?: string;
}
