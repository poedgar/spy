// ***********************************************************
// This is processed and loaded automatically before your test files.
// ***********************************************************

import './commands.ts';

// Prevent uncaught exceptions from failing tests if harmless
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
