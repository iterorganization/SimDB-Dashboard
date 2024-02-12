<!-- eslint-disable no-prototype-builtins -->
<script setup lang="ts">
import { to_i32_array, to_f32_array, to_f64_array } from '../common'

import PlotlyLoader from './PlotlyLoader.vue'

type MetaData = {
  element: string
  value: any
}

type Simulation = {
  alias: string
  uuid: string
  items: MetaData[]
  outputs: string
  inputs: string
}

type PlotData = {
  x?: number[]
  y: number[]
  name: string
}

const props = defineProps<{
  name: string
  simulations: Simulation[]
  uuids: string[]
  index: number
  loaded: boolean
}>()

function getTraces(name: string): PlotData[] {
  return props.uuids.map((uuid) => {
    let simulation = props.simulations.find((sim) => sim.uuid === uuid)
    if (simulation === undefined) {
      return { y: [], name: '' }
    }
    let data: PlotData = {
      y: processValue(getValue(simulation, name)),
      name: simulation?.alias || simulation?.uuid
    }
    let xdata = getXData(simulation, name)
    if (xdata) {
      data['x'] = xdata
    }
    return data
  })
}

function getValue(simulation: Simulation, name: string) {
  let item = simulation == null ? null : simulation.items.find((el) => el.element === name)
  return item != null ? item.value : null
}

function getXData(simulation: Simulation, name: string) {
  let root = name.split('.')[0]
  let time = getValue(simulation, root + '.time')
  return time ? processValue(time) : null
}

function processValue(value: any) {
  if (!value) {
    return 'No data available.'
  }
  if (value.hasOwnProperty('_type') && value._type === 'numpy.ndarray') {
    if (value.dtype === 'int32') {
      return to_i32_array(value.bytes)
    } else if (value.dtype === 'float32') {
      return to_f32_array(value.bytes)
    } else if (value.dtype === 'float64') {
      return to_f64_array(value.bytes)
    } else {
      return 'Unknown data type: ' + value.dtype
    }
  }
  return value
}

function isXML(simulation: Simulation, name: string) {
  let value = getValue(simulation, name)
  return typeof value == 'string' && value.startsWith('<?xml')
}

function isArray(name: string) {
  return props.simulations
    .map((sim) => getValue(sim, name))
    .some((value) => value && value.hasOwnProperty('_type') && value._type === 'numpy.ndarray')
}
</script>

<template>
  <tr v-if="isArray(name)">
    <td style="min-width: 20em">{{ name.toLabel() }}</td>
    <td :colspan="simulations.length">
      <v-container class="ml-0">
        <PlotlyLoader
          v-if="loaded"
          :id="'plot' + index"
          :traces="getTraces(name)"
          :ylabel="name"
          xlabel="time"
          width="800px"
          height="600px"
        >
        </PlotlyLoader>
      </v-container>
    </td>
  </tr>
</template>
