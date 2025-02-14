import { FormConfig } from './models/formTypes';
import { MultiStepForm } from './core/MultiStepForm';
import { SingleStepForm } from './core/SingleStepForm';

const formConfig: FormConfig = {
  action: '/test',
  hiddenFields: [
    {
      name: 'utm_source',
      cookieKey: 'utm_source',
      storageKey: 'utm_source',
      defaultValue: '',
    },
  ],
  conditionalFields: [
    {
      targetFieldId: 'lastName',
      action: 'show',
      operator: 'AND',
      conditions: [
        {
          fieldId: 'firstName',
          operator: 'equals',
          value: 'a',
        },
      ],
      clearOnHide: true,
      validateOnShow: false,
    },
  ],
};

function initForm(
  wrapper: HTMLElement,
  form: HTMLFormElement,
  formConfig: FormConfig,
) {
  const type = wrapper.getAttribute('fl-type');
  switch (type) {
    case 'multi-step':
      return new MultiStepForm(wrapper, form, formConfig);
    default:
      return new SingleStepForm(wrapper, form, formConfig);
  }
}

document.querySelectorAll('[fl="form"]').forEach(wrapper => {
  const form = wrapper.querySelector('form') as HTMLFormElement;
  initForm(wrapper as HTMLElement, form, formConfig);
});
