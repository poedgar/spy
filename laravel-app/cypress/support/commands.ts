/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      registerAgent(name: string, email: string, password?: string): Chainable<void>;
      loginAgent(email: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('registerAgent', (name: string, email: string, password = 'password123') => {
  cy.visit('/register');
  cy.get('#name').type(name);
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('#password_confirmation').type(password);
  cy.get('[data-test="register-user-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('loginAgent', (email: string, password = 'password123') => {
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('[data-test="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

export {};
