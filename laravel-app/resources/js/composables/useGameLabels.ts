import { computed } from 'vue';
import { useTrans } from '@/composables/useTrans';
import type { AgeTier, Emotion, EmotionLevel, GameMode } from '@/types/game';

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

    const emotions = computed<Record<Emotion, string>>(() => ({
        joy: t('Joy'),
        sadness: t('Sadness'),
        anger: t('Anger'),
        fear: t('Fear'),
        surprise: t('Surprise'),
        disgust: t('Disgust'),
        neutral: t('Neutral'),
    }));

    const emotionLevels = computed<
        Record<EmotionLevel, { label: string; description: string }>
    >(() => ({
        1: {
            label: t('Easy'),
            description: t('Clear expressions, 4 options'),
        },
        2: {
            label: t('Medium'),
            description: t('Subtler expressions, 6 options'),
        },
        3: {
            label: t('Hard'),
            description: t('The subtlest expressions, all 7 options'),
        },
    }));

    return { modes, tiers, emotions, emotionLevels };
}
