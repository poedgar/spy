describe('SpyNet Terminal - Guessing Phase, Accusation Voting & Scoring Rules', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginAsAgent('Director_Shepard', 'DirectorSecretPass44');
    cy.createNewGame('Operation Checkmate');

    // Add 2 bots and launch
    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').click();
    cy.contains('MISSION ACTIVE // INTERROGATION PHASE', { timeout: 6000 }).should('be.visible');
  });

  it('allows the game creator to initiate the Guessing Phase', () => {
    cy.get('#btn-start-guessing-phase-active').should('be.visible').click();

    // Verify voting phase card appears
    cy.get('#voting-phase-card', { timeout: 6000 }).should('be.visible');
    cy.contains('Guessing Phase // Accuse The Spy').should('be.visible');
    cy.contains('CASE A: False Accusation').should('be.visible');
    cy.contains('CASE B: Spy Apprehended').should('be.visible');
  });

  it('allows participants to cast accusations, tally votes, and declare the Spy', () => {
    // Start Guessing Phase
    cy.get('#btn-start-guessing-phase-active').click();
    cy.get('#voting-phase-card').should('be.visible');

    // Select a suspect (first operative button in suspects list that is not the user itself)
    cy.get('#voting-phase-card button').filter(':contains("@bot_")').first().click();

    // Lock in accusation
    cy.get('#btn-confirm-cast-vote').should('not.be.disabled').click();
    cy.contains('Accusation Locked for').should('be.visible');

    // Host tallies votes and concludes operation
    cy.get('#btn-tally-votes-conclude').click();

    // Verify debrief results card
    cy.get('#operation-results-card', { timeout: 6000 }).should('be.visible');
    cy.contains('MISSION OUTCOME // VERDICT REACHED').should('be.visible');

    // Check Intel Triad Dossier
    cy.contains('DECLARED SPY (MOST ACCUSATIONS)').should('be.visible');
    cy.contains('TRUE UNDERCOVER SPY / SPIES').should('be.visible');
    cy.contains('CLASSIFIED LOCATION WAS').should('be.visible');

    // Check Votes Cast Ledger
    cy.contains('Votes Cast Ledger').should('be.visible');

    // Check Cumulative Scoreboard with 1 pt awarded to winners
    cy.contains('Cumulative Scoreboard & Points Leaderboard').should('be.visible');
    cy.contains('1 point per victory').should('be.visible');
    cy.contains('1 pts').should('be.visible');
  });

  it('allows host to start the next round while preserving cumulative player points', () => {
    // Run round 1 to conclusion
    cy.get('#btn-start-guessing-phase-active').click();
    cy.get('#voting-phase-card button').filter(':contains("@bot_")').first().click();
    cy.get('#btn-confirm-cast-vote').click();
    cy.get('#btn-tally-votes-conclude').click();
    cy.get('#operation-results-card').should('be.visible');

    // Start Next Round (Keep Points)
    cy.get('#btn-start-next-round').click();

    // Verify game starts again in active state
    cy.contains('MISSION ACTIVE // INTERROGATION PHASE', { timeout: 6000 }).should('be.visible');

    // Verify score is retained on player card in roster
    cy.get('#operatives-roster').should('contain', 'pts');
  });
});
