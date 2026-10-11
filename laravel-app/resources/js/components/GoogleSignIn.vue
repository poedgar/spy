<script setup lang="ts">
import { ref } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTrans } from '@/composables/useTrans';
import { jsonFetch } from '@/lib/jsonFetch';

/**
 * "Continue with Google" through Firebase Authentication. Firebase is
 * loaded only when clicked; the server checks its ID token and logs the
 * matching account in. Hidden until the VITE_FIREBASE_* keys are set.
 */
const env = import.meta.env;
const enabled = Boolean(
    env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID,
);

const { t } = useTrans();
const busy = ref(false);
const error = ref<string | null>(null);

async function signIn() {
    busy.value = true;
    error.value = null;

    try {
        const [
            { initializeApp, getApps },
            { getAuth, GoogleAuthProvider, signInWithPopup, signOut },
        ] = await Promise.all([
            import('firebase/app'),
            import('firebase/auth'),
        ]);
        const app =
            getApps()[0] ??
            initializeApp({
                apiKey: env.VITE_FIREBASE_API_KEY,
                authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: env.VITE_FIREBASE_PROJECT_ID,
                appId: env.VITE_FIREBASE_APP_ID,
            });
        const auth = getAuth(app);
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const idToken = await result.user.getIdToken();
        // The Laravel session is what counts; Firebase's own can go.
        await signOut(auth);

        const { redirect } = await jsonFetch<{ redirect: string }>(
            '/auth/firebase',
            {
                method: 'POST',
                body: { id_token: idToken },
            },
        );
        // A full load: logging in rotated the session and its CSRF token.
        window.location.assign(redirect);
    } catch (caught) {
        const code = (caught as { code?: string }).code;

        // Closing the popup is a choice, not an error.
        if (
            code !== 'auth/popup-closed-by-user' &&
            code !== 'auth/cancelled-popup-request'
        ) {
            error.value = t('Google sign-in failed. Please try again.');
        }

        busy.value = false;
    }
}
</script>

<template>
    <div v-if="enabled" class="grid gap-2">
        <Button
            id="btn-google-sign-in"
            type="button"
            variant="outline"
            class="w-full"
            :disabled="busy"
            @click="signIn"
        >
            <Spinner v-if="busy" />
            <svg v-else viewBox="0 0 24 24" class="size-4" aria-hidden="true">
                <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7Z"
                />
                <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1Z"
                />
                <path
                    fill="#EA4335"
                    d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
                />
            </svg>
            {{ t('Continue with Google') }}
        </Button>
        <InputError :message="error ?? undefined" />
    </div>
</template>
