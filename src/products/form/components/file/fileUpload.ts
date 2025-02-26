// components/fileupload/fileUpload.ts
import { FileUpload } from './FileUploadField';
import { FileUploadConfig } from './types/fileTypes';

export function createFileUpload(
  element: HTMLElement,
  config: FileUploadConfig,
): FileUpload {
  return new FileUpload(element, config);
}
