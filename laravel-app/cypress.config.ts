import { execFileSync } from 'node:child_process';
import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:8000',
        viewportWidth: 1280,
        viewportHeight: 800,
        video: false,
        screenshotOnRunFailure: true,
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        setupNodeEvents(on) {
            on('task', {
                // No player can see a Phrase game's phrase, so the spec
                // reads it from the database to make the winning guess.
                phraseFor(code: string): string {
                    if (!/^SPY-[A-Z0-9]{4}$/.test(code)) {
                        throw new Error(`Not an invite code: ${code}`);
                    }

                    return execFileSync(
                        'php',
                        [
                            'artisan',
                            'tinker',
                            `--execute=echo App\\Models\\Game::where('code', '${code}')->first()->currentPhraseRound->text();`,
                        ],
                        { encoding: 'utf8' },
                    ).trim();
                },
            });
        },
    },
});
