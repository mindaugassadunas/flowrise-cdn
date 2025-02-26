// components/fileupload/FileUpload.ts
import { BaseField } from '../../models/formTypes';
import { FileUploadConfig, UploadProgress } from './types/fileTypes';

export class FileUpload implements BaseField {
  private element: HTMLElement;
  private config: FileUploadConfig;
  private fileInput!: HTMLInputElement;
  private fileList!: HTMLElement;
  private activeUploads: Map<string, UploadProgress> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private template!: HTMLTemplateElement;
  private isVisible: boolean = true;
  private errors: string[] = [];
  private uploadQueue: File[] = [];

  constructor(element: HTMLElement, config: FileUploadConfig) {
    this.element = element;
    this.config = {
      ...config,
      maxFileSize: config.maxFileSize || 5 * 1024 * 1024, // 5MB default
      allowedTypes: config.allowedTypes || ['image/*', 'application/pdf'],
      maxFiles: config.maxFiles || 10,
      multiple: config.multiple !== false, // Default to true
    };

    this.init();
  }

  private init(): void {
    console.log('INIT FILE UPLOAD');
    // Create the necessary DOM structure
    this.element.classList.add('upload-container');
    this.element.setAttribute('data-fl-element', 'fileupload');

    // Create file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.className = 'file-input';
    this.fileInput.id = `${this.element.id}-input`;
    this.fileInput.name = this.element.id;
    if (this.config.multiple) {
      this.fileInput.multiple = true;
    }
    if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
      this.fileInput.accept = this.config.allowedTypes.join(',');
    }
    if (this.config.required) {
      this.fileInput.required = true;
    }

    // Create upload button wrapper
    const fileInputWrapper = document.createElement('div');
    fileInputWrapper.className = 'file-input-wrapper';

    const uploadButton = document.createElement('div');
    uploadButton.className = 'upload-button';
    uploadButton.textContent = 'Choose Files';
    uploadButton.appendChild(this.fileInput);

    fileInputWrapper.appendChild(uploadButton);
    this.element.appendChild(fileInputWrapper);

    // Create file list
    this.fileList = document.createElement('div');
    this.fileList.className = 'file-list';
    this.fileList.id = `${this.element.id}-list`;
    this.element.appendChild(this.fileList);

    // Create template for file items
    this.template = document.createElement('template');
    this.template.innerHTML = `
      <div class="file-item">
        <img class="file-preview" src="" alt="File preview" />
        <div class="file-info">
          <div class="file-name"></div>
          <div class="file-size"></div>
          <div class="error-message"></div>
        </div>
        <div class="progress-wrapper">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
        <div class="file-actions">
          <button type="button" class="action-button cancel-button">Cancel</button>
          <button type="button" class="action-button retry-button" style="display: none">Retry</button>
        </div>
      </div>
    `;

    // Add error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.setAttribute('data-error', this.element.id);
    errorContainer.style.display = 'none';
    this.element.appendChild(errorContainer);

    // Initialize event listeners
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.element.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Handle drag and drop highlighting
    ['dragenter', 'dragover'].forEach(eventName => {
      this.element.addEventListener(
        eventName,
        this.highlight.bind(this),
        false,
      );
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.element.addEventListener(
        eventName,
        this.unhighlight.bind(this),
        false,
      );
    });

    // Handle file selection
    this.element.addEventListener('drop', this.handleDrop.bind(this), false);
    this.fileInput.addEventListener(
      'change',
      this.handleFileInputChange.bind(this),
    );
  }

  private preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  private highlight(): void {
    this.element.classList.add('drag-over');
  }

  private unhighlight(): void {
    this.element.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent): void {
    const dt = e.dataTransfer;
    if (dt?.files) {
      this.handleFiles(Array.from(dt.files));
    }
  }

  private handleFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private async handleFiles(files: File[]): Promise<void> {
    // Clear existing errors
    this.errors = [];

    // Check if adding these files exceeds the max allowed
    const currentFileCount = this.activeUploads.size;
    if (currentFileCount + files.length > this.config.maxFiles!) {
      this.errors.push(
        `You can only upload a maximum of ${this.config.maxFiles} files`,
      );
      this.updateErrorDisplay();
      return;
    }

    // Filter out invalid files
    const validFiles: File[] = [];
    for (const file of files) {
      const validationError = this.validateFile(file);
      if (validationError) {
        this.errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    }

    // Display any errors
    this.updateErrorDisplay();

    // If no valid files after validation, return
    if (validFiles.length === 0) return;

    // Start uploading valid files
    for (const file of validFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      this.createFileElement(file, fileId);

      // If endpoint is provided, upload the file
      if (this.config.endpoint) {
        this.uploadFile(file, fileId);
      } else {
        // Otherwise just show it as completed (will be handled by form submission)
        this.updateProgress(fileId, {
          fileName: file.name,
          status: 'completed',
          progress: 100,
        });
      }
    }
  }

  private updateErrorDisplay(): void {
    const errorContainer = this.element.querySelector(
      `[data-error="${this.element.id}"]`,
    ) as HTMLElement;
    if (errorContainer) {
      if (this.errors.length > 0) {
        errorContainer.textContent = this.errors.join('. ');
        errorContainer.style.display = 'block';
      } else {
        errorContainer.style.display = 'none';
      }
    }
  }

  private validateFile(file: File): string | null {
    if (file.size > this.config.maxFileSize!) {
      return `File "${file.name}" exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize!)}`;
    }

    if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
      const isValidType = this.config.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type;
      });

      if (!isValidType) {
        return `File type "${file.type}" is not allowed for "${file.name}"`;
      }
    }

    return null;
  }

  private createFileElement(file: File, fileId: string): HTMLElement {
    const clone = this.template.content.cloneNode(true) as DocumentFragment;
    const fileItem = clone.querySelector('.file-item') as HTMLElement;
    const fileName = fileItem.querySelector('.file-name') as HTMLElement;
    const fileSize = fileItem.querySelector('.file-size') as HTMLElement;
    const preview = fileItem.querySelector('.file-preview') as HTMLImageElement;
    const cancelButton = fileItem.querySelector(
      '.cancel-button',
    ) as HTMLButtonElement;
    const retryButton = fileItem.querySelector(
      '.retry-button',
    ) as HTMLButtonElement;

    fileItem.dataset.fileId = fileId;
    fileName.textContent = file.name;
    fileSize.textContent = this.formatFileSize(file.size);

    // Set up preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          preview.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    } else {
      preview.src = this.getFileIcon(file.type);
    }

    // Set up buttons
    cancelButton.addEventListener('click', () => this.cancelUpload(fileId));
    retryButton.addEventListener('click', () => {
      retryButton.style.display = 'none';
      this.uploadFile(file, fileId);
    });

    this.fileList.appendChild(fileItem);
    return fileItem;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return '/assets/icons/image-icon.svg';
    } else if (mimeType === 'application/pdf') {
      return '/assets/icons/pdf-icon.svg';
    } else if (mimeType === 'application/zip') {
      return '/assets/icons/zip-icon.svg';
    }
    return '/assets/icons/file-icon.svg';
  }

  private updateProgress(
    fileId: string,
    progress: Partial<UploadProgress>,
  ): void {
    const current = this.activeUploads.get(fileId) || {
      fileName: '',
      progress: 0,
      status: 'pending' as const,
    };

    const updatedProgress = { ...current, ...progress };
    this.activeUploads.set(fileId, updatedProgress);

    // Update UI
    this.updateFileElement(fileId, updatedProgress);
  }

  private updateFileElement(fileId: string, progress: UploadProgress): void {
    const fileElement = this.fileList.querySelector(
      `[data-file-id="${fileId}"]`,
    );
    if (!fileElement) return;

    const progressFill = fileElement.querySelector(
      '.progress-fill',
    ) as HTMLElement;
    const errorMessage = fileElement.querySelector(
      '.error-message',
    ) as HTMLElement;
    const retryButton = fileElement.querySelector(
      '.retry-button',
    ) as HTMLElement;
    const cancelButton = fileElement.querySelector(
      '.cancel-button',
    ) as HTMLElement;

    if (progressFill) {
      progressFill.style.width = `${progress.progress}%`;
    }

    if (progress.error && errorMessage) {
      errorMessage.textContent = progress.error;
      errorMessage.style.display = 'block';
      if (retryButton) retryButton.style.display = 'block';
      if (cancelButton) cancelButton.style.display = 'none';
    }

    if (progress.status === 'completed' && cancelButton) {
      cancelButton.style.display = 'none';
    }
  }

  public async uploadFile(file: File, fileId: string): Promise<void> {
    if (!this.config.endpoint) {
      // If no endpoint, just mark as completed
      this.updateProgress(fileId, {
        fileName: file.name,
        status: 'completed',
        progress: 100,
      });
      return;
    }

    const controller = new AbortController();
    this.abortControllers.set(fileId, controller);

    try {
      const formData = new FormData();
      formData.append('file', file);

      this.updateProgress(fileId, {
        fileName: file.name,
        status: 'uploading',
        progress: 0,
      });

      // Simulate progress updates if no actual upload is happening
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 90) {
          clearInterval(progressInterval);
        }
        this.updateProgress(fileId, {
          progress,
        });
      }, 200);

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Assume successful response
      this.updateProgress(fileId, {
        status: 'completed',
        progress: 100,
      });

      this.abortControllers.delete(fileId);
    } catch (error) {
      this.updateProgress(fileId, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  public cancelUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
      this.updateProgress(fileId, {
        status: 'error',
        error: 'Upload cancelled',
      });
    }
  }

  // Implement BaseField interface
  public getValue(): File[] {
    // Return all files that have been successfully uploaded or are pending
    const files: File[] = [];
    if (this.fileInput.files) {
      for (let i = 0; i < this.fileInput.files.length; i++) {
        files.push(this.fileInput.files[i]);
      }
    }
    return files;
  }

  public setValue(value: any): void {
    // Not applicable for file inputs
    console.warn('setValue is not supported for file uploads');
  }

  public show(): void {
    if (!this.isVisible) {
      this.element.style.display = '';
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.isVisible) {
      this.element.style.display = 'none';
      this.isVisible = false;
    }
  }

  public getErrors(): string[] {
    return this.errors;
  }

  public destroy(): void {
    // Cancel all active uploads
    this.abortControllers.forEach(controller => {
      controller.abort();
    });

    // Remove event listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.element.removeEventListener(eventName, this.preventDefaults);
      document.body.removeEventListener(eventName, this.preventDefaults);
    });

    // Clean up DOM
    this.element.innerHTML = '';
    this.element.removeAttribute('data-fl-element');
    this.element.classList.remove('upload-container');
  }
}
