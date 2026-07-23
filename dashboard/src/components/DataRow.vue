<!-- eslint-disable no-prototype-builtins -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { to_i32_array, to_f32_array, to_f64_array } from '../common'
import { config } from '../config'

import PlotlyLoader from './PlotlyLoader.vue'
import { truncateSummary } from '../utils/utils'

type Data = { element: string; value: any }
type UUIDValue = { _type: string; hex: string }
type NumpyValue = { _type: string; bytes: string; dtype: string }
type RangeValue = { min: number; max: number }
type Trace = { name: string; x?: number[]; y: number[] }

const props = defineProps<{
  name: string
  value?: number | string | NumpyValue | UUIDValue | RangeValue
  index: number
  data: Data[]
  server: string | null
  meta_name: string
  simId?: string
  showRemoveButton?: boolean
}>()

const emit = defineEmits(['remove'])

type QuantityData = {
  name: string
  units: string
  data: any
}

// API response shape matching ImasDataResponse from the backend
type ApiResult = {
  simulation?: string
  file_uuid?: string
  path?: string
  occurrence?: number
  field: QuantityData
  coordinates: QuantityData[]
}

const fetchedValue = ref<ApiResult | null>(null)
const isFetching = ref(false)
const fetchError = ref<string | null>(null)
let currentAbortController: AbortController | null = null

/** metadata keys are stored in the database as dot-separated strings, 
 *  and without summary prefix(ids)
 */
function toDataPath(metaName: string): string {
  const name = metaName.startsWith('summary.') ? metaName.substring(8) : metaName
  return 'summary/' + name.replace(/\./g, '/')
}

function getMetadataDdVersion(): string {
  const version = props.data.find((item) => item.element === 'metadata_dd_version')?.value
  const trimmedVersion = typeof version === 'string' ? version.trim() : ''
  return trimmedVersion || '4.1.0'
}

async function fetchData() {
  if (!props.simId || !props.server) return

  // abort any in-flight request before starting a new one
  if (currentAbortController) currentAbortController.abort()
  currentAbortController = new AbortController()
  const signal = currentAbortController.signal

  isFetching.value = true
  fetchError.value = null
  fetchedValue.value = null
  try {
    const ddVersion = encodeURIComponent(getMetadataDdVersion())
    const url = `${props.server}/v${config.api_version}/simulation/${props.simId}/data?path=${encodeURIComponent(toDataPath(props.meta_name))}&dd_version=${ddVersion}`
    const resp = await fetch(url, { signal })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    fetchedValue.value = await resp.json()
  } catch (err: any) {
    if (err?.name === 'AbortError') return 
    // Show fetch errors from the simdb server
    fetchError.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    isFetching.value = false
  }
}

function isNumpyArray(val: any): boolean {
  return val !== null && typeof val === 'object' && val._type === 'numpy.ndarray'
}

function toNumberArray(val: any): number[] {
  if (Array.isArray(val)) return val as number[]
  if (isNumpyArray(val)) {
    if (val.dtype === 'int32') return Array.from(to_i32_array(val.bytes))
    if (val.dtype === 'float32') return Array.from(to_f32_array(val.bytes))
    if (val.dtype === 'float64') return Array.from(to_f64_array(val.bytes))
  }
  return []
}

function getFetchedTraces(): Trace[] {
  if (!fetchedValue.value) return []
  const fieldData = fetchedValue.value.field?.data
  const yArr = toNumberArray(fieldData)
  if (yArr.length === 0) return []
  const trace: Trace = { name: props.name, y: yArr }
  const coordData = fetchedValue.value.coordinates?.[0]?.data
  if (coordData !== null && coordData !== undefined) {
    const xArr = toNumberArray(coordData)
    if (xArr.length === yArr.length) trace.x = xArr
  }
  return [trace]
}

/** Label for x-axis */
function getCoordinateLabel(): string {
  const coord = fetchedValue.value?.coordinates?.[0]
  if (!coord) return ''
  const name = coord.name.replace(/^summary\//, '')
  return coord.units ? `${name} [${coord.units}]` : name
}

/** Label for y-axis  */
function getFieldLabel(): string {
  const field = fetchedValue.value?.field
  if (!field) return props.meta_name
  const name = field.name.replace(/^summary\//, '')
  return field.units ? `${name} [${field.units}]` : name
}

function isFetchedArray(): boolean {
  if (!fetchedValue.value) return false
  const v = fetchedValue.value.field?.data
  return Array.isArray(v) || isNumpyArray(v)
}

function processValue(value: any) {
  if (value !== 0 && !value) {
    return 'No data available.'
  }
  
  if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
    return `Range: [${value.min}, ${value.max}]`
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

function isNumpyMetadataArray(): boolean {
  return !!(
    props.value &&
    typeof props.value === 'object' &&
    '_type' in props.value &&
    (props.value as NumpyValue)._type === 'numpy.ndarray'
  )
}

function isRangeValue(): boolean {
  return !!(
    props.value &&
    typeof props.value === 'object' &&
    'min' in props.value &&
    'max' in props.value
  )
}

function isXML() {
  return typeof props.value === 'string' && props.value.startsWith('<?xml')
}

function isArray() {
  // Check if it's a numpy array (compatibility with old database)
  if (
    props.value &&
    typeof props.value === 'object' &&
    '_type' in props.value &&
    props.value._type === 'numpy.ndarray' &&
    props.name !== 'time'
  ) {
    return true
  }
  
  // Check if it's a range object 
  // Arrays are stored as { min: value, max: value } in metadata
  if (
    props.value &&
    typeof props.value === 'object' &&
    'min' in props.value &&
    'max' in props.value &&
    props.name !== 'time'
  ) {
    return true
  }
  
  return false
}

function isUUID() {
  return (
    props.value &&
    typeof props.value === 'object' &&
    '_type' in props.value &&
    props.value._type === 'uuid.UUID'
  )
}

function isShortString() {
  return props.value && props.value.toString && props.value.toString().length < 20
}

function getHex(value: number | string | NumpyValue | UUIDValue | RangeValue | undefined): string {
  return (value && typeof value === 'object' && 'hex' in value) ? value.hex : '';
}

function handleRemove() {
  emit('remove', props.index)
}

watch(
  [() => props.value, () => props.simId, () => props.server, () => props.meta_name],
  () => {
    fetchedValue.value = null
    if (isArray()) fetchData()
  },
  { immediate: true }
)
</script>

<template>
  <tr>
    <td style="min-width: 25em">{{ name }}</td>
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
          <!-- only render text for range values; numpy arrays are shown via the plot below -->
          <span v-if="isRangeValue()" style="white-space: pre-wrap">{{ processValue(value) }}</span>
        </template>
        <template v-else-if="isUUID()">
          <a :href="'/' + config.prefix + '/uuid/' + getHex(value)" :title="getHex(value)">{{ getHex(value) }}</a>
        </template>
        <template v-else-if="isShortString()">
          <a :href="'/' + config.prefix + '/?__server=' + server + '&' + meta_name + '=eq:' + value">{{
            processValue(value)
          }}</a>
        </template>
        <template v-else-if="value !== null && value !== undefined">
          <span style="white-space: pre-wrap">
            {{ processValue(value) }}
          </span>
        </template>
        <template v-else> No data available. </template>
        <PlotlyLoader
          v-if="isFetchedArray()"
          :id="'plot' + index"
          :traces="getFetchedTraces()"
          :ylabel="getFieldLabel()"
          :xlabel="getCoordinateLabel()"
        ></PlotlyLoader>
        <!-- show fetch error -->
        <span v-if="fetchError" class="text-error text-caption ml-1" :title="fetchError">data is unavailable</span>
        <v-progress-circular
          v-if="isFetching"
          class="ml-2"
          indeterminate
          size="14"
          width="2"
        ></v-progress-circular>
      </v-container>
    </td>
    <td v-if="showRemoveButton !== false" style="width: 1em; text-align: center;">
      <v-btn
        icon
        size="x-small"
        variant="text"
        color="error"        
        title="Remove metadata"
        @click="handleRemove"
      >      
        <v-icon size="large">mdi-minus-box</v-icon>
      </v-btn>
    </td>
  </tr>
</template>
