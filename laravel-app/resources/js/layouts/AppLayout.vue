<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import AppLayout from '@/layouts/app/AppSidebarLayout.vue';
import { useInvitationNotifications } from '@/composables/useInvitationNotifications';
import { usePresence } from '@/composables/usePresence';
import type { BreadcrumbItem } from '@/types';

const { breadcrumbs = [] } = defineProps<{
    breadcrumbs?: BreadcrumbItem[];
}>();

// Mounted here (rather than on any single page) so presence tracking and
// invitation notifications are active on every authenticated page, not just
// whichever page happens to call these composables.
const page = usePage<{ auth: { user: { id: number } } }>();
usePresence();
useInvitationNotifications(page.props.auth.user.id);
</script>

<template>
    <AppLayout :breadcrumbs="breadcrumbs">
        <slot />
    </AppLayout>
</template>
