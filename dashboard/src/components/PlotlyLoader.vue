<script setup lang="ts">
import { ref, onMounted } from 'vue'

import PlotlyDiv from './PlotlyDiv.vue'
import SkeletonBox from './SkeletonBox.vue'

type Trace = { name: string; x?: number[]; y: number[] }

const props = withDefaults(
  defineProps<{
    id: string
    traces: Trace[]
    xlabel: string
    ylabel: string
    width?: string
    height?: string
  }>(),
  {
    width: '600px',
    height: '400px'
  }
)

const isVisible = ref(true)
const root = ref<HTMLElement | null>(null)

// onMounted(() => {
//   if (root.value === null) {
//     return
//   }
//   const observer = new IntersectionObserver(
//     function (entries) {
//       if (entries[0]['isIntersecting'] === true) {
//         if (entries[0]['intersectionRatio'] > 0) {
//           isVisible.value = true
//         }
//       } else {
//         isVisible.value = false
//       }
//     },
//     { threshold: 0 }
//   )
//   observer.observe(root.value)
// })

function downloadData(id: string) {
  let labels = null
  let data = null
  if (props.traces.some((trace) => trace.x)) {
    labels = 'time,' + props.traces.map((el) => el.name).join(',')
    const max_lengths = props.traces.map((trace) =>
      Math.max(trace.x ? trace.x.length : 0, trace.y.length)
    )
    const max_length = Math.max(...max_lengths)

    let rows = []
    for (const i of Array(max_length).keys()) {
      let row = Array(props.traces.length + 1)
      for (const n of row.keys()) {
        if (n === 0) {
          const x = props.traces[n].x
          if (x !== undefined) {
            row[n] = x[i]
          }
        } else {
          row[n] = props.traces[n - 1].y[i]
        }
      }
      rows.push(row.map((e) => (e ? e.toString() : '')).join(','))
    }

    data = rows.join('\n')
  } else {
    labels = props.traces.map((el) => el.name).join(',')
    const max_lengths = props.traces.map((trace) => trace.y.length)
    const max_length = Math.max(...max_lengths)

    let rows = []
    for (const i of Array(max_length).keys()) {
      let row = Array(props.traces.length)
      for (const n of row.keys()) {
        row[n] = props.traces[n].y[i]
      }
      rows.push(row.map((e) => (e ? e.toString() : '')).join(','))
    }

    data = rows.join('\n')
  }
  let csvContent = 'data:text/csv;charset=utf-8,' + labels + '\n' + data
  let encodedUri = encodeURI(csvContent)

  var link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', id + '_data.csv')
  document.body.appendChild(link)

  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div ref="root">
    <template v-if="isVisible">
      <PlotlyDiv
        :id="id"
        :title="ylabel.toLabel()"
        :traces="traces"
        :xlabel="xlabel"
        :ylabel="ylabel"
        :height="height"
        :width="width"
      >
      </PlotlyDiv>
      <v-card tile flat dense class="d-flex flex-row p-0 m-0">
        <v-btn small variant="text" @click="downloadData(id)" style="margin-left: calc(50% - 5em)"
          >Download Data</v-btn
        >
      </v-card>
    </template>
    <SkeletonBox :height="height" :width="width" v-else>Loading</SkeletonBox>
  </div>
</template>
