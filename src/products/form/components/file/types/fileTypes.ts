// components/fileupload/types/fileUploadTypes.ts
import { BaseFieldConfig } from '../../../models/formTypes';

export interface FileUploadConfig extends BaseFieldConfig {
  type: 'fileupload';
  maxFileSize?: number; // in bytes, default: 5MB
  allowedTypes?: string[]; // e.g. ['image/*', 'application/pdf']
  maxFiles?: number; // maximum number of files allowed
  multiple?: boolean; // allow multiple file selection
  endpoint?: string; // upload endpoint (optional, can be handled by form submission)
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}
