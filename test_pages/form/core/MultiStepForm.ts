import { FormConfig } from '../models/formTypes';
import { BaseForm } from './BaseForm';
import Swiper from 'swiper';

export class MultiStepForm extends BaseForm {
  private swiper!: Swiper;
  private currentStepElement: HTMLElement | null;
  private progressBar: HTMLElement | null;
  private formData: Record<string, any> = {};

  constructor(wrapper: HTMLElement, form: HTMLFormElement, config: FormConfig) {
    super(wrapper, form, config);
    this.initializeSwiper();
    this.currentStepElement = document.getElementById('currentStep');
    this.progressBar = document.getElementById('progressBar');
  }

  private initializeSwiper(): void {
    this.swiper = new Swiper('.swiper', {
      allowTouchMove: false,
      effect: 'fade',
      direction: 'horizontal',
      slidesPerView: 1,
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

  protected setupEventListeners(): void {
    super.setupEventListeners();
    this.attachEventListeners();
    this.addGlobalTabNavigation();
  }

  protected attachEventListeners(): void {
    // Global navigation buttons
    document.querySelectorAll('#globalNavigation button').forEach(button => {
      button.addEventListener('click', async e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (btn.id === 'prevBtn') this.previousStep();
        if (btn.id === 'nextBtn') await this.nextStep();
        if (btn.id === 'submitBtn') this.handleSubmit(e);
      });
    });

    // Step-specific navigation buttons
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

  /**
   * Attach a keydown listener on the form wrapper so that when the user presses Tab
   * and the focus is on the last focusable element of the current step,
   * it attempts to navigate to the next slide only if the step passes validation.
   */
  private addGlobalTabNavigation(): void {
    this.wrapper.addEventListener('keydown', async (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const currentSlide = this.swiper.slides[this.swiper.activeIndex];
        // Select all focusable elements within the current slide
        const focusableElements = Array.from(
          currentSlide.querySelectorAll<HTMLElement>(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(el => !el.hasAttribute('disabled'));

        if (focusableElements.length) {
          const lastElement = focusableElements[focusableElements.length - 1];
          if (document.activeElement === lastElement) {
            e.preventDefault();
            // Use the same method as clicking "Next" to ensure validation is performed.
            await this.nextStep();
          }
        }
      }
    });
  }

  private async validateCurrentStep(): Promise<boolean> {
    if (!this.swiper?.slides) return false;

    const currentSlide = this.swiper.slides[this.swiper.activeIndex];
    const fields = Array.from(currentSlide.querySelectorAll('input'));

    // Log current state
    console.log(
      'Validating fields:',
      fields.map(f => f.id),
    );

    // Validate each field individually
    const validationResults = await Promise.all(
      fields.map(async field => {
        const isValid = await this.validator.executeFieldValidation(field);
        console.log(`Field ${field.id} validation result:`, isValid);
        return isValid;
      }),
    );

    const isStepValid = validationResults.every(isValid => isValid);
    console.log('Step validation result:', isStepValid);

    return isStepValid;
  }

  protected updateUI(): void {
    // Skip Swiper-specific updates if Swiper isn't properly initialized
    if (this.swiper?.slides) {
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

    // Call parent's updateUI for general form updates
    super.updateUI(this.stateManager.getState());
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
