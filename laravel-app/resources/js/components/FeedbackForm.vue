<script setup lang="ts">
import { useForm, usePage } from '@inertiajs/vue3';
import { Bug, CircleCheck, Lightbulb } from '@lucide/vue';
import { computed, ref } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/composables/useTrans';

const MAX_LENGTH = 2000;

const { t } = useTrans();
const page = usePage();
const signedIn = computed(() => Boolean(page.props.auth.user));
const sent = ref(false);
const form = useForm({
    kind: 'idea' as 'idea' | 'bug',
    message: '',
    email: '',
    // A trap for bots; people never see it.
    website: '',
});

const kinds = [
    { value: 'idea', label: 'An idea', icon: Lightbulb },
    { value: 'bug', label: 'A bug', icon: Bug },
] as const;

function send() {
    form.post('/feedback', {
        preserveScroll: true,
        onSuccess: () => {
            form.reset();
            sent.value = true;
        },
    });
}
</script>

<template>
    <section id="feedback" class="rounded-xl border p-6">
        <h2 class="text-xl font-semibold">
            {{ t('Ideas and bugs') }}
        </h2>
        <p class="mt-1 text-muted-foreground">
            {{
                t(
                    'Have an idea for a game or a feature, or found something broken? Tell us.',
                )
            }}
        </p>

        <div
            v-if="sent"
            id="feedback-sent"
            class="mt-4 flex flex-wrap items-center gap-2"
        >
            <CircleCheck class="size-5 text-primary" />
            <span>{{ t('Thank you! We read every message.') }}</span>
            <Button variant="link" class="px-1" @click="sent = false">
                {{ t('Send another') }}
            </Button>
        </div>

        <form
            v-else
            id="feedback-form"
            class="mt-4 grid gap-4"
            @submit.prevent="send"
        >
            <div
                class="flex flex-wrap gap-2"
                role="radiogroup"
                :aria-label="t('What is it?')"
            >
                <button
                    v-for="kind in kinds"
                    :key="kind.value"
                    type="button"
                    role="radio"
                    :aria-checked="form.kind === kind.value"
                    :data-kind="kind.value"
                    class="flex items-center gap-2 rounded-md border px-4 py-1.5 text-sm"
                    :class="
                        form.kind === kind.value
                            ? 'border-primary bg-primary/10'
                            : 'hover:border-primary'
                    "
                    @click="form.kind = kind.value"
                >
                    <component :is="kind.icon" class="size-4" />
                    {{ t(kind.label) }}
                </button>
            </div>

            <div class="grid gap-2">
                <Label for="feedback-message">{{
                    form.kind === 'bug'
                        ? t('What happened, and what did you expect?')
                        : t('Your idea')
                }}</Label>
                <textarea
                    id="feedback-message"
                    v-model="form.message"
                    rows="4"
                    :maxlength="MAX_LENGTH"
                    required
                    class="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                />
                <InputError :message="form.errors.message" />
            </div>

            <div v-if="!signedIn" class="grid gap-2">
                <Label for="feedback-email">{{
                    t('Email for a reply (optional)')
                }}</Label>
                <Input
                    id="feedback-email"
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                />
                <InputError :message="form.errors.email" />
            </div>

            <input
                v-model="form.website"
                type="text"
                name="website"
                tabindex="-1"
                autocomplete="off"
                aria-hidden="true"
                class="hidden"
            />

            <InputError :message="form.errors.kind" />
            <Button
                id="btn-send-feedback"
                type="submit"
                class="justify-self-start"
                :disabled="form.processing || !form.message.trim()"
            >
                {{ t('Send') }}
            </Button>
        </form>
    </section>
</template>
