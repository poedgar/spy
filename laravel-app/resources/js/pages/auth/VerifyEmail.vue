<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTrans } from '@/composables/useTrans';
import { logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { send } from '@/routes/verification';

defineOptions({
    layout: {
        title: 'Email verification',
        description:
            'Please verify your email address by clicking on the link we just emailed to you.',
    },
});

defineProps<{
    status?: string;
    email?: string | null;
}>();

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Email verification')" />

    <p v-if="email" class="mb-4 text-center text-sm">
        {{ t('We sent the link to :email.', { email }) }}
        {{ t('Open it on any device, then come back here.') }}
    </p>

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

    <Form
        v-bind="send.form()"
        class="space-y-6 text-center"
        v-slot="{ processing }"
    >
        <Button
            id="btn-resend-verification"
            :disabled="processing"
            variant="secondary"
            class="w-full"
        >
            <Spinner v-if="processing" />
            {{ t('Resend verification email') }}
        </Button>
    </Form>

    <div class="mt-6 flex flex-col items-center gap-2 text-sm">
        <TextLink :href="editProfile()">
            {{ t('Wrong address? Change it') }}
        </TextLink>
        <TextLink :href="logout()" as="button">
            {{ t('Log out') }}
        </TextLink>
    </div>
</template>
