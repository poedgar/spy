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
       * @example cy.createNewGame('Operation Alpha', 8) // sets the roster capacity slider
       */
      createNewGame(title?: string, maxPlayers?: number): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAsAgent', (username = 'Agent_007', password = 'securepassword123') => {
  cy.visit('/');
  cy.get('#input-username').clear().type(username);
  cy.get('#input-password').clear().type(password);
  cy.get('#btn-authenticate').click();
  cy.get('#dashboard-header-card', { timeout: 8000 }).should('be.visible');
});

Cypress.Commands.add('quickLogin007', () => {
  cy.visit('/');
  cy.get('#btn-demo-credentials-007').click();
  cy.get('#btn-authenticate').click();
  cy.get('#dashboard-header-card', { timeout: 8000 }).should('be.visible');
});

Cypress.Commands.add('createNewGame', (title = 'Operation Chimera', maxPlayers?: number) => {
  cy.get('#btn-create-game-trigger').click();
  cy.get('#create-game-modal-card').should('be.visible');
  if (title) {
    cy.get('#create-game-modal-card input').first().clear().type(title);
  }
  if (maxPlayers) {
    // React-controlled range input: set via the native setter so React's change
    // detection picks it up, then dispatch the input event it listens for.
    cy.get('#range-max-players').then(($el) => {
      const input = $el[0] as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, String(maxPlayers));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  cy.get('#btn-confirm-create-game').click();
  cy.get('#lobby-header', { timeout: 6000 }).should('be.visible');
});

export {};
