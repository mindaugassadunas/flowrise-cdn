// import { Rules } from 'just-validate';
// import { ValidationRule } from './types';

// export class ValidationRuleFactory {
//   private static defaultMessages: Record<string, string> = {
//     required: 'This field is required',
//     email: 'Please enter a valid email',
//     number: 'Please enter a valid number',
//     minLength: 'Field is too short',
//     maxLength: 'Field is too long',
//     customRegexp: 'Invalid format',
//     minNumber: 'Value is too small',
//     maxNumber: 'Value is too large',
//     phone: 'Please enter a valid phone number',
//   };

//   static createRule(
//     ruleType: Rules,
//     field: HTMLElement,
//     options?: { value?: any; pattern?: RegExp },
//   ): ValidationRule {
//     const errorMessage =
//       field.getAttribute(`data-validate-message-${ruleType}`) ||
//       this.defaultMessages[ruleType];

//     return {
//       rule: ruleType,
//       errorMessage,
//       ...options,
//     };
//   }

//   static getDefaultMessage(rule: string): string {
//     return this.defaultMessages[rule] || 'Invalid value';
//   }
// }
