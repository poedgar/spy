describe('SpyNet Terminal - Direct Invitation Link Flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('detects invitation code from URL and shows Priority Invitation banner on sign in', () => {
    // Visit site with an invitation query parameter
    cy.visit('/?join=OP-TEST-7788');

    // Sign in screen should highlight the priority invitation
    cy.get('#invitation-banner').should('be.visible');
    cy.contains('PRIORITY INVITATION DETECTED').should('be.visible');
    cy.contains('OP-TEST-7788').should('be.visible');
    cy.get('#btn-authenticate').should('contain', 'Accept Invite & Authenticate');
  });

  it('allows an invited agent to authenticate and join an existing operation directly', () => {
    // 1. Host creates a game
    cy.loginAsAgent('Host_Falcon', 'SecretFalcon123');
    cy.createNewGame('Operation Nightfall');

    // Extract the game ID from the invite link
    cy.get('#btn-open-invite-modal').click();
    cy.get('#invite-url-input')
      .invoke('val')
      .then((inviteUrl) => {
        const url = new URL(inviteUrl as string);
        const gameId = url.searchParams.get('join') || url.searchParams.get('game');
        expect(gameId).to.be.ok;

        // 2. Sign out or clear session to simulate a new invited user arriving
        cy.clearLocalStorage();

        // 3. Invited operative visits via the invite link
        cy.visit(`/?join=${gameId}`);
        cy.get('#invitation-banner').should('be.visible');

        // 4. Authenticate as the recruit
        cy.get('#input-username').type('Recruit_Ghost');
        cy.get('#input-password').type('GhostPassCode99!');
        cy.get('#btn-authenticate').click();

        // 5. Verify direct landing in the game lobby as recruit
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.contains('Operation Nightfall').should('be.visible');
        cy.get('#operatives-roster').should('contain', 'Recruit_Ghost');
      });
  });
});
