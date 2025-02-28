import { FormConfig } from '../models/formTypes';
import { BaseForm } from './BaseForm';
import Swiper from 'swiper';
import { StepConditionManager } from '../managers/ConditionalSlideManager';

export class MultiStepForm extends BaseForm {
  private swiper!: Swiper;
  private currentStepElement: HTMLElement | null;
  private progressBar: HTMLElement | null;
  private formData: Record<string, any> = {};
  private visibleSteps: number[] = [];
  private stepConditionManager!: StepConditionManager;

  constructor(wrapper: HTMLElement, form: HTMLFormElement, config: FormConfig) {
    super(wrapper, form, config);
    this.initializeSwiper();
    this.stepConditionManager = new StepConditionManager(
      this.swiper,
      this.stateManager,
      config.conditionalSteps || [],
      this.handleStepVisibilityChange.bind(this),
    );
    this.initializeVisibleSteps();
    this.currentStepElement = document.getElementById('currentStep');
    this.progressBar = document.getElementById('progressBar');
  }

  private initializeSwiper(): void {
    this.swiper = new Swiper('.swiper', {
      allowTouchMove: false,
      effect: 'fade',
      speed: 0,
      direction: 'horizontal',
      slidesPerView: 1,
      fadeEffect: {
        crossFade: true,
      },
      on: {
        slideChange: () => {
          this.updateUI();
          if (this.config.scrollToTop === true) {
            this.scrollToFormTop(this.config.smoothScroll || false);
          }
        },
        init: function () {
          // Reset flex-direction to row for proper horizontal sliding
          const swiperWrappers = document.querySelectorAll('.swiper-wrapper');
          swiperWrappers.forEach(swiperWrapper => {
            if (swiperWrapper instanceof HTMLElement) {
              swiperWrapper.style.flexDirection = 'row';
            }
          });
        },
      },
    });
    console.log('SWIPER INITIALIZED');
    console.log(this.swiper);
  }

  protected setupEventListeners(): void {
    super.setupEventListeners();
    this.attachEventListeners();
    this.addGlobalTabNavigation();
  }

  private initializeVisibleSteps(): void {
    // Initially, all steps are visible
    this.visibleSteps = Array.from(
      { length: this.swiper.slides.length },
      (_, i) => i,
    );

    // Apply initial conditions
    if (this.config.conditionalSteps) {
      this.stepConditionManager.evaluateAllConditions();
    }
  }

  private handleStepVisibilityChange(
    stepIndex: number,
    isVisible: boolean,
  ): void {
    if (isVisible) {
      // Add the step if it’s not already present.
      if (!this.visibleSteps.includes(stepIndex)) {
        this.visibleSteps.push(stepIndex);
        this.visibleSteps.sort((a, b) => a - b);
      }
    } else {
      // Remove the step from the visibleSteps array.
      const index = this.visibleSteps.indexOf(stepIndex);
      if (index !== -1) {
        this.visibleSteps.splice(index, 1);
      }

      // If the current slide was hidden, navigate to the next available visible slide.
      if (stepIndex === this.swiper.activeIndex) {
        let nextVisible = this.visibleSteps.find(index => index > stepIndex);
        if (nextVisible === undefined) {
          nextVisible = this.visibleSteps
            .slice()
            .reverse()
            .find(index => index < stepIndex);
        }
        if (nextVisible !== undefined) {
          this.swiper.slideTo(nextVisible);
        }
      }
    }

    this.updateUI();
  }

  protected attachEventListeners(): void {
    // Global navigation buttons
    document
      .querySelectorAll('[fl-part="global-navigation"] button')
      .forEach(button => {
        button.addEventListener('click', async e => {
          const btn = e.currentTarget as HTMLButtonElement;
          if (btn.getAttribute('fl-part') === 'prev-btn') this.previousStep();
          if (btn.getAttribute('fl-part') === 'next-btn') await this.nextStep();
          if (btn.getAttribute('fl-part') === 'submit-btn')
            this.handleSubmit(e);
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
    // Filter visible fields only
    const fields = Array.from(
      currentSlide.querySelectorAll('input, textarea'),
    ).filter(field => {
      if (!field.id) return false;
      const shouldValidate = this.stateManager.shouldValidateField(field.id);
      console.log('shouldValidate', field.id, shouldValidate);

      return shouldValidate;
    });

    // Log current state
    console.log(
      'Validating visible fields:',
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
      let visibleIndex = this.visibleSteps.indexOf(currentIndex);

      // If the current slide is not visible, adjust to the nearest visible slide.
      if (visibleIndex === -1 && this.visibleSteps.length > 0) {
        const nextVisible =
          this.visibleSteps.find(index => index > currentIndex) ||
          this.visibleSteps[this.visibleSteps.length - 1];
        this.swiper.slideTo(nextVisible);
        visibleIndex = this.visibleSteps.indexOf(nextVisible);
      }

      if (this.currentStepElement) {
        this.currentStepElement.textContent = (visibleIndex + 1).toString();
      }

      this.updateNavigationButtons(visibleIndex);
      this.updateProgressBar(visibleIndex);
      super.updateUI(this.stateManager.getState());
    }

    // Call parent's updateUI for general form updates
    super.updateUI(this.stateManager.getState());
  }

  private updateNavigationButtons(currentPosition: number): void {
    const globalNav = document.querySelector('[fl-part="global-navigation"]');
    if (!globalNav) return;

    const prevBtn = globalNav.querySelector(
      '[fl-part="prev-btn"]',
    ) as HTMLButtonElement;
    const nextBtn = globalNav.querySelector(
      '[fl-part="next-btn"]',
    ) as HTMLButtonElement;
    const submitBtn = globalNav.querySelector(
      '[fl-part="submit-btn"]',
    ) as HTMLButtonElement;

    // Simple position-based checks
    const isFirstVisible = currentPosition === 0;
    const isLastVisible = currentPosition === this.visibleSteps.length - 1;

    console.log('First slide', isFirstVisible);
    console.log('Last slide', isLastVisible);
    console.log('currentPosition', currentPosition);

    // Update button visibility
    prevBtn.style.display = isFirstVisible ? 'none' : 'block';
    nextBtn.style.display = isLastVisible ? 'none' : 'block';
    submitBtn.style.display = isLastVisible ? 'block' : 'none';

    // Handle first-slide-only content visibility
    document
      .querySelectorAll('[data-visible-on-first-slide]')
      .forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.display = isFirstVisible ? '' : 'none';
        }
      });

    // Update next button text based on current slide
    if (nextBtn) {
      const currentIndex = this.swiper.activeIndex;

      // First priority: Check for slide-specific text
      const slideSpecificText = nextBtn.getAttribute(
        `data-text-slide-${currentIndex}`,
      );
      console.log('SLIDE SPECIFIC TEXT', slideSpecificText);

      // Second priority: If not first slide and general non-first text exists
      const allSlidesText = !isFirstVisible
        ? nextBtn.dataset.textSlideAll
        : null;

      // Apply the text if either specific or general text exists
      if (slideSpecificText) {
        nextBtn.textContent = slideSpecificText;
      } else if (allSlidesText) {
        nextBtn.textContent = allSlidesText;
      }
    }

    // Update total steps display
    const totalStepsElement = this.currentStepElement?.parentElement;
    if (totalStepsElement) {
      totalStepsElement.textContent = `Step ${currentPosition + 1} of ${this.visibleSteps.length}`;
    }
  }

  private updateProgressBar(currentVisibleIndex: number): void {
    if (this.progressBar) {
      const progress =
        ((currentVisibleIndex + 1) / this.visibleSteps.length) * 100;
      this.progressBar.style.width = `${progress}%`;
    }
  }

  private previousStep(): void {
    const currentIndex = this.swiper.activeIndex;
    // Find the previous visible step
    const previousStep = this.visibleSteps
      .slice()
      .reverse()
      .find(index => index < currentIndex);

    if (previousStep !== undefined) {
      this.swiper.slideTo(previousStep);
    }
  }

  private async nextStep(): Promise<void> {
    const isValid = await this.validateCurrentStep();
    if (!isValid) return;

    const currentIndex = this.swiper.activeIndex;
    // Find the next visible step
    const nextStep = this.visibleSteps.find(index => index > currentIndex);

    if (nextStep !== undefined) {
      this.swiper.slideTo(nextStep);
    }
  }

  private scrollToFormTop(smooth: boolean = false): void {
    // Check if there's a configured scroll target
    const scrollTarget = this.config.scrollElement
      ? document.querySelector(this.config.scrollElement)
      : this.wrapper;

    if (scrollTarget instanceof HTMLElement) {
      // If there is a valid element, scroll to its top with some padding
      const padding = this.config.scrollPadding || 0;
      const targetPosition =
        scrollTarget.getBoundingClientRect().top + window.pageYOffset - padding;

      window.scrollTo({
        top: targetPosition,
        behavior: smooth ? 'smooth' : 'auto',
      });
    } else {
      // Fallback to scrolling to the top of the page
      window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto',
      });
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
