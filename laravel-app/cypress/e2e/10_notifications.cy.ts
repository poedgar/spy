describe('Notifications', () => {
    it('shows an invitation in the bell and opens it', () => {
        const stamp = Date.now();
        const inviteeName = `Bell Invitee ${stamp}`;
        const invitee = `bell_inv_${stamp}@example.com`;

        cy.registerAgent(inviteeName, invitee);
        cy.get('#notification-bell').should('be.visible');
        cy.get('#notification-count').should('not.exist');

        cy.clearCookies();
        cy.registerAgent('Bell Host', `bell_host_${stamp}@example.com`);
        cy.visit('/games/phrase');
        cy.get('#input-phrase-title').type('Bell Game');
        cy.get('#btn-create-phrase').click();
        cy.get('#btn-invite-players', { timeout: 8000 }).click();
        cy.get('#input-invite-search').type(inviteeName);
        cy.get(`#invite-users-list li[data-user-name="${inviteeName}"]`)
            .contains('button', 'Invite')
            .click();
        cy.contains('Invited').should('exist');

        cy.clearCookies();
        cy.loginAgent(invitee);
        cy.get('#notification-count').should('have.text', '1');
        cy.get('#notification-bell').click();
        cy.get('[data-notification="invitation"]')
            .should('contain', 'invited you to Bell Game')
            .click();

        // Phrase invitations open the Phrase home, where the invitation waits.
        cy.url().should('include', '/games/phrase');
        cy.get('#pending-invitations').should('contain', 'Bell Game');
        cy.get('#notification-count').should('not.exist');
    });
});
