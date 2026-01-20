const TARGET_URL = '/submit-ai-tool/';

const TEST_DATA = {
  name: 'Speed Test User',
  email: 'speedtest@example.com',
  toolUrl: 'https://example-speed-test.com',
  category: 'AI Assistant',
  pricing: 'Free',
  description: 'Benchmark test submission for browser automation speed comparison. This tool provides AI-powered features for productivity enhancement.',
};

const SELECTORS = {
  name: '#wpforms-148-field_0',
  email: '#wpforms-148-field_1',
  toolUrl: '#wpforms-148-field_3',
  category: '#wpforms-148-field_5',
  pricingContainer: '.choices[data-type="select-one"]',
  pricingDropdown: '.choices__list--dropdown',
  pricingOption: (value: string) => `.choices__item--choice[data-value="${value}"]`,
  description: '#wpforms-148-field_2',
  submit: '#wpforms-submit-148',
};

interface CypressTimings {
  pageNavigation: number;
  name: number;
  email: number;
  toolUrl: number;
  category: number;
  pricing: number;
  description: number;
  submitClick: number;
}

describe('Form Fill Benchmark', () => {
  it('fills the form and measures timings', () => {
    const timings: Partial<CypressTimings> = {};
    const startTime = performance.now();

    // Navigate and measure
    cy.visit(TARGET_URL).then(() => {
      timings.pageNavigation = performance.now() - startTime;
    });

    // Measure name field
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.name).type(TEST_DATA.name).then(() => {
        timings.name = performance.now() - start;
      });
    });

    // Measure email field
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.email).type(TEST_DATA.email).then(() => {
        timings.email = performance.now() - start;
      });
    });

    // Measure URL field
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.toolUrl).type(TEST_DATA.toolUrl).then(() => {
        timings.toolUrl = performance.now() - start;
      });
    });

    // Measure category field
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.category).type(TEST_DATA.category).then(() => {
        timings.category = performance.now() - start;
      });
    });

    // Measure pricing dropdown (Choices.js)
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.pricingContainer).click()
        .then(() => cy.get(SELECTORS.pricingDropdown).should('be.visible'))
        .then(() => cy.get(SELECTORS.pricingOption(TEST_DATA.pricing)).click())
        .then(() => {
          timings.pricing = performance.now() - start;
        });
    });

    // Measure description textarea
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.description).type(TEST_DATA.description).then(() => {
        timings.description = performance.now() - start;
      });
    });

    // Measure submit click
    cy.then(() => {
      const start = performance.now();
      return cy.get(SELECTORS.submit).click().then(() => {
        timings.submitClick = performance.now() - start;
      });
    });

    // Output results
    cy.then(() => {
      const totalFormFill = (timings.name || 0) + (timings.email || 0) +
        (timings.toolUrl || 0) + (timings.category || 0) +
        (timings.pricing || 0) + (timings.description || 0);

      const totalTest = (timings.pageNavigation || 0) + totalFormFill + (timings.submitClick || 0);

      const result = {
        tool: 'cypress',
        mode: Cypress.browser.isHeadless ? 'headless' : 'headed',
        iteration: parseInt(Cypress.env('ITERATION') || '0'),
        timestamp: new Date().toISOString(),
        metrics: {
          browserLaunch: 0, // Cypress handles browser separately
          pageNavigation: timings.pageNavigation || 0,
          formFill: {
            name: timings.name || 0,
            email: timings.email || 0,
            toolUrl: timings.toolUrl || 0,
            category: timings.category || 0,
            pricing: timings.pricing || 0,
            description: timings.description || 0,
          },
          submitClick: timings.submitClick || 0,
          totalFormFill,
          totalTest,
          totalWithLaunch: totalTest, // No separate browser launch metric
        },
        success: true,
      };

      // Write results to file
      const mode = Cypress.browser.isHeadless ? 'headless' : 'headed';
      const iteration = Cypress.env('ITERATION') || 0;
      cy.writeFile(`results/cypress-${mode}-${iteration}.json`, result);

      // Also log to console
      cy.log(`Total test time: ${Math.round(totalTest)}ms`);
    });
  });
});
