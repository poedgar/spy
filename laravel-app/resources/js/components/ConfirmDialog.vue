<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { answerConfirm, confirmState } from '@/composables/useConfirm';
import { useTrans } from '@/composables/useTrans';

const { t } = useTrans();
</script>

<template>
    <Dialog
        :open="confirmState.open"
        @update:open="(open: boolean) => !open && answerConfirm(false)"
    >
        <DialogContent id="confirm-dialog" :show-close-button="false">
            <DialogHeader>
                <DialogTitle>{{ confirmState.message }}</DialogTitle>
                <DialogDescription class="sr-only">
                    {{ t('Please confirm') }}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="gap-2">
                <Button
                    id="btn-confirm-cancel"
                    variant="outline"
                    @click="answerConfirm(false)"
                >
                    {{ t('Cancel') }}
                </Button>
                <Button
                    id="btn-confirm-ok"
                    :variant="
                        confirmState.destructive ? 'destructive' : 'default'
                    "
                    @click="answerConfirm(true)"
                >
                    {{ confirmState.confirmLabel ?? t('Confirm') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
