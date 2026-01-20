import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://toolsummary.com',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: false,
    defaultCommandTimeout: 10000,
  },
});
