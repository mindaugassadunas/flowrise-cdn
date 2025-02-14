import { HiddenFieldConfig, StorageConfig } from '../models/formTypes';

export class StorageManager {
  static async waitForCookies(timeout: number = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkCookies = () => {
        // Check if cookies are available (you can add specific cookie checks)
        if (document.cookie) {
          resolve();
          return;
        }

        // Check if timeout exceeded
        if (Date.now() - startTime > timeout) {
          reject(new Error('Cookie timeout exceeded'));
          return;
        }

        // Try again in 100ms
        setTimeout(checkCookies, 100);
      };

      checkCookies();
    });
  }

  static async getValue(
    config: HiddenFieldConfig,
    timeout?: number,
  ): Promise<string | undefined> {
    if (config.cookieKey) {
      try {
        await this.waitForCookies(timeout);
        const cookieValue = this.getCookie(config.cookieKey);
        if (cookieValue) return cookieValue;
      } catch (error) {}
    }

    // Fallback to localStorage
    if (config.storageKey) {
      const storageValue = localStorage.getItem(config.storageKey);
      if (storageValue) return storageValue;
    }

    return config.defaultValue;
  }

  static getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift();
    }
    return undefined;
  }

  static prefillForm(form: HTMLFormElement, config: StorageConfig): void {
    if (!config.prefill) return;

    const storedData = localStorage.getItem(config.key);
    if (!storedData) return;

    try {
      const data = JSON.parse(storedData);
      Object.entries(data).forEach(([fieldId, value]) => {
        if (this.shouldStoreField(fieldId, config)) {
          const field = form.querySelector(`#${fieldId}`) as HTMLInputElement;
          if (field) {
            field.value = value as string;
          }
        }
      });
    } catch {
      // Silent catch for JSON parse errors
    }
  }

  static storeFormData(form: HTMLFormElement, config: StorageConfig): void {
    const data: Record<string, any> = {};
    const formData = new FormData(form);

    formData.forEach((value, key) => {
      if (this.shouldStoreField(key, config)) {
        data[key] = value;
      }
    });

    localStorage.setItem(config.key, JSON.stringify(data));
  }

  static clearStoredFormData(key: string): void {
    localStorage.removeItem(key);
  }

  private static shouldStoreField(
    fieldId: string,
    config: StorageConfig,
  ): boolean {
    if (!config.fields) return true;
    return config.fields.includes(fieldId);
  }
}
