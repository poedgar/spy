<script setup lang="ts">
/**
 * A picture with a caption in classic meme style: bold white capitals with
 * a black outline, over the bottom of the image, sized to its width.
 */
defineProps<{ src: string; alt: string; caption?: string | null }>();
</script>

<template>
    <figure class="meme relative overflow-hidden rounded-lg bg-black">
        <img :src="src" :alt="alt" class="block w-full" loading="lazy" />
        <figcaption
            v-if="caption"
            class="meme-caption absolute inset-x-0 bottom-0 px-[4%] pb-[3%] text-center break-words text-white uppercase"
        >
            {{ caption }}
        </figcaption>
    </figure>
</template>

<style scoped>
.meme {
    container-type: inline-size;
}

.meme-caption {
    font-family: Impact, 'Anton', 'Arial Black', 'Helvetica Neue', sans-serif;
    font-weight: 900;
    font-size: clamp(14px, 7.5cqw, 44px);
    line-height: 1.1;
    letter-spacing: 0.01em;
    -webkit-text-stroke: 0.06em black;
    paint-order: stroke fill;
    text-shadow:
        0 0 0.08em black,
        0.04em 0.04em 0.08em black;
}
</style>
