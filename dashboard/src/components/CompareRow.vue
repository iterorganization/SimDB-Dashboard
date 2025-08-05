<!-- eslint-disable no-prototype-builtins -->
<script setup lang="ts">
import { to_i32_array, to_f32_array, to_f64_array } from '../common'
import { truncateSummary } from '../utils/utils'

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

const props = defineProps<{
  name: string
  simulations: Simulation[]
  uuids: string[]
  index: number
  name_label: string
}>()

function getValue(simulation: Simulation, name: string) {
  let item = simulation == null ? null : simulation.items.find((el) => el.element === name)
  return item != null ? item.value : null
}

function getValueForUUID(uuid: string, name: string) {
  let simulation = getSimulation(uuid)
  if (simulation) {
    return getValue(simulation, name)
  }
  return 'not found'
}

function processValue(uuid: string, name: string) {
  let value = getValueForUUID(uuid, name)
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

function getSimulation(uuid: string): Simulation | undefined {
  return props.simulations.find((el) => el.uuid === uuid)
}

function isXML(uuid: string, name: string) {
  let value = getValueForUUID(uuid, name)
  return typeof value == 'string' && value.startsWith('<?xml')
}

function isUUID(uuid: string, name: string) {
  let value = getValueForUUID(uuid, name)
  return value && value.hasOwnProperty('_type') && value._type === 'uuid.UUID'
}

function isArray(name: string) {
  return props.simulations
    .map((sim) => getValue(sim, name))
    .some((value) => value && value.hasOwnProperty('_type') && value._type === 'numpy.ndarray')
}

function isShortString(uuid: string, name: string) {
  let value = getValueForUUID(uuid, name)
  return value && value.toString && value.toString().length < 20
}
</script>

<template>
  <tr v-if="!isArray(name)">
    <td style="min-width: 20em">{{ truncateSummary(name_label) }}</td>
    <td v-for="uuid in uuids" v-bind:key="uuid">
      <v-container class="ml-0">
        <template v-if="isXML(uuid, name)">
          <pre style="max-height: 400px"
            >{{ getValueForUUID(uuid, name) }}
          </pre>
        </template>
        <template v-else-if="isUUID(uuid, name)">
          <a
            :href="'../uuid/' + getValueForUUID(uuid, name).hex"
            :title="getValueForUUID(uuid, name).hex"
          >
            {{ getValueForUUID(uuid, name).hex }}
          </a>
        </template>
        <template v-else-if="isShortString(uuid, name)"> {{ processValue(uuid, name) }} </template>
        <template v-else>
          <span style="white-space: pre-wrap"> {{ processValue(uuid, name) }} </span>
        </template>
      </v-container>
    </td>
  </tr>
</template>
