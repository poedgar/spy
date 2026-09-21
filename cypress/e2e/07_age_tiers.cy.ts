import { getLocationPoolSize, getLocationsForTier } from '../../src/data/locations';

describe('SpyNet Terminal - Age Tier Location Difficulty', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginAsAgent('Tier_Tester', 'TierPass1234');
    cy.get('#btn-create-game-trigger').click();
    cy.get('#create-game-modal-card').should('be.visible');
  });

  it('defaults to Adults and updates the location pool size as the tier changes', () => {
    const adultsCount = getLocationPoolSize('adults');
    const teensCount = getLocationPoolSize('teens');
    const childrenCount = getLocationPoolSize('children');

    // Adults is the default (full pool, preserves pre-existing behavior)
    cy.get('#age-tier-pool-count').should('contain', String(adultsCount));

    cy.get('#btn-tier-children').click();
    cy.get('#age-tier-pool-count').should('contain', String(childrenCount));

    cy.get('#btn-tier-teens').click();
    cy.get('#age-tier-pool-count').should('contain', String(teensCount));

    cy.get('#btn-tier-adults').click();
    cy.get('#age-tier-pool-count').should('contain', String(adultsCount));
  });

  it('launches a Children-tier game and assigns a location from the children pool', () => {
    const childrenLocationNames = new Set(getLocationsForTier('children').map((l) => l.en));

    cy.get('#btn-tier-children').click();
    cy.get('#create-game-modal-card input').first().clear().type('Operation Playground');
    cy.get('#btn-confirm-create-game').click();
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

    // 3 players (host + 2 bots) to launch
    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').click();
    cy.contains('MISSION ACTIVE // INTERROGATION PHASE', { timeout: 6000 }).should('be.visible');

    cy.window().then((win) => {
      const games = JSON.parse(win.localStorage.getItem('spynet_active_games') || '[]');
      const game = games.find((g: any) => g.title === 'Operation Playground');
      expect(game, 'created game should be in local storage').to.exist;
      expect(game.ageTier, 'stored game should record the chosen age tier').to.equal('children');
      expect(
        childrenLocationNames.has(game.selectedLocation),
        `assigned location "${game.selectedLocation}" should belong to the children pool`
      ).to.be.true;
    });
  });

  it('launches a Teens-tier game and assigns a location from the teens pool', () => {
    const teensLocationNames = new Set(getLocationsForTier('teens').map((l) => l.en));

    cy.get('#btn-tier-teens').click();
    cy.get('#create-game-modal-card input').first().clear().type('Operation Schoolyard');
    cy.get('#btn-confirm-create-game').click();
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

    cy.get('#btn-add-two-bots').click();
    cy.get('#btn-launch-operation').click();
    cy.contains('MISSION ACTIVE // INTERROGATION PHASE', { timeout: 6000 }).should('be.visible');

    cy.window().then((win) => {
      const games = JSON.parse(win.localStorage.getItem('spynet_active_games') || '[]');
      const game = games.find((g: any) => g.title === 'Operation Schoolyard');
      expect(game, 'created game should be in local storage').to.exist;
      expect(game.ageTier).to.equal('teens');
      expect(
        teensLocationNames.has(game.selectedLocation),
        `assigned location "${game.selectedLocation}" should belong to the teens pool`
      ).to.be.true;
    });
  });
});
