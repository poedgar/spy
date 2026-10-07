describe('Ukrainian language', () => {
    it('switches the interface and remembers the choice on the account', () => {
        const email = `lang_${Date.now()}@example.com`;

        cy.visit('/login');
        cy.get('[data-locale="uk"]').click();
        cy.get('[data-test="login-button"]').should('contain', 'Увійти');

        cy.get('[data-locale="en"]').click();
        cy.registerAgent('Lang Agent', email);
        cy.get('[data-locale="uk"]').click();
        cy.contains('h1', 'Оберіть гру').should('be.visible');

        // Saved on the account, so a fresh session comes back in Ukrainian.
        cy.clearCookies();
        cy.loginAgent(email);
        cy.contains('h1', 'Оберіть гру').should('be.visible');

        cy.visit('/locations');
        cy.contains('Довідник локацій').should('be.visible');
        cy.get('input[type="search"]').type('Замок');
        cy.contains('Замок').should('be.visible');
    });
});
