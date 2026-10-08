<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import { Bell, BellRing } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { openNotification } from '@/composables/useLiveNotifications';
import { useTrans } from '@/composables/useTrans';

const page = usePage();
const { t, locale } = useTrans();

const feed = computed(() => page.props.notifications);
const unread = computed(() => feed.value?.unread_count ?? 0);

// Browser (system) notifications for when the tab is in the background.
const supportsSystem =
    typeof window !== 'undefined' && 'Notification' in window;
const permission = ref(supportsSystem ? Notification.permission : 'denied');

async function enableSystemNotifications() {
    permission.value = await Notification.requestPermission();
}

const relative = (iso: string | null) => {
    if (!iso) {
        return '';
    }

    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    const format = new Intl.RelativeTimeFormat(locale.value, {
        numeric: 'auto',
    });

    if (minutes < 60) {
        return format.format(-minutes, 'minute');
    }

    return minutes < 1440
        ? format.format(-Math.round(minutes / 60), 'hour')
        : format.format(-Math.round(minutes / 1440), 'day');
};
</script>

<template>
    <DropdownMenu v-if="feed">
        <DropdownMenuTrigger as-child>
            <Button
                id="notification-bell"
                variant="ghost"
                size="icon"
                class="relative"
                :aria-label="t('Notifications')"
            >
                <component :is="unread > 0 ? BellRing : Bell" />
                <span
                    v-if="unread > 0"
                    id="notification-count"
                    class="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-red-600 px-1 text-[10px] leading-4 font-semibold text-white"
                    >{{ unread > 9 ? '9+' : unread }}</span
                >
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-80">
            <DropdownMenuLabel class="flex items-center justify-between">
                <span>{{ t('Notifications') }}</span>
                <button
                    v-if="unread > 0"
                    id="btn-read-all"
                    type="button"
                    class="text-xs font-normal text-primary hover:underline"
                    @click="
                        router.post(
                            '/notifications/read-all',
                            {},
                            { preserveScroll: true },
                        )
                    "
                >
                    {{ t('Mark all as read') }}
                </button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p
                v-if="feed.notifications.length === 0"
                class="px-2 py-4 text-center text-sm text-muted-foreground"
            >
                {{
                    t(
                        'Nothing yet. Invitations and game news will show up here.',
                    )
                }}
            </p>
            <DropdownMenuItem
                v-for="notification in feed.notifications"
                :key="notification.id"
                class="flex cursor-pointer items-start gap-2"
                :data-notification="notification.kind"
                @select="openNotification(notification)"
            >
                <span
                    class="mt-1.5 inline-block size-2 shrink-0 rounded-full"
                    :class="
                        notification.read_at ? 'bg-transparent' : 'bg-primary'
                    "
                />
                <span class="min-w-0">
                    <span class="block text-sm font-medium">{{
                        notification.title
                    }}</span>
                    <span class="block text-xs text-muted-foreground">{{
                        notification.body
                    }}</span>
                    <span class="block text-[11px] text-muted-foreground">{{
                        relative(notification.created_at)
                    }}</span>
                </span>
            </DropdownMenuItem>
            <template v-if="supportsSystem && permission === 'default'">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    id="btn-enable-system-notifications"
                    class="cursor-pointer text-xs"
                    @select.prevent="enableSystemNotifications"
                >
                    {{
                        t(
                            'Show notifications when this tab is in the background',
                        )
                    }}
                </DropdownMenuItem>
            </template>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
