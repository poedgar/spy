import type { Emotion, EmotionLevel } from '@/api/types';

type Translate = (key: string, replace?: Record<string, string | number>) => string;

/** Display names for the emotions on offer, in the current language. */
export function emotionLabels(t: Translate): Record<Emotion, string> {
  return {
    joy: t('Joy'),
    sadness: t('Sadness'),
    anger: t('Anger'),
    fear: t('Fear'),
    surprise: t('Surprise'),
    disgust: t('Disgust'),
    neutral: t('Neutral'),
  };
}

export function emotionLevelLabels(t: Translate): Record<EmotionLevel, { label: string; description: string }> {
  return {
    1: { label: t('Easy'), description: t('Clear expressions, 4 options') },
    2: { label: t('Medium'), description: t('Subtler expressions, 6 options') },
    3: { label: t('Hard'), description: t('The subtlest expressions, all 7 options') },
  };
}
