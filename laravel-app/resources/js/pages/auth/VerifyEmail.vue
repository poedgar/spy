<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { useTrans } from '@/composables/useTrans';

defineOptions({
    layout: {
        title: 'Email verification',
        description:
            'Please verify your email address by clicking on the link we just emailed to you.',
    },
});

defineProps<{
    status?: string;
}>();

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Email verification')" />

    <div
        v-if="status === 'verification-link-sent'"
        class="mb-4 text-center text-sm font-medium text-green-600"
    >
        {{
            t(
                'A new verification link has been sent to the email address you provided during registration.',
            )
        }}
    </div>

    <TextLink :href="logout()" as="button" class="mx-auto block text-sm">
        {{ t('Log out') }}
    </TextLink>
</template>
