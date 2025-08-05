<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
// @ts-ignore
import Plotly from 'plotly.js'

type Trace = { name: string; x?: number[]; y: number[] }

const props = defineProps<{
  id: string
  title: string
  traces: Trace[]
  xlabel: string
  ylabel: string
  width: string
  height: string
}>()

const canvas = ref<HTMLElement | null>(null)

let style = computed(() => {
  return (
    'width: ' +
    props.width +
    ';height: ' +
    props.height +
    ';margin-left: calc((100% - ' +
    props.width +
    ') / 2)'
  )
})

onMounted(() => {
  let layout: { [key: string]: any } = {
    // title: {
    //   text: props.title
    // },
    xaxis: {
      title: {
        text: props.xlabel
      }
    },
    yaxis: {
      title: {
        text: props.ylabel
      }
    }
  }
  if (props.traces.length > 1) {
    layout['showlegend'] = true
    layout['legend'] = { x: 1, xanchor: 'left', y: 1 }
  }
  Plotly.newPlot(canvas.value, props.traces, layout)
})
</script>

<template>
  <div :id="id" :style="style" ref="canvas"></div>
</template>
