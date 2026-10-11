<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import StatCards from '@/components/admin/StatCards.vue';
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
</script>

<template>
    <Head :title="t('Users')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <StatCards
            :items="[
                { label: t('All users'), value: stats.total },
                { label: t('Verified'), value: stats.verified },
                { label: t('Online now'), value: stats.online },
                { label: t('New this week'), value: stats.new_this_week },
            ]"
        />

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
                            <Link
                                v-if="user.games_count > 0"
                                :href="`/admin/games?user=${user.id}`"
                                class="text-primary underline underline-offset-4"
                                >{{ user.games_count }}</Link
                            >
                            <template v-else>0</template>
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

        <AdminPagination :page="users" />
    </div>
</template>
