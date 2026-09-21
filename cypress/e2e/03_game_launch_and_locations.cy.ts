describe('SpyNet Terminal - 3+ Players Threshold, Spy Ratio & Game Launch', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginAsAgent('Commander_Alpha', 'ClearanceAlpha!');
    cy.createNewGame('Operation Crossfire');
  });

  it('prevents starting the game when there are fewer than 3 participants', () => {
    cy.get('#btn-launch-operation').should('be.disabled');
    cy.contains('Requires 3+ Participants: 1/3').should('be.visible');

    // Add 1 bot (total 2 players)
    cy.get('#btn-add-bot-operative').click();
    cy.get('#btn-launch-operation').should('be.disabled');
    cy.contains('Requires 3+ Participants: 2/3').should('be.visible');
  });

  it('enables the Start Game button once 3 or more participants have joined', () => {
    // Add 2 bots so total reaches 3
    cy.get('#btn-add-two-bots').click();

    // Verify condition banner
    cy.get('#participant-threshold-banner').should('contain', 'Launch Condition Met');
    cy.get('#participant-threshold-banner').should('contain', '3 active');

    // Verify Start Game button is enabled and displays spy count
    cy.get('#btn-launch-operation').should('not.be.disabled');
    cy.get('#btn-launch-operation').should('contain', 'Start Game (3 Players • 1 Spy)');
  });

  it('calculates the correct number of spies based on player count (1 for 3-4, 2 for 5-7, 3 for 8+)', () => {
    // Start with 1 player (Host), add 2 bots -> 3 players
    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').should('contain', '1 Spy');

    // Add 1 more bot -> 4 players (still 1 Spy)
    cy.get('#btn-add-bot-operative').click();
    cy.get('#btn-launch-operation').should('contain', '4 Players • 1 Spy');

    // Add 1 more bot -> 5 players (must be 2 Spies)
    cy.get('#btn-add-bot-operative').click();
    cy.get('#btn-launch-operation').should('contain', '5 Players • 2 Spies');

    // Add 2 more bots -> 7 players (still 2 Spies)
    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').should('contain', '7 Players • 2 Spies');

    // Add 1 more bot -> 8 players (must be 3 Spies)
    cy.get('#btn-add-bot-operative').click();
    cy.get('#btn-launch-operation').should('contain', '8 Players • 3 Spies');
  });

  it('launches the game and assigns classified dossiers and locations to operatives', () => {
    // Launch with 3 players
    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').click();

    // Verify active game state
    cy.contains('MISSION ACTIVE // INTERROGATION PHASE', { timeout: 6000 }).should('be.visible');

    // Verify secret dossier toggle
    cy.get('#btn-toggle-classified-dossier').should('be.visible');
    cy.get('#btn-toggle-classified-dossier').click();

    // Dossier content should show either the location or the undercover spy directive
    cy.get('#classified-dossier-card').should('be.visible');
    cy.get('#classified-dossier-card').then(($card) => {
      const text = $card.text();
      const isSpy = text.includes('UNDERCOVER SPY');
      const isLoyal = text.includes('LOYAL OPERATIVE');
      expect(isSpy || isLoyal).to.be.true;

      if (isSpy) {
        expect(text).to.include('UNKNOWN // CLASSIFIED');
      } else {
        expect(text).to.include('CONFIDENTIAL LOCATION ASSIGNMENT');
      }
    });
  });
});
