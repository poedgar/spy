describe('Game invitations (non-realtime path)', () => {
    it('lets a host invite a specific user, who sees it on their dashboard, accepts, and lands in the lobby', () => {
        const suffix = Date.now();
        const hostEmail = `host_${suffix}@example.com`;
        const recruitEmail = `recruit_${suffix}@example.com`;
        // Unique per run so this never collides with another spec's fixture
        // data (e.g. 01_auth_and_lobby.cy.ts also registers a "Recruit Ghost").
        const recruitName = `Recruit Echo ${suffix}`;
        const hostName = `Host Falcon ${suffix}`;

        // The invited user registers FIRST, so they exist as a candidate on the invite page.
        cy.registerAgent(recruitName, recruitEmail);
        cy.clearCookies();

        // Host registers, creates a game, opens the invite page.
        cy.registerAgent(hostName, hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Signal');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        // The invite-candidates list is shared across every spec in a CI run
        // (same database), and only shows `codename` (drawn from a pool of
        // just 6 words) — never `name` — so select the recruit's row by the
        // `name`-carrying data attribute, the one value guaranteed unique to
        // this test run, rather than by visible text.
        cy.get(`#invite-users-list li[data-user-name="${recruitName}"]`).within(
            () => {
                cy.contains('button', 'Invite').click();
            },
        );
        cy.get(`#invite-users-list li[data-user-name="${recruitName}"]`)
            .contains('Invited')
            .should('exist');

        // The recruit logs in on the same browser (simulating a later visit) and sees the invite.
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.visit('/games/spy');
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('Operation Signal');
        cy.get('#pending-invitations').contains('button', 'Accept').click();

        // Accepting redirects into the lobby with the recruit now on the roster.
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.get('#roster-list').children().should('have.length', 2);
    });

    it('lets a recipient decline an invitation, which then disappears from their dashboard', () => {
        const suffix = Date.now();
        const hostEmail = `host2_${suffix}@example.com`;
        const recruitEmail = `recruit2_${suffix}@example.com`;
        const recruitName = `Recruit Ghost ${suffix}`;
        const hostName = `Host Echo ${suffix}`;

        cy.registerAgent(recruitName, recruitEmail);
        cy.clearCookies();

        cy.registerAgent(hostName, hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Quiet');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        cy.get(`#invite-users-list li[data-user-name="${recruitName}"]`).within(
            () => {
                cy.contains('button', 'Invite').click();
            },
        );

        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.visit('/games/spy');
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('button', 'Decline').click();

        cy.get('#pending-invitations').should('not.exist');
    });
});
