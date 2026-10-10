<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Crown, UserMinus } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/composables/useConfirm';
import { useTrans } from '@/composables/useTrans';
import type { Operative } from '@/types/game';

const props = defineProps<{ code: string; player: Operative }>();

const { t } = useTrans();
const busy = ref(false);

async function run(
    method: 'post' | 'delete',
    path: string,
    message: string,
    data = {},
) {
    if (!(await confirmAction(message))) {
        return;
    }

    busy.value = true;
    router[method](`/games/${props.code}/${path}`, data, {
        preserveScroll: true,
        onFinish: () => (busy.value = false),
    });
}
</script>

<template>
    <span class="flex gap-1">
        <Button
            variant="ghost"
            size="icon-sm"
            :title="t('Make host')"
            :disabled="busy"
            data-action="make-host"
            @click="
                run(
                    'post',
                    'host',
                    t('Make :player the host?', { player: player.codename }),
                    { user_id: player.id },
                )
            "
        >
            <Crown />
        </Button>
        <Button
            variant="ghost"
            size="icon-sm"
            :title="t('Remove from game')"
            :disabled="busy"
            data-action="remove"
            @click="
                run(
                    'delete',
                    `players/${player.id}`,
                    t('Remove :player from the game?', {
                        player: player.codename,
                    }),
                )
            "
        >
            <UserMinus />
        </Button>
    </span>
</template>
