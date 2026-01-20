export const TARGET_URL = 'https://toolsummary.com/submit-ai-tool/';

export const TEST_DATA = {
  name: 'Speed Test User',
  email: 'speedtest@example.com',
  toolUrl: 'https://example-speed-test.com',
  category: 'AI Assistant',
  pricing: 'Free',
  description: 'Benchmark test submission for browser automation speed comparison. This tool provides AI-powered features for productivity enhancement.',
};

// WPForms selectors - verified from actual page
export const SELECTORS = {
  name: '#wpforms-148-field_0',
  email: '#wpforms-148-field_1',
  toolUrl: '#wpforms-148-field_3',
  category: '#wpforms-148-field_5',
  // Pricing uses Choices.js - need to click the container, then the option
  pricingContainer: '.choices[data-type="select-one"]',
  pricingDropdown: '.choices__list--dropdown',
  pricingOption: (value: string) => `.choices__item--choice[data-value="${value}"]`,
  description: '#wpforms-148-field_2',
  submit: '#wpforms-submit-148',
};

// Choices.js pricing options
export const PRICING_OPTIONS = ['Free', 'Freemium', 'Paid', 'Open Source'];
