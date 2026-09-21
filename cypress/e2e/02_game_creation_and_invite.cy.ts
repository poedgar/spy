describe('SpyNet Terminal - Game Creation & Invitation System', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginAsAgent('Director_Vance', 'DirectorPass99!');
  });

  it('opens and closes the Create Game modal', () => {
    cy.get('#btn-create-game-trigger').click();
    cy.get('#create-game-modal-card').should('be.visible');
    cy.contains('h3', 'Create New Spy Operation').should('be.visible');
    cy.contains('500 pre-existing locations').should('be.visible');

    // Close with X button
    cy.get('#btn-close-create-modal').click();
    cy.get('#create-game-modal-card').should('not.exist');
  });

  it('creates a new spy game and navigates to the lobby', () => {
    cy.get('#btn-create-game-trigger').click();
    cy.get('#create-game-modal-card').should('be.visible');

    // Enter custom operation name
    cy.get('#create-game-modal-card input').first().clear().type('Operation GoldenEye');
    cy.get('#btn-confirm-create-game').click();

    // Verify lobby view
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
    cy.contains('Operation GoldenEye').should('be.visible');
    cy.contains('HOST / CREATOR').should('be.visible');
    cy.contains('RECRUITING').should('be.visible');

    // Verify minimum 3 participants constraint enforcement
    cy.get('#participant-threshold-banner').should('be.visible');
    cy.contains('At least 3 participants required to start').should('be.visible');
    cy.contains('1/3 joined').should('be.visible');

    // Start Game button should be disabled for 1 player
    cy.get('#btn-launch-operation').should('be.disabled');
  });

  it('generates an invitation link and allows copying to clipboard', () => {
    cy.createNewGame('Operation Shadowfall');

    // Open invite dialog
    cy.get('#btn-open-invite-modal').click();
    cy.get('#invite-modal-card').should('be.visible');
    cy.contains('h3', 'Send Invitation Link').should('be.visible');

    // Verify invite link input has value containing URL parameter
    cy.get('#invite-url-input')
      .should('be.visible')
      .invoke('val')
      .should('match', /\?join=|\?game=/);

    // Verify copy button
    cy.get('#btn-copy-invite-link').click();
    cy.contains('COPIED!').should('be.visible');

    // Close modal
    cy.get('#btn-close-invite-modal').click();
    cy.get('#invite-modal-card').should('not.exist');
  });

  it('allows exploring the 500 pre-existing locations database', () => {
    cy.createNewGame('Operation Citadel');

    // Open locations guide
    cy.get('#btn-view-locations-guide').click();
    cy.get('#locations-guide-modal-card').should('be.visible');
    cy.contains('500 Pre-existing Locations Pool').should('be.visible');

    // Test searching for specific place types: church, palace, castle, school
    cy.get('#input-search-locations').type('Castle');
    cy.contains('Windsor Castle').should('exist');

    cy.get('#input-search-locations').clear().type('Palace');
    cy.contains('Buckingham Palace').should('exist');

    cy.get('#input-search-locations').clear().type('School');
    cy.contains('School').should('exist');

    cy.get('#input-search-locations').clear().type('Church');
    cy.contains('Church').should('exist');

    // Close locations modal
    cy.get('#btn-close-locations-guide').click();
    cy.get('#locations-guide-modal-card').should('not.exist');
  });
});
