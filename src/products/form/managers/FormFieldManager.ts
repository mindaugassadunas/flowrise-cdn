import { FormFieldFactory } from '../handlers/FormFieldFactory';
import { FormConfig } from '../models/formTypes';
import { BaseField } from '../models/formTypes';

export class FormFieldManager {
  private fields: Map<string, BaseField> = new Map();

  constructor(
    private form: HTMLFormElement,
    private config: FormConfig,
  ) {
    this.init();
  }

  private init(): void {
    console.log('formfieldmanager', this.config.fields);
    if (!this.config.fields) return;
    // Initialize all configured fields
    Object.entries(this.config.fields).forEach(([fieldId, fieldConfig]) => {
      const element = this.form.querySelector(`#${fieldId}`);
      if (!element) {
        console.warn(`Element not found for field ${fieldId}`);
        return;
      }

      const field = FormFieldFactory.createField(
        element as HTMLElement,
        fieldConfig,
      );

      if (field) {
        this.fields.set(fieldId, field);
      }
    });
  }

  getField<T extends BaseField>(fieldId: string): T | undefined {
    return this.fields.get(fieldId) as T | undefined;
  }

  getAllFields(): Map<string, BaseField> {
    return this.fields;
  }

  //   async validateAll(): Promise<boolean> {
  //     const validationResults = await Promise.all(
  //       Array.from(this.fields.values()).map(field => field.validate()),
  //     );
  //     return validationResults.every(result => result);
  //   }

  //   reset(): void {
  //     this.fields.forEach(field => field.reset());
  //   }

  //   destroy(): void {
  //     this.fields.forEach((_, fieldId) => {
  //       FormFieldFactory.destroyField(fieldId);
  //     });
  //     this.fields.clear();
  //   }
}
