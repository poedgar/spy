<script setup lang="ts">
import { BookOpen } from '@lucide/vue';
import LocationList from '@/components/game/LocationList.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useTrans } from '@/composables/useTrans';
import type { Categories, Place } from '@/types/game';

defineProps<{
    locations: Place[];
    categories: Categories;
}>();

const { t } = useTrans();
</script>

<template>
    <Dialog>
        <DialogTrigger as-child>
            <Button id="btn-location-guide" variant="outline" size="sm">
                <BookOpen />
                {{ t('Location guide') }}
            </Button>
        </DialogTrigger>
        <DialogContent class="flex max-h-[85vh] flex-col sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{{ t('Location guide') }}</DialogTitle>
                <DialogDescription>
                    {{
                        t(
                            'Every place this operation can be set in. Loyalists: talk around yours. Spies: work out which one it is.',
                        )
                    }}
                </DialogDescription>
            </DialogHeader>
            <LocationList :locations="locations" :categories="categories" />
        </DialogContent>
    </Dialog>
</template>
