import Swiper from 'swiper';
import JustValidate, { Rules, FieldRuleInterface } from 'just-validate';

interface FormData {
  [key: string]: string;
}

// FormValidator class handling all validation logic
class FormValidator {
  private validator: JustValidate;
  private customValidations: Map<string, Rules[]>;

  constructor(formSelector: string, options: object = {}) {
    this.validator = new JustValidate(formSelector, {
      validateBeforeSubmitting: true,
      focusInvalidField: true,
      errorFieldCssClass: ['error'],
      errorLabelStyle: {
        display: 'block',
      },
      errorLabelCssClass: ['error-message'],
      successLabelCssClass: ['success'],
      ...options,
    });
    this.customValidations = new Map();
  }

  public initialize(form: HTMLFormElement): void {
    // Find all fields with data-validate attribute and add validation
    const fields = form.querySelectorAll('[data-validate]');
    fields.forEach(field => {
      const rules = this.parseValidationRules(field);
      this.validator.addField(`#${field.id}`, rules);
    });

    // Add any predefined custom validations
    this.addCustomValidations();
  }

  public async validateFields(fields: Element[]): Promise<boolean> {
    const validationPromises = fields.map(field =>
      this.validator.revalidateField(`#${field.id}`),
    );

    const results = await Promise.all(validationPromises);
    return results.every(result => result);
  }

  public async validateAll(): Promise<boolean> {
    return await this.validator.validate();
  }

  public addCustomValidation(fieldId: string, rules: Rules[]): void {
    this.customValidations.set(fieldId, rules);
  }

  private parseValidationRules(field: Element): FieldRuleInterface[] {
    const rules = field.getAttribute('data-validate-rules')?.split(',') || [];

    return rules.map(rule => ({
      rule: rule as Rules,
      errorMessage:
        field.getAttribute(`data-validate-message-${rule}`) ||
        this.getDefaultMessage(rule),
      ...this.getRuleParams(field, rule),
    }));
  }

  private getRuleParams(field: Element, rule: string): Record<string, any> {
    switch (rule) {
      case 'minLength':
        return {
          value: parseInt(field.getAttribute('data-validate-minlength') || '0'),
        };
      case 'maxLength':
        return {
          value: parseInt(field.getAttribute('data-validate-maxlength') || '0'),
        };
      case 'customRegexp':
        return {
          pattern: new RegExp(
            field.getAttribute('data-validate-pattern') || '',
          ),
        };
      default:
        return {};
    }
  }

  private getDefaultMessage(rule: string): string {
    const messages: Record<string, string> = {
      required: 'This field is required',
      email: 'Please enter a valid email',
      minLength: 'Field is too short',
      maxLength: 'Field is too long',
      customRegexp: 'Invalid format',
    };
    return messages[rule] || 'Invalid value';
  }

  private addCustomValidations(): void {
    this.customValidations.forEach((rules, fieldId) => {
      this.validator.addField(
        fieldId,
        rules.map(rule => ({
          rule,
          errorMessage: this.getDefaultMessage(rule),
        })),
      );
    });
  }
}

// Base Form class that handles common functionality
abstract class BaseForm {
  protected form: HTMLFormElement | null;
  protected validator: FormValidator;
  protected formData: FormData = {};

  constructor(formElement: HTMLFormElement) {
    this.form = formElement;
    this.validator = new FormValidator(`#${formElement.id}`);
    this.init();
  }

  protected init(): void {
    if (this.form) {
      this.initializeValidator();
      this.attachEventListeners();
    } else {
      console.error('Form element not found');
    }
  }

  protected initializeValidator(): void {
    this.validator.initialize(this.form!);
  }

  protected abstract attachEventListeners(): void;

  protected async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const isValid = await this.validator.validateAll();
    if (!isValid) return;

    this.collectFormData();

    try {
      const response = await fetch('your-api-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.formData),
      });

      if (response.ok) {
        alert('Form submitted successfully!');
        this.form?.reset();
        this.onSuccessfulSubmit();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting the form. Please try again.');
    }
  }

  protected collectFormData(): void {
    if (!this.form) return;

    const formElements = this.form.elements;
    for (const element of Array.from(formElements)) {
      const input = element as HTMLInputElement | HTMLSelectElement;
      if (input.id && input.value) {
        this.formData[input.id] = input.value;
      }
    }
  }

  protected abstract onSuccessfulSubmit(): void;
}

// Single step form implementation
class SingleStepForm extends BaseForm {
  constructor(formElement: HTMLFormElement) {
    super(formElement);
  }

  protected attachEventListeners(): void {
    this.form?.addEventListener('submit', e => this.handleSubmit(e));
  }

  protected onSuccessfulSubmit(): void {
    // Add any single-step specific success handling
  }
}

// Multi step form implementation
class MultiStepForm extends BaseForm {
  private swiper: Swiper;
  private currentStepElement: HTMLElement | null;
  private progressBar: HTMLElement | null;

  constructor(formElement: HTMLFormElement) {
    super(formElement);
    this.currentStepElement = document.getElementById('currentStep');
    this.progressBar = document.getElementById('progressBar');
    this.initializeSwiper();
  }

  private initializeSwiper(): void {
    this.swiper = new Swiper('.swiper', {
      allowTouchMove: false,
      effect: 'fade',
      fadeEffect: {
        crossFade: true,
      },
      on: {
        slideChange: () => {
          this.updateUI();
        },
      },
    });
  }

  protected attachEventListeners(): void {
    // Global navigation
    document.querySelectorAll('#globalNavigation button').forEach(button => {
      button.addEventListener('click', async e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (btn.id === 'prevBtn') this.previousStep();
        if (btn.id === 'nextBtn') await this.nextStep();
        if (btn.id === 'submitBtn') this.handleSubmit(e);
      });
    });

    // Step-specific navigation
    document
      .querySelectorAll('.step-specific-actions button')
      .forEach(button => {
        button.addEventListener('click', async e => {
          const btn = e.currentTarget as HTMLButtonElement;
          if (btn.classList.contains('prev-step')) this.previousStep();
          if (btn.classList.contains('next-step')) await this.nextStep();
          if (btn.classList.contains('submit-form')) this.handleSubmit(e);
        });
      });
  }

  private async validateCurrentStep(): Promise<boolean> {
    if (!this.swiper?.slides) return false;

    const currentSlide = this.swiper.slides[this.swiper.activeIndex];
    const fields = Array.from(currentSlide.querySelectorAll('[data-validate]'));

    return await this.validator.validateFields(fields);
  }

  private updateUI(): void {
    const currentIndex = this.swiper.activeIndex;
    const totalSlides = this.swiper.slides.length;

    if (this.currentStepElement) {
      this.currentStepElement.textContent = (currentIndex + 1).toString();
    }

    this.updateNavigationButtons(currentIndex, totalSlides);
    this.updateProgressBar();

    if (currentIndex === totalSlides - 1) {
      this.updateSummary();
    }
  }

  private updateNavigationButtons(
    currentIndex: number,
    totalSlides: number,
  ): void {
    const globalNav = document.getElementById('globalNavigation');
    if (globalNav) {
      const prevBtn = globalNav.querySelector('#prevBtn') as HTMLButtonElement;
      const nextBtn = globalNav.querySelector('#nextBtn') as HTMLButtonElement;
      const submitBtn = globalNav.querySelector(
        '#submitBtn',
      ) as HTMLButtonElement;

      prevBtn.style.display = currentIndex === 0 ? 'none' : 'block';
      nextBtn.style.display =
        currentIndex === totalSlides - 1 ? 'none' : 'block';
      submitBtn.style.display =
        currentIndex === totalSlides - 1 ? 'block' : 'none';
    }
  }

  private updateProgressBar(): void {
    if (this.progressBar) {
      const progress =
        ((this.swiper.activeIndex + 1) / this.swiper.slides.length) * 100;
      this.progressBar.style.width = `${progress}%`;
    }
  }

  private previousStep(): void {
    this.swiper.slidePrev();
  }

  private async nextStep(): Promise<void> {
    const isValid = await this.validateCurrentStep();
    if (isValid) {
      this.swiper.slideNext();
    }
  }

  private updateSummary(): void {
    this.collectFormData();
    const summaryContent = document.getElementById('summaryContent');
    if (summaryContent) {
      let summaryHTML = '';
      for (const [key, value] of Object.entries(this.formData)) {
        summaryHTML += `
            <div class="summary-item">
              <strong>${key}:</strong> ${value}
            </div>
          `;
      }
      summaryContent.innerHTML = summaryHTML;
    }
  }

  protected onSuccessfulSubmit(): void {
    this.swiper.slideTo(0);
  }
}

// Factory function to create the appropriate form type
function createForm(formElement: HTMLFormElement): BaseForm {
  const formType = formElement.getAttribute('fl-type');
  return formType === 'multi-step'
    ? new MultiStepForm(formElement)
    : new SingleStepForm(formElement);
}

// Initialize forms
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => createForm(form as HTMLFormElement));
});
