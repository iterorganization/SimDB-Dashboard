<script setup lang="ts">
import { ref } from 'vue'

type Trace = { name: string; x: number[]; y: number[] }

const props = withDefaults(
  defineProps<{
    id: string
    traces: Trace[]
    xlabel: string
    ylabel: string
    width: string
    height: string
  }>(),
  {
    width: '600px',
    height: '400px'
  }
)

const isVisible = ref(false)
const root = ref<HTMLElement | null>(null)

function downloadData(id: string) {}
</script>

<template>
  <div ref="root">
    <template v-if="isVisible">
      <v-card tile flat dense class="d-flex flex-row p-0 m-0">
        <v-btn small variant="text" @click="downloadData(id)" style="margin-left: calc(50% - 5em)"
          >Download Data</v-btn
        >
      </v-card>
    </template>
  </div>
</template>
