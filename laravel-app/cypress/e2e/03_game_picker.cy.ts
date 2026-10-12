describe('Game picker', () => {
    it('shows Spy, Phrase and Sing It Out as playable', () => {
        const email = `picker_${Date.now()}@example.com`;
        cy.registerAgent('Picker Tester', email);

        // registerAgent lands on /dashboard, which is now the picker.
        cy.get('#tile-spy')
            .should('be.visible')
            .and('have.attr', 'href', '/games/spy');
        cy.get('#tile-phrase').should('have.attr', 'href', '/games/phrase');
        cy.get('#tile-song').should('have.attr', 'href', '/games/song');

        cy.get('#tile-spy').click();
        cy.url().should('include', '/games/spy');
        cy.get('#input-game-title').should('be.visible');
    });
});
