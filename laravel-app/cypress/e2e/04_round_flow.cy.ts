describe('A full round of Spy', () => {
    it('deals roles, runs a vote, reveals the result and plays on', () => {
        const stamp = Date.now();
        const host = `round_host_${stamp}@example.com`;
        const recruits = [
            `round_a_${stamp}@example.com`,
            `round_b_${stamp}@example.com`,
        ];

        cy.registerAgent('Round Host', host);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Roundtrip');
        cy.get('[data-tier="children"]').click();
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.get('#btn-start-round').should('be.disabled');

        cy.get('#game-invite-code')
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                recruits.forEach((email, index) => {
                    cy.clearCookies();
                    cy.registerAgent(`Recruit ${index}`, email);
                    cy.visit(`/games/spy?join=${code}`);
                    cy.get('#input-join-code').should('have.value', code);
                    cy.get('#btn-join-game').click();
                    cy.get('#roster-list', { timeout: 8000 })
                        .children()
                        .should('have.length', index + 2);
                });

                // The host deals the round.
                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);
                cy.get('#btn-start-round').should('not.be.disabled').click();
                cy.get('#game-status').should('contain', 'Round in progress');

                // A role stays sealed until revealed.
                cy.get('#role-spy').should('not.exist');
                cy.get('#role-loyalist').should('not.exist');
                cy.get('#btn-reveal-role').click();
                cy.get('#role-spy, #role-loyalist').should('have.length', 1);

                cy.get('#btn-start-voting').click();
                cy.get('#voting-panel').should('be.visible');
                cy.get('[data-suspect]').first().click();
                cy.get('#voting-panel').should('contain', '1 of 3 votes cast');

                // The last vote closes voting on its own.
                recruits.forEach((email) => {
                    cy.clearCookies();
                    cy.loginAgent(email);
                    cy.visit(`/games/${code}`);
                    cy.get('[data-suspect]').first().click();
                });

                cy.get('#round-results', { timeout: 8000 }).should(
                    'be.visible',
                );
                cy.get('#round-summary').should('not.be.empty');

                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);
                cy.get('#round-results').should('be.visible');
                cy.get('#btn-start-round')
                    .should('contain', 'Start next round')
                    .click();
                cy.get('#role-card').should('contain', 'Round 2');

                cy.get('#btn-reset-game').click();
                cy.get('#btn-confirm-ok').click();
                cy.get('#game-status').should('contain', 'Recruiting');
                cy.get('#role-card').should('not.exist');
            });
    });
});
