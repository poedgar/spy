describe('SpyNet Terminal - Authentication & Sign In', () => {
  beforeEach(() => {
    // Clear localStorage to ensure fresh session
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('displays the terminal header, encryption status, and sign-in card', () => {
    cy.get('#app-header').should('be.visible');
    cy.contains('SpyNet Terminal').should('be.visible');
    cy.contains('ENCRYPTION: AES-256').should('be.visible');
    cy.get('#signin-card').should('be.visible');
    cy.contains('h1', 'Operative Sign In').should('be.visible');
    cy.get('#input-username').should('be.visible');
    cy.get('#input-password').should('be.visible');
    cy.get('#btn-authenticate-submit').should('be.visible');
  });

  it('shows error validation when username is missing', () => {
    cy.get('#input-password').type('securepassword');
    cy.get('#btn-authenticate-submit').click();
    cy.get('#auth-error-banner').should('be.visible');
    cy.contains('Operative username or codename is required').should('be.visible');
  });

  it('shows error validation when password is missing', () => {
    cy.get('#input-username').type('Agent_Test');
    cy.get('#btn-authenticate-submit').click();
    cy.get('#auth-error-banner').should('be.visible');
    cy.contains('Passcode is required').should('be.visible');
  });

  it('shows error validation when password is less than 4 characters', () => {
    cy.get('#input-username').type('Agent_Test');
    cy.get('#input-password').type('123');
    cy.get('#btn-authenticate-submit').click();
    cy.get('#auth-error-banner').should('be.visible');
    cy.contains('Passcode must contain at least 4 security characters').should('be.visible');
  });

  it('toggles password visibility with the eye icon', () => {
    cy.get('#input-password').type('secretPass123');
    cy.get('#input-password').should('have.attr', 'type', 'password');

    cy.get('#btn-toggle-password-visibility').click();
    cy.get('#input-password').should('have.attr', 'type', 'text');

    cy.get('#btn-toggle-password-visibility').click();
    cy.get('#input-password').should('have.attr', 'type', 'password');
  });

  it('populates fields using quick demo credentials', () => {
    cy.get('#btn-demo-credentials-007').click();
    cy.get('#input-username').should('have.value', 'Agent_007');
    cy.get('#input-password').should('have.value', 'MI6_Classified_2026!');

    cy.get('#btn-demo-credentials-viper').click();
    cy.get('#input-username').should('have.value', 'Operative_Viper');
    cy.get('#input-password').should('have.value', 'BlackOps_Clearance_4!');
  });

  it('authenticates successfully and loads the Agent Dashboard', () => {
    cy.get('#input-username').type('Commander_Bond');
    cy.get('#input-password').type('topsecret77');
    cy.get('#btn-authenticate-submit').click();

    // Verify loading state and dashboard transition
    cy.get('#dashboard-header-card', { timeout: 8000 }).should('be.visible');
    cy.contains('ENCRYPTED TERMINAL ACTIVE').should('be.visible');
    cy.contains('Commander_Bond').should('be.visible');
    cy.contains('LEVEL 4 - TOP SECRET').should('be.visible');
    cy.get('#btn-create-game-trigger').should('be.visible');
  });

  it('allows authenticated agent to sign out back to login screen', () => {
    cy.loginAsAgent('Agent_Echo', 'passcode123');
    cy.get('#btn-sign-out-top').click();
    cy.get('#signin-card').should('be.visible');
    cy.contains('Operative Sign In').should('be.visible');
  });
});
