describe('Game invitations (non-realtime path)', () => {
    it('lets a host invite a specific user, who sees it on their dashboard, accepts, and lands in the lobby', () => {
        const hostEmail = `host_${Date.now()}@example.com`;
        const recruitEmail = `recruit_${Date.now()}@example.com`;

        // The invited user registers FIRST, so they exist as a candidate on the invite page.
        cy.registerAgent('Recruit Echo', recruitEmail);
        cy.clearCookies();

        // Host registers, creates a game, opens the invite page.
        cy.registerAgent('Host Falcon', hostEmail);
        cy.get('#input-game-title').type('Operation Signal');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        cy.contains('#invite-users-list li', 'Invite')
            .first()
            .within(() => {
                cy.contains('button', 'Invite').click();
            });
        cy.contains('#invite-users-list li', 'Invited').should('exist');

        // The recruit logs in on the same browser (simulating a later visit) and sees the invite.
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('Operation Signal');
        cy.get('#pending-invitations').contains('a', 'Accept').click();

        // Accepting redirects into the lobby with the recruit now on the roster.
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.get('#roster-list').children().should('have.length', 2);
    });

    it('lets a recipient decline an invitation, which then disappears from their dashboard', () => {
        const hostEmail = `host2_${Date.now()}@example.com`;
        const recruitEmail = `recruit2_${Date.now()}@example.com`;

        cy.registerAgent('Recruit Ghost', recruitEmail);
        cy.clearCookies();

        cy.registerAgent('Host Echo', hostEmail);
        cy.get('#input-game-title').type('Operation Quiet');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        cy.contains('#invite-users-list li', 'Invite')
            .first()
            .within(() => {
                cy.contains('button', 'Invite').click();
            });

        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('a', 'Decline').click();

        cy.get('#pending-invitations').should('not.exist');
    });
});
