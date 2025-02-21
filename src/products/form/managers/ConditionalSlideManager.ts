import Swiper from 'swiper';
import { ConditionalStepConfig, Condition } from '../models/formTypes';
import { FormStateManager } from './FormStateManager';

type VisibilityChangeCallback = (stepIndex: number, isVisible: boolean) => void;

export class StepConditionManager {
  private rules: ConditionalStepConfig[];
  private swiper: Swiper;
  private stateManager: FormStateManager;
  private onVisibilityChange: VisibilityChangeCallback;

  constructor(
    swiper: Swiper,
    stateManager: FormStateManager,
    rules: ConditionalStepConfig[],
    onVisibilityChange: VisibilityChangeCallback,
  ) {
    this.swiper = swiper;
    this.stateManager = stateManager;
    this.rules = rules;
    this.onVisibilityChange = onVisibilityChange;

    // Subscribe to state changes
    this.stateManager.subscribe(() => this.evaluateAllConditions());
  }

  public evaluateAllConditions(): void {
    this.rules.forEach(rule => this.evaluateRule(rule));
  }

  private evaluateRule(rule: ConditionalStepConfig): boolean {
    const results = rule.conditions.map(condition =>
      this.evaluateCondition(condition),
    );

    const finalResult =
      rule.operator === 'OR'
        ? results.some(result => result)
        : results.every(result => result);

    const slideElement = document.getElementById(rule.stepId);
    if (slideElement) {
      const slideIndex = Array.from(this.swiper.slides).indexOf(slideElement);
      if (slideIndex !== -1) {
        this.updateStepVisibility(
          slideIndex,
          rule.action === 'show' ? finalResult : !finalResult,
        );
      }
    }

    return finalResult;
  }

  private evaluateCondition(condition: Condition): boolean {
    const field = document.getElementById(
      condition.fieldId,
    ) as HTMLInputElement;
    if (!field) return false;

    const fieldValue = field.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'notEquals':
        return fieldValue !== condition.value;
      case 'contains':
        return fieldValue.includes(condition.value);
      case 'notContains':
        return !fieldValue.includes(condition.value);
      case 'startsWith':
        return fieldValue.startsWith(condition.value);
      case 'endsWith':
        return fieldValue.endsWith(condition.value);
      case 'greaterThan':
        return parseFloat(fieldValue) > parseFloat(condition.value);
      case 'lessThan':
        return parseFloat(fieldValue) < parseFloat(condition.value);
      case 'greaterThanOrEqual':
        return parseFloat(fieldValue) >= parseFloat(condition.value);
      case 'lessThanOrEqual':
        return parseFloat(fieldValue) <= parseFloat(condition.value);
      case 'isEmpty':
        return !fieldValue;
      case 'isNotEmpty':
        return !!fieldValue;
      case 'matches':
        return new RegExp(condition.value).test(fieldValue);
      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );
      case 'notIn':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue)
        );
      case 'custom':
        if (typeof condition.value === 'function') {
          return condition.value(fieldValue);
        }
        return false;
      default:
        return false;
    }
  }

  private updateStepVisibility(stepIndex: number, isVisible: boolean): void {
    const slide = this.swiper.slides[stepIndex];
    if (!slide) return;

    // Update visibility in DOM
    slide.style.display = isVisible ? '' : 'none';

    // Notify parent component
    this.onVisibilityChange(stepIndex, isVisible);

    // If current step is hidden, move to the next visible step
    if (!isVisible && this.swiper.activeIndex === stepIndex) {
      this.handleHiddenCurrentStep(stepIndex);
    }
  }

  private handleHiddenCurrentStep(stepIndex: number): void {
    // Get updated visible steps from parent
    const visibleSteps = Array.from(this.swiper.slides)
      .map((_, index) => index)
      .filter(index => this.swiper.slides[index].style.display !== 'none');

    const nextVisibleIndex = visibleSteps.find(i => i > stepIndex);
    if (nextVisibleIndex !== undefined) {
      this.swiper.slideTo(nextVisibleIndex);
    } else {
      const prevVisibleIndex = visibleSteps
        .slice()
        .reverse()
        .find(i => i < stepIndex);
      if (prevVisibleIndex !== undefined) {
        this.swiper.slideTo(prevVisibleIndex);
      }
    }
  }
}
