describe('Localization & Ukrainian Language Support', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('allows switching between English and Ukrainian on the login screen', () => {
    // Starts in English by default
    cy.get('#btn-lang-en').should('have.class', 'bg-emerald-500');
    cy.contains('Operative Sign In').should('be.visible');

    // Switch to Ukrainian
    cy.get('#btn-lang-uk').click();
    cy.get('#btn-lang-uk').should('have.class', 'bg-emerald-500');
    cy.contains('Вхід для оперативника').should('be.visible');
    cy.contains('ПОЗИВНИЙ АГЕНТА / ІМ’Я').should('be.visible');
    cy.contains('КОД ДОСТУПУ').should('be.visible');

    // Switch back to English
    cy.get('#btn-lang-en').click();
    cy.contains('Operative Sign In').should('be.visible');
  });

  it('maintains Ukrainian language across dashboard and location browsing', () => {
    // Authenticate
    cy.get('#btn-demo-credentials-007').click();
    cy.get('#btn-authenticate').click();

    // Verify Dashboard loaded
    cy.get('#btn-create-game-trigger').should('be.visible');

    // Switch to Ukrainian
    cy.get('#btn-lang-uk').click();
    cy.contains('Командний центр').should('be.visible');
    cy.contains('Створити нову шпигунську гру').should('be.visible');

    // Open Locations Guide modal from top bar
    cy.get('#btn-locations-guide-top').click();
    cy.contains('Довідкова база локацій').should('be.visible');
    cy.contains('500 перевірених місць').should('be.visible');

    // Search for a Ukrainian location like "Замок"
    cy.get('input[placeholder*="Пошук серед 500 локацій"]').type('Замок');
    cy.contains('Замок').should('be.visible');

    // Clear search
    cy.contains('Очистити').click();

    // Search for an English term like "Castle" and verify cross-language search works
    cy.get('input[placeholder*="Пошук серед 500 локацій"]').type('Castle');
    cy.contains('Castle').should('be.visible');
    cy.contains('Замок').should('be.visible');

    // Close guide
    cy.contains('Закрити довідник').click();
  });

  it('creates an operation in Ukrainian and verifies localized lobby', () => {
    // Authenticate and switch to Ukrainian
    cy.get('#btn-demo-credentials-007').click();
    cy.get('#btn-authenticate').click();
    cy.get('#btn-lang-uk').click();

    // Open Create Game Modal
    cy.get('#btn-create-game-trigger').click();
    cy.contains('Створити нову шпигунську операцію').should('be.visible');
    cy.contains('БАЗА 500 ЛОКАЦІЙ').should('be.visible');
    cy.contains('Попередній перегляд').should('be.visible');

    // Create the game
    cy.get('#btn-confirm-create-game').click();

    // Verify in Game Lobby with Ukrainian strings
    cy.get('#game-lobby-view').should('be.visible');
    cy.contains('Штаб місії').should('be.visible');
    cy.contains('НАБІР ОПЕРАТИВНИКІВ').should('be.visible');
    cy.contains('Шпигунський протокол та розподіл локацій').should('be.visible');

    // Open invitation modal
    cy.get('#btn-open-invite-modal').click();
    cy.contains('ЗАХИЩЕНА ПЕРЕДАЧА').should('be.visible');
    cy.contains('СЕКРЕТНЕ ПОСИЛАННЯ ДЛЯ ЗАПРОШЕННЯ').should('be.visible');
    cy.get('#btn-done-invite').click();
  });
});
