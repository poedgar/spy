/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to authenticate an agent via the sign in form
       * @example cy.loginAsAgent('Agent_007', 'topsecret')
       */
      loginAsAgent(username?: string, password?: string): Chainable<void>;

      /**
       * Custom command to login quickly using preset credentials
       * @example cy.quickLogin007()
       */
      quickLogin007(): Chainable<void>;

      /**
       * Custom command to create a new game room
       * @example cy.createNewGame('Operation Alpha')
       */
      createNewGame(title?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAsAgent', (username = 'Agent_007', password = 'securepassword123') => {
  cy.visit('/');
  cy.get('#input-username').clear().type(username);
  cy.get('#input-password').clear().type(password);
  cy.get('#btn-authenticate-submit').click();
  cy.get('#dashboard-header-card', { timeout: 8000 }).should('be.visible');
});

Cypress.Commands.add('quickLogin007', () => {
  cy.visit('/');
  cy.get('#btn-demo-credentials-007').click();
  cy.get('#btn-authenticate-submit').click();
  cy.get('#dashboard-header-card', { timeout: 8000 }).should('be.visible');
});

Cypress.Commands.add('createNewGame', (title = 'Operation Chimera') => {
  cy.get('#btn-create-game-trigger').click();
  cy.get('#create-game-modal-card').should('be.visible');
  if (title) {
    cy.get('#create-game-modal-card input').first().clear().type(title);
  }
  cy.get('#btn-confirm-create-game').click();
  cy.get('#lobby-header', { timeout: 6000 }).should('be.visible');
});

export {};
