describe('Open games', () => {
    it('lets a player find a game, ask to join, and get let in', () => {
        const stamp = Date.now();
        const host = `open_host_${stamp}@example.com`;
        const seeker = `open_seeker_${stamp}@example.com`;
        const title = `Open Table ${stamp}`;

        cy.registerAgent('Open Host', host);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type(title);
        cy.get('#input-is-listed').should('be.checked');
        cy.get('#btn-create-game').click();
        cy.get('#game-invite-code', { timeout: 8000 })
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                // A stranger finds it without a code or an invitation.
                cy.clearCookies();
                cy.registerAgent('Open Seeker', seeker);
                cy.visit('/games/spy');
                cy.get(`[data-open-game="${code}"]`)
                    .should('contain', title)
                    .find('[data-action="request-join"]')
                    .click();
                cy.contains('Request sent').should('be.visible');
                cy.get(`[data-open-game="${code}"]`).should(
                    'contain',
                    'Requested',
                );

                // The host lets them in.
                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);
                cy.get('#join-requests [data-action="approve"]').click();
                cy.get('#roster-list').children().should('have.length', 2);

                // Unlisting hides it from everyone else.
                cy.get('#toggle-listed').uncheck();
                cy.get('#toggle-listed').should('not.be.checked');

                cy.clearCookies();
                cy.loginAgent(seeker);
                cy.visit(`/games/${code}`);
                cy.get('#lobby-header').should('contain', title);
                cy.visit('/games/spy');
                cy.get(`[data-open-game="${code}"]`).should('not.exist');
            });
    });
});
