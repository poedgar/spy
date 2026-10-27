<script setup lang="ts">
import { useTrans } from '@/composables/useTrans';

const { t } = useTrans();
</script>

<template>
    <!-- The faces are CC BY: their authors must be credited where they're shown. -->
    <p id="face-credit" class="text-xs text-muted-foreground">
        {{ t('Faces:') }}
        <a
            href="https://doi.org/10.1371/journal.pone.0231266"
            target="_blank"
            rel="noopener"
            class="underline underline-offset-2"
            >UIBVFED</a
        >
        — M. Mascaró Oliver, E. Amengual Alcover (2020), Universitat de les
        Illes Balears,
        <a
            href="https://creativecommons.org/licenses/by/3.0/es/deed.en"
            target="_blank"
            rel="noopener"
            class="underline underline-offset-2"
            >CC BY</a
        >.
        {{
            t(
                'Expressions built from the Facial Action Coding System; levels are checked against how often players name each face right.',
            )
        }}
    </p>
</template>
