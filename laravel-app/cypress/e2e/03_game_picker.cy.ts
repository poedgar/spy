describe('Game picker', () => {
    it('shows Spy and Phrase as playable and the last slot as coming soon', () => {
        const email = `picker_${Date.now()}@example.com`;
        cy.registerAgent('Picker Tester', email);

        // registerAgent lands on /dashboard, which is now the picker.
        cy.get('#tile-spy')
            .should('be.visible')
            .and('have.attr', 'href', '/games/spy');
        cy.get('#tile-phrase').should('have.attr', 'href', '/games/phrase');
        cy.get('.tile-coming-soon').should('have.length', 1);
        cy.get('.tile-coming-soon').first().click();
        cy.url().should('include', '/dashboard');

        cy.get('#tile-spy').click();
        cy.url().should('include', '/games/spy');
        cy.get('#input-game-title').should('be.visible');
    });
});
