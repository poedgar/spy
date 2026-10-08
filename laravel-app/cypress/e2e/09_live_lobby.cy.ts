describe('Live lobby', () => {
    // Passes with a realtime server (the player.joined event) and without one
    // (the lobby polls while the socket is down), so it runs in CI as is.
    it('shows an invitee who accepts in the host lobby without a reload', () => {
        const stamp = Date.now();
        const inviteeName = `Live Invitee ${stamp}`;

        cy.request('POST', '/api/v1/auth/register', {
            name: inviteeName,
            email: `live_inv_${stamp}@example.com`,
            password: 'password123',
            password_confirmation: 'password123',
            device_name: 'cypress',
        })
            .its('body.token')
            .as('token');

        cy.registerAgent('Live Host', `live_host_${stamp}@example.com`);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Live Op');
        cy.get('#btn-create-game').click();
        cy.get('#game-invite-code')
            .invoke('text')
            .then((raw) => {
                const code = raw.trim();
                cy.visit(`/games/${code}/invite`);
                cy.get('#input-invite-search').type(inviteeName);
                cy.get(`#invite-users-list li[data-user-name="${inviteeName}"]`)
                    .contains('button', 'Invite')
                    .click();
                cy.contains('Invited').should('exist');

                cy.visit(`/games/${code}`);
                cy.get('#roster-list').children().should('have.length', 1);
                cy.wait(1500); // let the private channel subscription finish

                cy.get('@token').then((token) => {
                    const auth = {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    };
                    cy.request({ url: '/api/v1/games/spy', headers: auth })
                        .its('body.pending_invitations.0.id')
                        .then((id) =>
                            cy.request({
                                method: 'POST',
                                url: `/api/v1/invitations/${id}/accept`,
                                headers: auth,
                            }),
                        );
                });

                // No reload: the roster must update live.
                cy.get('#roster-list', { timeout: 12000 })
                    .children()
                    .should('have.length', 2);
            });
    });
});
