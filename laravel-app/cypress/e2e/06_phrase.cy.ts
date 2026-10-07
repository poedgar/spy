describe('A game of Phrase', () => {
    it('deals words, tracks turns, and ends on the right guess', () => {
        const stamp = Date.now();
        const host = `phrase_host_${stamp}@example.com`;
        const players = [
            `phrase_a_${stamp}@example.com`,
            `phrase_b_${stamp}@example.com`,
        ];

        cy.registerAgent('Phrase Host', host);
        cy.get('#tile-phrase').click();
        cy.get('#input-phrase-title').type('Word Play');
        cy.get('[data-phrase-language="en"]').click();
        cy.get('#btn-create-phrase').click();
        cy.get('#lobby-header', { timeout: 8000 }).should(
            'contain',
            'Word Play',
        );

        cy.get('#game-invite-code')
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                players.forEach((email, index) => {
                    cy.clearCookies();
                    cy.registerAgent(`Player ${index}`, email);
                    cy.visit(`/games/phrase?join=${code}`);
                    cy.get('#btn-join-game').click();
                    cy.get('#roster-list', { timeout: 8000 })
                        .children()
                        .should('have.length', index + 2);
                });

                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);
                cy.get('#btn-start-phrase').click();
                cy.get('#game-status').should('contain', 'Round in progress');

                cy.get('#my-word').should('not.exist');
                cy.get('#btn-reveal-word').click();
                cy.get('#my-word').invoke('text').should('not.be.empty');
                cy.get('#current-asker').should('not.be.empty');

                // The host can always move the turn on.
                cy.get('#btn-pass-turn').click();
                cy.get('#current-asker').should('not.be.empty');

                cy.get('#input-phrase-guess').type('this is surely wrong');
                cy.get('#btn-guess-phrase').click();
                cy.get('#guess-log').should('contain', 'this is surely wrong');
                cy.get('#roster-list').should('contain', '-1 pts');

                // No player can see the phrase, so read it from the database.
                cy.task<string>('phraseFor', code).then((phrase) => {
                    cy.get('#input-phrase-guess').type(phrase.toLowerCase());
                    cy.get('#btn-guess-phrase').click();
                    cy.get('#phrase-results', { timeout: 8000 }).should(
                        'be.visible',
                    );
                    cy.get('#revealed-phrase').should('contain', phrase);
                    cy.get('#roster-list').should('contain', '2 pts');
                    cy.get('#btn-start-phrase').should(
                        'contain',
                        'Deal the next phrase',
                    );
                });
            });
    });
});
