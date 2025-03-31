<!-- eslint-disable no-prototype-builtins -->
<script setup lang="ts">
import { to_i32_array, to_f32_array, to_f64_array } from '../common'
import { config } from '../config'

import PlotlyLoader from './PlotlyLoader.vue'

type Data = { element: string; value: any }
type UUIDValue = { _type: string; hex: string }
type NumpyValue = { _type: string; bytes: string; dtype: string }
type Trace = { name: string; x?: number[]; y: number[] }

const props = defineProps<{
  name: string
  value?: number | string | NumpyValue | UUIDValue
  index: number
  data: Data[]
  server: string | null
}>()

function getTraces(value: any): Trace[] {
  const trace: Trace = {
    name: props.name,
    y: processValue(value)
  }
  const x_trace = getXData()
  if (x_trace) {
    trace['x'] = x_trace
  }
  return [trace]
}

function getXData() {
  let root = props.name.split('.')[0]
  let time = props.data.find((el) => el.element === root + '.time')
  return time ? processValue(time.value) : null
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

function isXML() {
  return typeof props.value === 'string' && props.value.startsWith('<?xml')
}

function isArray() {
  return (
    props.value &&
    typeof props.value !== 'string' &&
    typeof props.value !== 'number' &&
    props.value._type === 'numpy.ndarray' &&
    props.name !== 'summary.time'
  )
}

function isUUID() {
  return (
    props.value &&
    typeof props.value !== 'string' &&
    typeof props.value !== 'number' &&
    props.value._type === 'uuid.UUID'
  )
}

function isShortString() {
  return props.value && props.value.toString && props.value.toString().length < 20
}

function getHex(value: number | string | NumpyValue | UUIDValue | undefined): string {
  return (value && typeof value === 'object' && 'hex' in value) ? value.hex : '';
}
</script>

<template>
  <tr>
    <td style="min-width: 25em">{{ name.toLabel() }}</td>
    <td style="min-width: 35em">
      <v-container style="width: 70%;white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;" class="ml-0">
        <template v-if="isXML()">
          <v-card height="400px" class="scroll">
            <pre style="max-height: 400px"
              >{{ value }}
            </pre>
          </v-card>
        </template>
        <template v-else-if="isArray()">
          <PlotlyLoader
            :id="'plot' + index"
            :traces="getTraces(value)"
            :ylabel="name"
            xlabel="time"
          ></PlotlyLoader>
        </template>
        <template v-else-if="isUUID()">
          <a :href="'/' + config.prefix + '/uuid/' + getHex(value)" :title="getHex(value)">{{ getHex(value) }}</a>
        </template>
        <template v-else-if="isShortString()">
          <a :href="'/' + config.prefix + '../?__server=' + server + '&' + name + '=eq:' + value">{{
            processValue(value)
          }}</a>
        </template>
        <template v-else-if="value">
          <span style="white-space: pre-wrap">
            {{ processValue(value) }}
          </span>
        </template>
        <template v-else> No data available. </template>
      </v-container>
    </td>
  </tr>
</template>
