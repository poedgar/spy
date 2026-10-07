import { router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

export type Locale = 'en' | 'uk';

export interface Localized {
    en: string;
    uk: string;
}

/**
 * Laravel-style translation: English strings are their own keys, looked up
 * in the shared lang/{locale}.json bundle, with :placeholder replacement.
 */
export function useTrans() {
    const page = usePage();

    const locale = computed<Locale>(() =>
        page.props.locale === 'uk' ? 'uk' : 'en',
    );

    function t(
        key: string,
        replace: Record<string, string | number> = {},
    ): string {
        const translations = (page.props.translations ?? {}) as Record<
            string,
            string
        >;
        let line = translations[key] ?? key;

        for (const [name, value] of Object.entries(replace)) {
            line = line.replaceAll(`:${name}`, String(value));
        }

        return line;
    }

    /** Picks the current language's name from an { en, uk } pair. */
    function pick(value: Localized | null | undefined): string {
        return value ? value[locale.value] : '';
    }

    function setLocale(next: Locale): void {
        router.post(
            '/locale',
            { locale: next },
            { preserveScroll: true, preserveState: false },
        );
    }

    return { t, pick, locale, setLocale };
}
