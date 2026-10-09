<script setup lang="ts">
import { Form, Head, usePage } from '@inertiajs/vue3';
import { Link } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/DeleteUser.vue';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { useTrans } from '@/composables/useTrans';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Profile settings',
                href: edit(),
            },
        ],
    },
});

const page = usePage();
const user = computed(() => page.props.auth.user);
const emailNotifications = ref(user.value.email_notifications !== false);

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Profile settings')" />

    <h1 class="sr-only">{{ t('Profile settings') }}</h1>

    <div class="flex flex-col space-y-6">
        <Heading
            variant="small"
            title="Profile"
            description="Update your name, codename and email address"
        />

        <Form
            v-bind="ProfileController.update.form()"
            class="space-y-6"
            v-slot="{ errors, processing }"
        >
            <div class="grid gap-2">
                <Label for="name">{{ t('Name') }}</Label>
                <Input
                    id="name"
                    class="mt-1 block w-full"
                    name="name"
                    :default-value="user.name"
                    required
                    autocomplete="name"
                    :placeholder="t('Full name')"
                />
                <InputError class="mt-2" :message="errors.name" />
            </div>

            <div class="grid gap-2">
                <Label for="email">{{ t('Email address') }}</Label>
                <Input
                    id="email"
                    type="email"
                    class="mt-1 block w-full"
                    name="email"
                    :default-value="user.email"
                    required
                    autocomplete="username"
                    :placeholder="t('Email address')"
                />
                <InputError class="mt-2" :message="errors.email" />
            </div>

            <div class="grid gap-2">
                <Label for="codename">{{ t('Codename') }}</Label>
                <Input
                    id="codename"
                    class="mt-1 block w-full font-mono uppercase"
                    name="codename"
                    :default-value="user.codename"
                    required
                    autocomplete="off"
                />
                <p class="text-xs text-muted-foreground">
                    {{
                        t(
                            'How other players see you. 3 to 24 letters, digits or underscores.',
                        )
                    }}
                </p>
                <InputError class="mt-2" :message="errors.codename" />
            </div>

            <div
                v-if="!user.email_verified_at"
                id="email-unverified"
                class="rounded-md border border-amber-500/60 bg-amber-500/5 p-3 text-sm"
            >
                <p>
                    {{
                        t(
                            'Your email address is not verified yet, so we cannot send you invitation emails. Check your inbox for the link.',
                        )
                    }}
                </p>
                <Link
                    href="/email/verification-notification"
                    method="post"
                    as="button"
                    class="mt-1 text-primary underline underline-offset-4"
                >
                    {{ t('Send the link again') }}
                </Link>
            </div>

            <label class="flex items-center gap-2 text-sm">
                <input
                    v-model="emailNotifications"
                    type="checkbox"
                    data-test="email-notifications"
                />
                <input
                    type="hidden"
                    name="email_notifications"
                    :value="emailNotifications ? 1 : 0"
                />
                {{ t('Email me when someone invites me to a game') }}
            </label>

            <div class="flex items-center gap-4">
                <Button
                    :disabled="processing"
                    data-test="update-profile-button"
                    >{{ t('Save') }}</Button
                >
            </div>
        </Form>
    </div>

    <DeleteUser />
</template>
