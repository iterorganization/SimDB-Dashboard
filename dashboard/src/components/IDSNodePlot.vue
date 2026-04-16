<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TimeSeriesData, IDSNode } from '../api/ibexIdsAPI'
import PlotlyLoader from './PlotlyLoader.vue'

interface PlotTrace {
  x: number[]
  y: number[]
  name: string
  type: string
  mode: string
  line?: { shape: string }
}

const props = defineProps<{
  plotData: TimeSeriesData
  node: IDSNode
}>()

const showExportMenu = ref(false)

const traces = computed<PlotTrace[]>(() => {
  if (!props.plotData) return []
  
  // Extract time from coordinates (usually the first coordinate)
  const timeData = props.plotData.coordinates && props.plotData.coordinates.length > 0
    ? props.plotData.coordinates[0].value
    : Array.from({ length: props.plotData.value.length }, (_, i) => i)
  
  const trace: PlotTrace = {
    x: timeData,
    y: props.plotData.value,
    name: props.node.name,
    type: 'scatter',
    mode: 'lines',
    line: { shape: 'linear' }
  }
  
  return [trace]
})

const stats = computed(() => {
  if (!props.plotData.value || props.plotData.value.length === 0) {
    return { min: 0, max: 0, mean: 0, count: 0, std: 0 }
  }

  const values = props.plotData.value
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length
  const std = Math.sqrt(
    values.reduce((sq: number, n: number) => sq + Math.pow(n - mean, 2), 0) / values.length
  )
  
  return {
    min,
    max,
    mean,
    count: values.length,
    std
  }
})

function exportCSV() {
  const csv = generateCSV()
  downloadFile(csv, 'plot_data.csv', 'text/csv')
}

function exportJSON() {
  const json = JSON.stringify(props.plotData, null, 2)
  downloadFile(json, 'plot_data.json', 'application/json')
}

function generateCSV() {
  const timeData = props.plotData.coordinates && props.plotData.coordinates.length > 0
    ? props.plotData.coordinates[0].value
    : Array.from({ length: props.plotData.value.length }, (_, i) => i)
  
  let csv = `Time (${props.plotData.coordinates?.[0]?.unit || 's'}),${props.plotData.name} (${props.plotData.unit})\n`
  for (let i = 0; i < timeData.length; i++) {
    csv += `${timeData[i]},${props.plotData.value[i]}\n`
  }
  return csv
}

function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="ids-plot">
    <!-- Metadata -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="6">
            <p class="text-caption text-grey">Label</p>
            <p class="font-weight-bold">{{ plotData.name }}</p>
          </v-col>
          <v-col cols="6">
            <p class="text-caption text-grey">Units</p>
            <p class="font-weight-bold">{{ plotData.unit }}</p>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <p class="text-caption text-grey">Description</p>
            <p>{{ plotData.description }}</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Statistics -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3">
          <p class="text-caption text-grey">Min</p>
          <p class="text-h6">{{ stats.min.toExponential(2) }}</p>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3">
          <p class="text-caption text-grey">Max</p>
          <p class="text-h6">{{ stats.max.toExponential(2) }}</p>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3">
          <p class="text-caption text-grey">Mean</p>
          <p class="text-h6">{{ stats.mean.toExponential(2) }}</p>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3">
          <p class="text-caption text-grey">Points</p>
          <p class="text-h6">{{ stats.count }}</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Plot -->
    <v-card class="mb-4">
      <v-card-title>Time Series Plot</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <PlotlyLoader
          id="ids-plot"
          :traces="traces"
          :ylabel="`${node.name} (${plotData.unit})`"
          xlabel="Time (s)"
          width="100%"
          height="500px"
        />
      </v-card-text>
    </v-card>

    <!-- Export -->
    <v-card>
      <v-card-title>Export Data</v-card-title>
      <v-divider></v-divider>
      <v-card-actions>
        <v-btn
          variant="outlined"
          size="small"
          @click="exportCSV"
        >
          <v-icon start>mdi-file-csv</v-icon>
          CSV
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          @click="exportJSON"
        >
          <v-icon start>mdi-code-json</v-icon>
          JSON
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<style scoped>
.ids-plot {
  width: 100%;
}
</style>
