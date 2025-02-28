import { DateRangeMode } from './components/datepicker/types/datepickerTypes';
import { getAllCountries } from './components/dropdown/predefined/countries';
import { FormConfig } from './models/formTypes';

export const localConfig: FormConfig = {
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
    fileUpload: {
      type: 'fileupload',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf', 'application/zip'],
      multiple: true,
      required: true,
      // Optional endpoint for direct file uploads
      // If not provided, files will be submitted with the form
      endpoint: 'https://your-upload-endpoint.com/upload',
    },
  },
};

export const testConfig: FormConfig = {
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

export const applicationConfig: FormConfig = {
  path: window.location.pathname,
  action: 'https://hook.eu1.make.com/ykjl2vvn4s3m9nfnkqwc5fr3gv95xb6t',
  successRedirect: '/confirmation.html',
  scrollToTop: true,
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
    phone: {
      type: 'phone',
    },
    'dob-field': {
      type: 'datepicker',
      format: 'YYYY-MM-DD',
      allowInput: true,
      rangeMode: DateRangeMode.PAST,
      // placeholder: 'Select date...',
      showTodayButton: false,
    },
    'citizenship-field': {
      type: 'dropdown',
      options: getAllCountries(),
      searchable: true,
      //   placeholder: 'Select a country...',
    },
    'residency-field': {
      type: 'dropdown',
      options: getAllCountries(),
      searchable: true,
      //   placeholder: 'Select a country...',
    },
    'academic-experience-field': {
      type: 'dropdown',
      options: [
        { value: 'High school', label: 'High school' },
        { value: 'Vocational school', label: 'Vocational school' },
        { value: `Bachelor’s degree`, label: `Bachelor’s degree` },
        { value: `Master’s degree`, label: `Master’s degree` },
        { value: 'PhD', label: 'PhD' },
        { value: 'None', label: 'None' },
      ],
      searchable: false,
    },
    'work-status-field': {
      type: 'select',
    },
    'study-status-field': {
      type: 'select',
    },
    'de-institution-field': {
      type: 'select',
    },
    'linkedin-boolean-field': {
      type: 'select',
    },
    'work-experience-field': {
      type: 'select',
    },
    'tools-field': {
      type: 'select',
    },
    'programming-experience-field': {
      type: 'select',
    },
    'math-experience-field': {
      type: 'select',
    },
    'it-boolean-field': {
      type: 'select',
    },
    'courses-field': {
      type: 'select',
    },
    'english-skills-field': {
      type: 'select',
    },
    'german-skills-field': {
      type: 'select',
    },
    'motivation-field': {
      type: 'select',
    },
    'hours-per-week-field': {
      type: 'select',
    },
    'hours-per-week-short-program-field': {
      type: 'select',
    },
    'hours-per-week-de-field': {
      type: 'select',
    },
    'heard-from-field': {
      type: 'dropdown',
      options: [
        { value: 'Facebook', label: 'Facebook' },
        { value: 'Instagram', label: 'Instagram' },
        { value: 'LinkedIn', label: 'LinkedIn' },
        { value: 'Google search', label: 'Google search' },
        { value: 'Youtube', label: 'Youtube' },
        { value: 'Employer', label: 'Employer' },
        {
          value: 'Friend or family recommendation',
          label: 'Friend or family recommendation',
        },
        { value: 'Reviews', label: 'Reviews' },
        { value: 'Other', label: 'Other' },
      ],
      searchable: false,
    },
    'tc-connection-field': {
      type: 'select',
    },
  },
};
