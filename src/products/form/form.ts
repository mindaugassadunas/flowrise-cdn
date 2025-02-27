import { MultiStepForm } from './core/MultiStepForm';
import { SingleStepForm } from './core/SingleStepForm';
import { localConfig, testConfig, applicationConfig } from './formConfigs';

function initForm(wrapper: HTMLElement, form: HTMLFormElement) {
  let formConfig;
  const formConfigType = wrapper.getAttribute('fl-form-config');
  console.log('config type', formConfigType);
  switch (formConfigType) {
    case 'test':
      formConfig = testConfig;
      break;
    case 'application':
      formConfig = applicationConfig;
      break;
    default:
      formConfig = localConfig;
      break;
  }

  const type = wrapper.getAttribute('fl-type');
  console.log('form type', type);
  switch (type) {
    case 'multi-step':
      console.log('form type proceed - multi');
      return new MultiStepForm(wrapper, form, formConfig);
    default:
      console.log('form type proceed - single');
      return new SingleStepForm(wrapper, form, formConfig);
  }
}

document.querySelectorAll('[fl="form"]').forEach(wrapper => {
  const form = wrapper.querySelector('form') as HTMLFormElement;
  console.log('wrapper', wrapper);
  initForm(wrapper as HTMLElement, form);
});
