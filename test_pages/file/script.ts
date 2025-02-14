interface FileUploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  maxConcurrentUploads: number;
  endpoint?: string;
  formId?: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

class FileUploadHandler {
  private config: FileUploadConfig;
  private activeUploads: Map<string, UploadProgress>;
  private abortControllers: Map<string, AbortController>;
  private uploadContainer: HTMLElement;
  private fileInput: HTMLInputElement;
  private fileList: HTMLElement;
  private template: HTMLTemplateElement;
  private form: HTMLFormElement | null = null;

  constructor(config: FileUploadConfig) {
    this.config = {
      maxFileSize: config.maxFileSize || 5 * 1024 * 1024, // 5MB default
      allowedTypes: config.allowedTypes || ['image/*', 'application/pdf'],
      maxConcurrentUploads: config.maxConcurrentUploads || 3,
      endpoint: config.endpoint,
      formId: config.formId
    };
    this.activeUploads = new Map();
    this.abortControllers = new Map();

    // Initialize DOM elements
    const uploadContainer = document.getElementById('uploadContainer');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const template = document.getElementById('fileItemTemplate');

    // Check if all required elements exist
    if (!uploadContainer || !fileInput || !fileList || !template) {
      throw new Error(
        'Required DOM elements are missing. Make sure all elements with IDs uploadContainer, fileInput, fileList, and fileItemTemplate exist in the document.',
      );
    }

    this.uploadContainer = uploadContainer;
    this.fileInput = fileInput as HTMLInputElement;
    this.fileList = fileList;
    this.template = template as HTMLTemplateElement;

    // Find the form if formId is provided or try to find the closest form
    if (this.config.formId) {
      this.form = document.getElementById(this.config.formId) as HTMLFormElement;
    } else {
      this.form = this.uploadContainer.closest('form');
    }

    // If we're in a form context but no endpoint provided, modify the file input
    if (this.form && !this.config.endpoint) {
      this.fileInput.setAttribute('form', this.form.id);
      // Prevent the handler from processing files when form handles submission
      this.form.addEventListener('submit', (e) => {
        // Don't prevent default - let the form handle submission
        this.handleFormSubmission(e);
      });
    }

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.uploadContainer.addEventListener(
        eventName,
        this.preventDefaults,
        false,
      );
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Handle drag and drop highlighting
    ['dragenter', 'dragover'].forEach(eventName => {
      this.uploadContainer.addEventListener(
        eventName,
        this.highlight.bind(this),
        false,
      );
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.uploadContainer.addEventListener(
        eventName,
        this.unhighlight.bind(this),
        false,
      );
    });

    // Handle file selection
    this.uploadContainer.addEventListener(
      'drop',
      this.handleDrop.bind(this),
      false,
    );
    this.fileInput.addEventListener(
      'change',
      this.handleFileInputChange.bind(this),
    );

    // Handle upload progress updates
    window.addEventListener('uploadProgress', ((event: CustomEvent) => {
      const { fileId, progress } = event.detail;
      this.updateProgressUI(fileId, progress);
    }) as EventListener);
  }

  private preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  private highlight(): void {
    this.uploadContainer.classList.add('drag-over');
  }

  private unhighlight(): void {
    this.uploadContainer.classList.remove('drag-over');
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
    // Filter out invalid files first
    const validFiles = files.filter(file => !this.validateFile(file));

    // Calculate how many uploads we can start based on current uploads
    const currentUploads = Array.from(this.activeUploads.values()).filter(
      upload => upload.status === 'uploading',
    ).length;
    const availableSlots = this.config.maxConcurrentUploads - currentUploads;

    // Take only the number of files we can handle
    const filesToUpload = validFiles.slice(0, availableSlots);

    // Create queue for remaining files
    this.uploadQueue.push(...validFiles.slice(availableSlots));

    // Start uploads in parallel
    await Promise.all(filesToUpload.map(file => this.handleSingleFile(file)));

    // Process queue if there are remaining files
    this.processQueue();
  }

  private uploadQueue: File[] = [];

  private async processQueue(): Promise<void> {
    // Check if we can process more files
    const currentUploads = Array.from(this.activeUploads.values()).filter(
      upload => upload.status === 'uploading',
    ).length;
    const availableSlots = this.config.maxConcurrentUploads - currentUploads;

    if (availableSlots > 0 && this.uploadQueue.length > 0) {
      const filesToUpload = this.uploadQueue.splice(0, availableSlots);
      await Promise.all(filesToUpload.map(file => this.handleSingleFile(file)));

      // Continue processing queue if there are more files
      if (this.uploadQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  private async handleSingleFile(file: File): Promise<void> {
    const fileId = `${file.name}-${Date.now()}`;
    const fileElement = this.createFileElement(file, fileId);

    try {
      const result = await this.uploadFile(file);
      if (result.success) {
        this.updateFileElement(fileElement, {
          status: 'completed',
          progress: 100,
          url: result.url,
        });
      } else {
        this.updateFileElement(fileElement, {
          status: 'error',
          error: result.error,
        });
      }
    } catch (error) {
      this.updateFileElement(fileElement, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
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
    retryButton.addEventListener('click', () => this.handleSingleFile(file));

    this.fileList.appendChild(fileItem);
    return fileItem;
  }

  private updateFileElement(
    element: HTMLElement,
    update: {
      status?: string;
      progress?: number;
      error?: string;
      url?: string;
    },
  ): void {
    const progressFill = element.querySelector('.progress-fill') as HTMLElement;
    const errorMessage = element.querySelector('.error-message') as HTMLElement;
    const retryButton = element.querySelector('.retry-button') as HTMLElement;
    const cancelButton = element.querySelector('.cancel-button') as HTMLElement;

    if (update.progress !== undefined) {
      progressFill.style.width = `${update.progress}%`;
    }

    if (update.error) {
      errorMessage.textContent = update.error;
      errorMessage.style.display = 'block';
      retryButton.style.display = 'block';
      cancelButton.style.display = 'none';
    }

    if (update.status === 'completed') {
      cancelButton.style.display = 'none';
      retryButton.style.display = 'none';
    }
  }

  private updateProgressUI(fileId: string, progress: UploadProgress): void {
    const fileElement = this.fileList.querySelector(
      `[data-file-id="${fileId}"]`,
    );
    if (fileElement) {
      this.updateFileElement(fileElement as HTMLElement, {
        status: progress.status,
        progress: progress.progress,
        error: progress.error,
      });
    }
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

  private validateFile(file: File): string | null {
    if (file.size > this.config.maxFileSize) {
      return `File size exceeds maximum allowed size of ${this.config.maxFileSize / 1024 / 1024}MB`;
    }

    const isValidType = this.config.allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type ${file.type} is not allowed`;
    }

    return null;
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
    this.activeUploads.set(fileId, { ...current, ...progress });
    this.emitProgressUpdate(fileId);
  }

  private emitProgressUpdate(fileId: string): void {
    const progress = this.activeUploads.get(fileId);
    if (progress) {
      const event = new CustomEvent('uploadProgress', {
        detail: { fileId, progress },
      });
      window.dispatchEvent(event);
    }
  }

  public async uploadFile(file: File): Promise<UploadResponse> {
    const fileId = `${file.name}-${Date.now()}`;
    const validationError = this.validateFile(file);

    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    if (
      Array.from(this.activeUploads.values()).filter(
        upload => upload.status === 'uploading',
      ).length >= this.config.maxConcurrentUploads
    ) {
      return {
        success: false,
        error: 'Maximum concurrent uploads reached',
      };
    }

    // If no endpoint is provided and we're in a form, just update UI and store file
    if (!this.config.endpoint && this.form) {
      this.updateProgress(fileId, {
        fileName: file.name,
        status: 'completed',
        progress: 100,
      });

      return {
        success: true,
      };
    }

    // Continue with existing endpoint upload logic
    const controller = new AbortController();
    this.abortControllers.set(fileId, controller);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // If we're in a form, add all other form data
      if (this.form) {
        const formElements = Array.from(this.form.elements) as HTMLFormElement[];
        formElements.forEach(element => {
          if (element.name && element !== this.fileInput as HTMLElement) {
            if (element.type === 'file') {
              const files = element.files;
              if (files) {
                Array.from(files as FileList).forEach((file: File) => {
                  formData.append(element.name, file);
                });
              }
            } else {
              formData.append(element.name, element.value);
            }
          }
        });
      }

      this.updateProgress(fileId, {
        fileName: file.name,
        status: 'uploading',
        progress: 0,
      });

      // Only proceed with fetch if endpoint is provided
      if (this.config.endpoint) {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        this.updateProgress(fileId, {
          status: 'completed',
          progress: 100,
        });

        this.abortControllers.delete(fileId);

        return {
          success: true,
          url: data.url,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';

      this.updateProgress(fileId, {
        status: 'error',
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
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

  public getUploadProgress(fileId: string): UploadProgress | undefined {
    return this.activeUploads.get(fileId);
  }

  public getAllUploads(): Map<string, UploadProgress> {
    return new Map(this.activeUploads);
  }

  public getTotalProgress(): {
    totalFiles: number;
    uploadedFiles: number;
    totalProgress: number;
    remainingFiles: number;
  } {
    const uploads = Array.from(this.activeUploads.values());
    const totalFiles = uploads.length + this.uploadQueue.length;
    const uploadedFiles = uploads.filter(
      upload => upload.status === 'completed',
    ).length;
    const totalProgress =
      uploads.reduce((acc, curr) => acc + curr.progress, 0) / totalFiles;

    return {
      totalFiles,
      uploadedFiles,
      totalProgress,
      remainingFiles: this.uploadQueue.length,
    };
  }

  private handleFormSubmission(e: Event): void {
    const uploads = Array.from(this.activeUploads.values());
    const hasIncompleteUploads = uploads.some(
      upload => upload.status === 'uploading' || upload.status === 'pending'
    );

    if (hasIncompleteUploads) {
      e.preventDefault();
      alert('Please wait for all uploads to complete before submitting the form.');
    }
  }
}

// Initialize the upload handler
function initializeUploader() {
  try {
    // Example with endpoint
    const uploadHandlerWithEndpoint = new FileUploadHandler({
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*', 'application/pdf', 'application/zip'],
      maxConcurrentUploads: 3,
      endpoint: 'https://your-cloudflare-worker.workers.dev/upload',
    });

    // Example without endpoint (form submission)
    const uploadHandlerWithForm = new FileUploadHandler({
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*', 'application/pdf', 'application/zip'],
      maxConcurrentUploads: 3,
      formId: 'uploadForm', // ID of the form element
    });
  } catch (error) {
    console.error('Failed to initialize uploader:', error);
  }
}

// Try to initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUploader);
} else {
  initializeUploader();
}

export default FileUploadHandler;
