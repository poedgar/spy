import { computed } from 'vue';
import { useTrans } from '@/composables/useTrans';
import type { AgeTier, GameMode } from '@/types/game';

/** Display names for the game's enum values, in the current language. */
export function useGameLabels() {
    const { t } = useTrans();

    const modes = computed<
        Record<GameMode, { label: string; description: string }>
    >(() => ({
        mole: {
            label: t('The Mole'),
            description: t(
                'Classic spy: uncover the infiltrator before the location leaks.',
            ),
        },
        codebreaker: {
            label: t('Codebreaker'),
            description: t('Same rules, played against the clock.'),
        },
        counterintel: {
            label: t('Counter-Intel'),
            description: t(
                'Bigger tables, several sleeper agents working together.',
            ),
        },
    }));

    const tiers = computed<
        Record<AgeTier, { label: string; description: string }>
    >(() => ({
        children: {
            label: t('Children (5+)'),
            description: t('Simple, everyday places'),
        },
        teens: {
            label: t('Teens'),
            description: t('Moderately complex places'),
        },
        adults: {
            label: t('Adults'),
            description: t('Most complex and obscure places'),
        },
    }));

    return { modes, tiers };
}
