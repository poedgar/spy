describe('Lobby controls', () => {
    it('lets the host approve a join request, hand over hosting and leave', () => {
        const stamp = Date.now();
        const host = `ctl_host_${stamp}@example.com`;
        const guest = `ctl_guest_${stamp}@example.com`;

        cy.registerAgent('Control Host', host);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Gatekeeper');
        cy.get('#input-requires-approval').check();
        cy.get('#btn-create-game').click();
        cy.get('#host-panel', { timeout: 8000 }).should('be.visible');
        cy.get('#toggle-approval').should('be.checked');

        cy.get('#game-invite-code')
            .invoke('text')
            .then((rawCode) => {
                const code = rawCode.trim();

                // The guest's code join becomes a request.
                cy.clearCookies();
                cy.registerAgent('Control Guest', guest);
                cy.visit(`/games/spy?join=${code}`);
                cy.get('#btn-join-game').click();
                cy.contains('Request sent').should('be.visible');
                cy.url().should('include', '/games/spy');

                // The host lets them in.
                cy.clearCookies();
                cy.loginAgent(host);
                cy.visit(`/games/${code}`);
                cy.get('#join-requests [data-action="approve"]').click();
                cy.get('#roster-list').children().should('have.length', 2);
                cy.get('#join-requests').should('not.exist');

                // The invite list only offers past teammates until you search.
                cy.visit(`/games/${code}/invite`);
                cy.get('#invite-users-list')
                    .children()
                    .should('have.length', 0);
                cy.get('#input-invite-search').type('Control Guest');
                cy.contains('Nobody matches that search.').should('be.visible'); // already on the roster

                // Hand hosting over, then leave.
                cy.visit(`/games/${code}`);
                cy.on('window:confirm', () => true);
                cy.get('[data-action="make-host"]').click();
                cy.get('#host-panel').should('not.exist');
                cy.get('#btn-leave-game').click();
                cy.url().should('include', '/games/spy');

                cy.clearCookies();
                cy.loginAgent(guest);
                cy.visit(`/games/${code}`);
                cy.get('#host-panel').should('be.visible');
                cy.get('#roster-list').children().should('have.length', 1);
            });
    });

    it('lets a player pick their own codename', () => {
        const email = `codename_${Date.now()}@example.com`;
        const codename = `AGENT_${Date.now() % 1000000}`;

        cy.registerAgent('Codename Picker', email);
        cy.visit('/settings/profile');
        cy.get('#codename').clear().type(codename.toLowerCase());
        cy.get('[data-test="update-profile-button"]').click();
        cy.contains('Profile updated.').should('be.visible');
        cy.reload();
        cy.get('#codename').should('have.value', codename);
    });
});
