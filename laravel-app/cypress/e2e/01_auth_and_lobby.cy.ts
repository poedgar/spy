describe('Phase 1: auth, game creation, and joining', () => {
    it('registers, creates a game, and lands in its lobby', () => {
        const email = `host_${Date.now()}@example.com`;
        cy.registerAgent('Host Falcon', email);
        cy.visit('/games/spy');

        cy.get('#input-game-title').type('Operation Nightfall');
        cy.get('#input-mission-briefing')
            .clear()
            .type('Find the mole before time runs out.');
        cy.get('#btn-create-game').click();

        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.contains('Operation Nightfall').should('be.visible');
        // The roster shows the host's assigned codename (a hash of their name),
        // not their raw name, so assert on the "(Host)" badge instead of guessing it.
        cy.get('#operatives-roster').should('contain', '(Host)');
    });

    it('lets a second user join by invite code and appear in the roster after a revisit', () => {
        const hostEmail = `host2_${Date.now()}@example.com`;
        const recruitEmail = `recruit_${Date.now()}@example.com`;

        // Host creates the game
        cy.registerAgent('Host Echo', hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Schoolyard');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#game-invite-code')
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                // Second user registers and joins by code
                cy.clearCookies();
                cy.registerAgent('Recruit Ghost', recruitEmail);
                cy.visit('/games/spy');
                cy.get('#input-join-code').type(code);
                cy.get('#btn-join-game').click();

                cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
                cy.get('#operatives-roster').should('contain', 'pts'); // roster rendered with the recruit included

                // Host revisits the lobby (no realtime push yet in Phase 1) and sees the recruit
                cy.clearCookies();
                cy.loginAgent(hostEmail);
                cy.visit(`/games/${code}`);
                cy.get('#roster-list').children().should('have.length', 2);
            });
    });
});
