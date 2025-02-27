// validation/URLValidationRules.ts
import { FieldRuleInterface, Rules } from 'just-validate';
import { URLFieldOptions } from '../components/url/types/urlTypes';

export class URLValidationRules {
  /**
   * Create validation rules for URL fields
   */
  static buildURLRules(
    field: HTMLInputElement,
    options: URLFieldOptions,
  ): FieldRuleInterface[] {
    const rules: FieldRuleInterface[] = [];

    // Required validation
    if (field.required || field.hasAttribute('required')) {
      rules.push({
        rule: 'required' as Rules,
        errorMessage:
          field.getAttribute('data-validate-message-required') ||
          'This field is required',
      });
    }

    // URL validation with custom validator to handle parameters
    rules.push({
      rule: 'function' as Rules,
      validator: (value: string | boolean) => {
        if (typeof value !== 'string' || !value) {
          return !field.required;
        }

        try {
          let urlString = value.trim();

          // Handle URLs starting with www
          if (urlString.startsWith('www.')) {
            urlString = 'https://' + urlString;
          }

          // Try to parse the URL
          let urlObj: URL;
          try {
            urlObj = new URL(urlString);
          } catch (e) {
            // Try adding https:// if no protocol exists
            if (!urlString.match(/^[a-zA-Z]+:\/\//)) {
              try {
                urlObj = new URL('https://' + urlString);
              } catch (e) {
                return false; // Not a valid URL even with prefix
              }
            } else {
              return false; // Has protocol but not valid
            }
          }

          // Enhanced URL validation checks:

          // 1. Check for hostname - must have at least a domain name
          const hostname = urlObj.hostname;
          if (!hostname || hostname.length < 3) {
            return false;
          }

          // 2. Check for special cases: localhost, IP addresses
          if (
            hostname === 'localhost' ||
            hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) ||
            hostname === '[::1]'
          ) {
            return true;
          }

          // 3. Check for proper domain structure (at least two parts, valid TLD)
          const hostnameParts = hostname.split('.');

          // Must have at least two parts (domain.tld)
          if (hostnameParts.length < 2) {
            return false;
          }

          // Check the TLD format (all letters, reasonable length)
          const tld = hostnameParts[hostnameParts.length - 1].toLowerCase();

          // TLD should be between 2 and 63 characters (per DNS standards)
          if (tld.length < 2 || tld.length > 63) {
            return false;
          }

          // TLD should only contain letters (avoid odd domains ending in numbers)
          // We're being a bit strict here to filter out obvious errors like "google"
          if (!tld.match(/^[a-z]+$/)) {
            return false;
          }

          return true;
        } catch (error) {
          return false;
        }
      },
      errorMessage:
        field.getAttribute('data-validate-message-url') || 'Enter a valid URL',
    });

    // Protocol specific validation if required
    if (options.requiredProtocol) {
      rules.push({
        rule: 'function' as Rules,
        validator: (value: string | boolean) => {
          if (typeof value !== 'string' || !value) return true;

          try {
            let urlString = value.trim();
            // Handle URLs starting with www
            if (urlString.startsWith('www.')) {
              urlString = 'https://' + urlString;
            }

            // Try to parse URL or add protocol if needed
            let urlObj: URL;
            try {
              urlObj = new URL(urlString);
            } catch (e) {
              if (!urlString.match(/^[a-zA-Z]+:\/\//)) {
                urlObj = new URL('https://' + urlString);
              } else {
                return false;
              }
            }

            const protocol = urlObj.protocol.replace(':', '');
            return options.allowedProtocols.includes(protocol);
          } catch (e) {
            return false;
          }
        },
        errorMessage:
          field.getAttribute('data-validate-message-protocol') ||
          `URL must use one of these protocols: ${options.allowedProtocols.join(', ')}`,
      });
    }

    // Add URL cleanup function that removes parameters if configured
    rules.push({
      rule: 'function' as Rules,
      validator: (value: string | boolean) => {
        if (typeof value !== 'string' || !value) return true;

        try {
          let urlString = value;

          // Apply trimming if enabled
          if (options.trimUrl) {
            urlString = urlString.trim();
          }

          // Handle URLs starting with www
          if (urlString.startsWith('www.')) {
            urlString = 'https://' + urlString;

            // Update the field with the fixed URL
            setTimeout(() => {
              field.value = urlString;
            }, 0);
          }

          // Try to parse the URL
          let urlObj: URL;
          try {
            urlObj = new URL(urlString);
          } catch (e) {
            // Try adding https:// if no protocol exists
            if (!urlString.match(/^[a-zA-Z]+:\/\//)) {
              const fixedUrl = 'https://' + urlString;
              try {
                urlObj = new URL(fixedUrl);

                // Update the field with the fixed URL
                setTimeout(() => {
                  field.value = fixedUrl;
                }, 0);
              } catch (e) {
                // If it still fails, do nothing
                return true;
              }
            } else {
              return true;
            }
          }

          // Remove parameters if configured
          if (options.removeParams && urlObj.search) {
            urlObj.search = '';
            const cleanedUrl = urlObj.toString();

            // Update the field with the cleaned URL
            setTimeout(() => {
              field.value = cleanedUrl;
            }, 0);
          }

          return true;
        } catch (error) {
          return true;
        }
      },
      // This is just for parameter cleanup, so no error message needed
      errorMessage: '',
    });

    return rules;
  }
}
