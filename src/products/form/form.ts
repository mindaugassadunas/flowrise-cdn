import { FormConfig } from './models/formTypes';
import { MultiStepForm } from './core/MultiStepForm';
import { SingleStepForm } from './core/SingleStepForm';
import { DateRangeMode } from './components/datepicker/types/datepickerTypes';
import { getAllCountries } from './components/dropdown/predefined/countries';

const testConfig: FormConfig = {
  path: window.location.pathname,
  action: 'https://hook.eu1.make.com/ykjl2vvn4s3m9nfnkqwc5fr3gv95xb6t',
  successRedirect: '/confirmation.html',
  redirectParams: [
    {
      key: 'course',
      value: 'DA',
    },
    {
      key: 'utm',
      fieldId: 'utm_source',
    },
  ],
  //   successMessage: 'Success',
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
  conditionalSteps: [
    {
      stepId: 'step2',
      action: 'show',
      operator: 'AND',
      conditions: [
        {
          fieldId: 'searchable_dropdown',
          operator: 'equals',
          value: 'us',
        },
      ],
      clearOnHide: true,
      validateOnShow: true,
    },
  ],
  fields: {
    country: {
      type: 'dropdown',
      // options: [
      //   { value: 'us', label: 'United States' },
      //   { value: 'ca', label: 'Canada' },
      // ],
      options: getAllCountries(),
      searchable: true,
      placeholder: 'Select a country...',
    },
    skills: {
      type: 'dropdown',
      // options: [
      //   { value: 'us', label: 'United States' },
      //   { value: 'ca', label: 'Canada' },
      // ],
      // options: getAllCountries(),
      searchable: false,
      placeholder: 'Select your skills...',
    },
    datepicker: {
      type: 'datepicker',
      format: 'YYYY-MM-DD',
      allowInput: true,
      rangeMode: DateRangeMode.PAST,
      placeholder: 'Select date...',
      showTodayButton: false,
    },
    select1: {
      type: 'select',
    },
    select2: {
      type: 'select',
    },
    phoneInput: {
      type: 'phone',
    },
    websiteUrl: {
      type: 'url',
      removeParams: true, // Default: keep URL parameters
      requiredProtocol: true, // Require http/https
      allowedProtocols: ['http', 'https'], // Only allow http and https
      trimUrl: true, // Trim whitespace from URL
    },
  },
};

const applicationConfig: FormConfig = {
  path: window.location.pathname,
  action: 'https://hook.eu1.make.com/ykjl2vvn4s3m9nfnkqwc5fr3gv95xb6t',
  successRedirect: '/confirmation.html',
  redirectParams: [
    {
      key: 'course',
      value: 'DA',
    },
    {
      key: 'utm',
      fieldId: 'utm_source',
    },
  ],
  hiddenFields: [
    {
      name: 'utm_source',
      cookieKey: 'utm_source',
      storageKey: 'utm_source',
      defaultValue: '',
    },
  ],
  fields: {
    'residency-field': {
      type: 'dropdown',
      options: getAllCountries(),
      searchable: true,
      placeholder: 'Select a country...',
    },
    'country-field': {
      type: 'dropdown',
      options: getAllCountries(),
      searchable: true,
      placeholder: 'Select a country...',
    },
    'datepicker-field': {
      type: 'datepicker',
      format: 'YYYY-MM-DD',
      allowInput: true,
      rangeMode: DateRangeMode.PAST,
      placeholder: 'Select date...',
      showTodayButton: false,
    },
    'select-field': {
      type: 'select',
    },
    'multi-select-field': {
      type: 'select',
    },
    'phone-input': {
      type: 'phone',
    },
  },
};

function initForm(wrapper: HTMLElement, form: HTMLFormElement) {
  let formConfig;
  const formConfigType = wrapper.getAttribute('fl-form-config');
  console.log('config type', formConfigType);
  switch (formConfigType) {
    case 'application':
      formConfig = applicationConfig;
      break;
    default:
      formConfig = testConfig;
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
