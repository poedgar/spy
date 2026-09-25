// Replicates App\Support\CodenameGenerator::forName() so the spec can find
// the exact recruit's row in the invite-candidates list (which renders only
// `codename`, not `name`) without depending on list position — the DB is
// shared across every spec in a CI run, so other specs' fixture users are
// always present as extra, unrelated candidates.
const CODENAMES = [
    'SHADOW_FOX',
    'NIGHT_HAWK',
    'CIPHER_NINE',
    'GHOST_PROTOCOL',
    'VIPER_ONE',
    'COVERT_RAVEN',
];

function codenameFor(name: string): string {
    const sum = name
        .split('')
        .reduce((total, char) => total + char.charCodeAt(0), 0);
    return CODENAMES[sum % CODENAMES.length];
}

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
        cy.get('#input-game-title').type('Operation Signal');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        cy.contains('#invite-users-list li', codenameFor(recruitName)).within(
            () => {
                cy.contains('button', 'Invite').click();
            },
        );
        cy.contains('#invite-users-list li', 'Invited').should('exist');

        // The recruit logs in on the same browser (simulating a later visit) and sees the invite.
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
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
        cy.get('#input-game-title').type('Operation Quiet');
        cy.get('#input-mission-briefing').clear().type('Find the mole.');
        cy.get('#btn-create-game').click();
        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

        cy.get('#btn-invite-players').click();
        cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
        cy.contains('#invite-users-list li', codenameFor(recruitName)).within(
            () => {
                cy.contains('button', 'Invite').click();
            },
        );

        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('button', 'Decline').click();

        cy.get('#pending-invitations').should('not.exist');
    });
});
