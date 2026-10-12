<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Bug, Check, Lightbulb, RotateCcw, Trash2 } from '@lucide/vue';
import { reactive, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import FilterSelect from '@/components/admin/FilterSelect.vue';
import StatCards from '@/components/admin/StatCards.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/composables/useConfirm';
import { useTrans } from '@/composables/useTrans';

interface AdminFeedback {
    id: number;
    kind: 'idea' | 'bug';
    message: string;
    email: string | null;
    user: { id: number; codename: string; name: string } | null;
    locale: string | null;
    user_agent: string | null;
    resolved: boolean;
    created_at: string | null;
}

const props = defineProps<{
    feedback: Paginated<AdminFeedback>;
    filters: { kind: string | null; status: string | null };
    stats: { open: number; ideas: number; bugs: number; total: number };
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Feedback', href: '/admin/feedback' }],
    },
});

const { t, locale } = useTrans();
const filter = reactive({
    kind: props.filters.kind ?? '',
    status: props.filters.status ?? '',
});

watch(
    () => [filter.kind, filter.status],
    () => {
        const query: Record<string, string> = {};

        if (filter.kind) {
            query.kind = filter.kind;
        }

        if (filter.status) {
            query.status = filter.status;
        }

        router.get('/admin/feedback', query, {
            only: ['feedback', 'filters'],
            preserveState: true,
            replace: true,
        });
    },
);

function date(iso: string | null): string {
    return iso
        ? new Date(iso).toLocaleString(
              locale.value === 'uk' ? 'uk-UA' : 'en-GB',
              { dateStyle: 'medium', timeStyle: 'short' },
          )
        : '—';
}

function setResolved(item: AdminFeedback, resolved: boolean) {
    router.put(
        `/admin/feedback/${item.id}`,
        { resolved },
        { preserveScroll: true },
    );
}

async function remove(item: AdminFeedback) {
    if (await confirmAction(t('Remove this message for good?'))) {
        router.delete(`/admin/feedback/${item.id}`, { preserveScroll: true });
    }
}
</script>

<template>
    <Head :title="t('Feedback')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <StatCards
            :items="[
                { label: t('To do'), value: stats.open },
                { label: t('Open ideas'), value: stats.ideas },
                { label: t('Open bugs'), value: stats.bugs },
                { label: t('All messages'), value: stats.total },
            ]"
        />

        <div class="flex flex-wrap gap-2">
            <FilterSelect id="select-feedback-kind" v-model="filter.kind">
                <option value="">{{ t('Ideas and bugs') }}</option>
                <option value="idea">{{ t('Ideas') }}</option>
                <option value="bug">{{ t('Bugs') }}</option>
            </FilterSelect>
            <FilterSelect id="select-feedback-status" v-model="filter.status">
                <option value="">{{ t('To do and done') }}</option>
                <option value="open">{{ t('To do') }}</option>
                <option value="resolved">{{ t('Done') }}</option>
            </FilterSelect>
        </div>

        <p
            v-if="feedback.data.length === 0"
            class="rounded-xl border border-sidebar-border/70 px-3 py-6 text-center text-sm text-muted-foreground dark:border-sidebar-border"
        >
            {{ t('No messages yet.') }}
        </p>

        <ul id="admin-feedback" class="grid gap-3">
            <li
                v-for="item in feedback.data"
                :key="item.id"
                :data-feedback-id="item.id"
                class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                :class="{ 'opacity-60': item.resolved }"
            >
                <div class="flex flex-wrap items-center gap-2 text-sm">
                    <Badge
                        :variant="
                            item.kind === 'bug' ? 'destructive' : 'secondary'
                        "
                    >
                        <Bug v-if="item.kind === 'bug'" />
                        <Lightbulb v-else />
                        {{ item.kind === 'bug' ? t('Bug') : t('Idea') }}
                    </Badge>
                    <Badge v-if="item.resolved" variant="outline">{{
                        t('Done')
                    }}</Badge>
                    <Link
                        v-if="item.user"
                        :href="`/admin/users?q=${encodeURIComponent(item.user.codename)}`"
                        class="font-medium hover:underline"
                        >{{ item.user.codename }}</Link
                    >
                    <span v-else class="text-muted-foreground">{{
                        t('Guest')
                    }}</span>
                    <a
                        v-if="item.email"
                        :href="`mailto:${item.email}`"
                        class="text-primary underline underline-offset-4"
                        >{{ item.email }}</a
                    >
                    <span class="text-muted-foreground">
                        {{ date(item.created_at) }}
                    </span>
                    <span class="ml-auto flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            :data-action="item.resolved ? 'reopen' : 'resolve'"
                            :title="
                                item.resolved ? t('Open again') : t('Mark done')
                            "
                            :aria-label="
                                item.resolved ? t('Open again') : t('Mark done')
                            "
                            @click="setResolved(item, !item.resolved)"
                        >
                            <RotateCcw v-if="item.resolved" />
                            <Check v-else />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            class="text-red-600"
                            data-action="remove"
                            :title="t('Remove')"
                            :aria-label="t('Remove')"
                            @click="remove(item)"
                        >
                            <Trash2 />
                        </Button>
                    </span>
                </div>
                <p class="mt-2 text-sm whitespace-pre-line">
                    {{ item.message }}
                </p>
                <p
                    v-if="item.user_agent"
                    class="mt-2 truncate text-xs text-muted-foreground"
                    :title="item.user_agent"
                >
                    {{ item.locale?.toUpperCase() }} · {{ item.user_agent }}
                </p>
            </li>
        </ul>

        <AdminPagination :page="feedback" />
    </div>
</template>
