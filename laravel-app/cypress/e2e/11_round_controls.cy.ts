describe('Round controls', () => {
    it('times a phrase round, reveals it, keeps history and closes the game', () => {
        const stamp = Date.now();
        const host = `ctl2_host_${stamp}@example.com`;

        cy.registerAgent('Timer Host', host);
        cy.visit('/games/phrase');
        cy.get('#input-phrase-title').type('Timed Words');
        cy.get('#input-round-seconds').select('5 minutes');
        cy.get('#btn-create-phrase').click();
        cy.get('#lobby-header', { timeout: 8000 }).should(
            'contain',
            '5 min rounds',
        );

        cy.get('#game-invite-code')
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                [0, 1].forEach((index) => {
                    cy.clearCookies();
                    cy.registerAgent(
                        `Timer Player ${index}`,
                        `ctl2_p${index}_${stamp}@example.com`,
                    );
                    cy.visit(`/games/phrase?join=${code}`);
                    cy.get('#btn-join-game').click();
                    cy.get('#roster-list', { timeout: 8000 }).should('exist');
                });

                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);

                cy.get('#btn-start-phrase').click();
                cy.get('#round-timer').should('contain', '4:5');

                cy.get('#btn-reveal-phrase').click();
                cy.get('#btn-confirm-ok').click();
                cy.get('#phrase-results').should(
                    'contain',
                    'Nobody guessed it',
                );
                cy.get('#revealed-phrase')
                    .invoke('text')
                    .should('not.be.empty');

                cy.get('#btn-start-phrase').click();
                cy.get('#round-history')
                    .should('contain', 'Round 1')
                    .and('contain', 'Nobody guessed it');

                cy.get('#btn-close-game').click();
                cy.get('#btn-confirm-ok').click();
                cy.url().should('include', '/games/phrase');

                // A player who still has the lobby open is sent home.
                cy.clearCookies();
                cy.loginAgent(`ctl2_p0_${stamp}@example.com`);
                cy.visit(`/games/${code}`);
                cy.url().should('include', '/dashboard');
                cy.contains('That game is no longer available.').should(
                    'be.visible',
                );
            });
    });
});
