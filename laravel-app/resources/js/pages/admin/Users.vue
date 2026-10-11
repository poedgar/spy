<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ref, watch } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTrans } from '@/composables/useTrans';

interface AdminUser {
    id: number;
    name: string;
    codename: string;
    email: string;
    verified: boolean;
    google: boolean;
    two_factor: boolean;
    admin: boolean;
    locale: 'en' | 'uk';
    games_count: number;
    created_at: string | null;
    last_seen_at: string | null;
    online: boolean;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
}

const props = defineProps<{
    users: Paginated<AdminUser>;
    search: string;
    stats: {
        total: number;
        verified: number;
        online: number;
        new_this_week: number;
    };
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Users', href: '/admin/users' }],
    },
});

const { t, locale } = useTrans();
const query = ref(props.search);
let timer: number | undefined;

watch(query, (value) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
        router.get('/admin/users', value.trim() ? { q: value.trim() } : {}, {
            only: ['users', 'search'],
            preserveState: true,
            replace: true,
        });
    }, 300);
});

function date(iso: string | null): string {
    return iso
        ? new Date(iso).toLocaleString(
              locale.value === 'uk' ? 'uk-UA' : 'en-GB',
              {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              },
          )
        : '—';
}

/** Laravel's pagination labels are HTML entities ("&laquo; Previous"). */
function linkLabel(label: string): string {
    if (label.includes('Previous')) {
        return '‹';
    }

    if (label.includes('Next')) {
        return '›';
    }

    return label;
}
</script>

<template>
    <Head :title="t('Users')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">{{ t('Users') }}</h1>

        <div id="admin-stats" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div
                v-for="[label, value] in [
                    [t('All users'), stats.total],
                    [t('Verified'), stats.verified],
                    [t('Online now'), stats.online],
                    [t('New this week'), stats.new_this_week],
                ]"
                :key="String(label)"
                class="rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border"
            >
                <div class="text-sm text-muted-foreground">{{ label }}</div>
                <div class="text-2xl font-semibold">{{ value }}</div>
            </div>
        </div>

        <Input
            id="input-admin-search"
            v-model="query"
            type="search"
            :placeholder="t('Search by name, email or codename')"
        />

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-users" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">{{ t('Player') }}</th>
                        <th class="px-3 py-2 font-medium">{{ t('Email') }}</th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Account') }}
                        </th>
                        <th class="px-3 py-2 text-right font-medium">
                            {{ t('Games') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Signed up') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Last seen') }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="users.data.length === 0">
                        <td
                            colspan="6"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{ t('Nobody matches that search.') }}
                        </td>
                    </tr>
                    <tr
                        v-for="user in users.data"
                        :key="user.id"
                        :data-user-id="user.id"
                        class="border-t border-sidebar-border/70 align-top dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">
                            <div class="font-medium">{{ user.codename }}</div>
                            <div class="text-muted-foreground">
                                {{ user.name }} · #{{ user.id }}
                            </div>
                        </td>
                        <td class="px-3 py-2 break-all">{{ user.email }}</td>
                        <td class="px-3 py-2">
                            <div class="flex flex-wrap gap-1">
                                <Badge
                                    :variant="
                                        user.verified ? 'secondary' : 'outline'
                                    "
                                >
                                    {{
                                        user.verified
                                            ? t('Verified')
                                            : t('Unverified')
                                    }}
                                </Badge>
                                <Badge v-if="user.google" variant="outline"
                                    >Google</Badge
                                >
                                <Badge v-if="user.two_factor" variant="outline"
                                    >2FA</Badge
                                >
                                <Badge v-if="user.admin">{{
                                    t('Admin')
                                }}</Badge>
                                <Badge variant="outline">{{
                                    user.locale.toUpperCase()
                                }}</Badge>
                            </div>
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums">
                            {{ user.games_count }}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            {{ date(user.created_at) }}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            <span
                                v-if="user.online"
                                class="inline-flex items-center gap-1 text-green-600"
                            >
                                <span
                                    class="size-2 rounded-full bg-green-500"
                                />
                                {{ t('Online') }}
                            </span>
                            <template v-else>{{
                                date(user.last_seen_at)
                            }}</template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div
            v-if="users.total > 0"
            class="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
            <span class="text-muted-foreground">
                {{
                    t(':from–:to of :total', {
                        from: users.from ?? 0,
                        to: users.to ?? 0,
                        total: users.total,
                    })
                }}
            </span>
            <nav class="flex flex-wrap gap-1">
                <template v-for="(link, index) in users.links" :key="index">
                    <Link
                        v-if="link.url"
                        :href="link.url"
                        preserve-scroll
                        class="rounded-md border px-3 py-1"
                        :class="
                            link.active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:border-primary'
                        "
                        >{{ linkLabel(link.label) }}</Link
                    >
                    <span
                        v-else
                        class="rounded-md border px-3 py-1 text-muted-foreground opacity-50"
                        >{{ linkLabel(link.label) }}</span
                    >
                </template>
            </nav>
        </div>
    </div>
</template>
