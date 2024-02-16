<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    maxWidth?: number
    minWidth?: number
    height?: string
    width?: string | null
  }>(),
  {
    maxWidth: 100,
    minWidth: 80,
    height: '1em',
    width: null
  }
)

const computedWidth = computed(() => {
  return (
    props.width ||
    `${Math.floor(Math.random() * (props.maxWidth - props.minWidth) + props.minWidth)}%`
  )
})
</script>

<template>
  <span :style="{ height, width: computedWidth }" class="SkeletonBox" />
</template>
