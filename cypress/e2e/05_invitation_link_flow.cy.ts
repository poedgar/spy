describe('SpyNet Terminal - Direct Invitation Link Flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('detects invitation code from URL and shows Priority Invitation banner on sign in', () => {
    // Visit site with an invitation query parameter
    cy.visit('/?join=OP-TEST-7788');

    // Sign in screen should highlight the priority invitation
    cy.get('#invitation-banner').should('be.visible');
    cy.contains('PRIORITY INVITATION DETECTED').should('be.visible');
    cy.contains('OP-TEST-7788').should('be.visible');
    cy.get('#btn-authenticate').should('contain', 'Accept Invite & Authenticate');
  });

  it('allows an invited agent to authenticate and join an existing operation directly', () => {
    // 1. Host creates a game
    cy.loginAsAgent('Host_Falcon', 'SecretFalcon123');
    cy.createNewGame('Operation Nightfall');

    // Extract the game ID from the invite link
    cy.get('#btn-open-invite-modal').click();
    cy.get('#invite-url-input')
      .invoke('val')
      .then((inviteUrl) => {
        const url = new URL(inviteUrl as string);
        const gameId = url.searchParams.get('join') || url.searchParams.get('game');
        expect(gameId).to.be.ok;

        // DIAGNOSTIC: confirm the write actually reached Firestore, bypassing
        // the app's own SDK, by hitting the REST API directly.
        const restUrl = `https://firestore.googleapis.com/v1/projects/psychoplay/databases/ai-studio-spy-2bdeba50-056f-42ee-8cdf-d659acdc72a2/documents/games/${gameId}?key=AIzaSyDlAOWyRFn473weJhmLlFeE0GweuQCeeLQ`;
        cy.wait(1500);
        cy.request({ method: 'GET', url: restUrl, failOnStatusCode: false }).then((writeCheck) => {
          // 2. Sign out or clear session to simulate a new invited user arriving
          cy.clearLocalStorage();

          // 3. Invited operative visits via the invite link
          cy.visit(`/?join=${gameId}`);
          cy.get('#invitation-banner').should('be.visible');

          // 4. Authenticate as the recruit
          cy.get('#input-username').type('Recruit_Ghost');
          cy.get('#input-password').type('GhostPassCode99!');
          cy.get('#btn-authenticate').click();

          cy.wait(4000);
          cy.request({ method: 'GET', url: restUrl, failOnStatusCode: false }).then((readCheck) => {
            // Now check whether the UI actually reflects the confirmed-successful
            // server-side join, and dump localStorage's view of the game too.
            cy.get('body').then(($body) => {
              const lobbyFound = $body.find('#lobby-header').length > 0;
              cy.window().then((win) => {
                let storedGames: unknown = null;
                try {
                  storedGames = JSON.parse(win.localStorage.getItem('spynet_active_games') || 'null');
                } catch {
                  storedGames = 'PARSE_ERROR';
                }
                throw new Error(
                  `DIAGNOSTIC gameId=${gameId} lobbyHeaderFound=${lobbyFound} ` +
                    `bodyHTMLSnippet=${$body.text().slice(0, 300)} ` +
                    `writeCheck(status=${writeCheck.status}) ` +
                    `readCheck(status=${readCheck.status}, players=${JSON.stringify(
                      readCheck.body?.fields?.players?.arrayValue?.values?.map(
                        (v: any) => v.mapValue.fields.username.stringValue
                      )
                    )}) ` +
                    `localStorageGames=${JSON.stringify(storedGames)}`
                );
              });
            });
          });
        });
      });
  });
});
