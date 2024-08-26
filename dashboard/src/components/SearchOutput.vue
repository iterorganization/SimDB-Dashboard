<!-- eslint-disable vue/valid-v-slot -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { config } from '../config'
import type { VDataTable } from 'vuetify/components'

import AuthDialog from './AuthDialog.vue'
import DataRow from './DataRow.vue'
import { onMounted } from 'vue'
// import TestDialog from './TestDialog.vue'

type TableHeader = {
  title: string
  align?: 'center' | 'end' | 'start'
  sortable: boolean
  key: string
}

const loading = ref(false)
const expanded = ref([])
const headers = ref<TableHeader[]>([])
const count = ref(0)
const items = ref([])
const page = ref(1)
const pageCount = ref(0)
const dialog = ref(false)
const token = ref<string | null>(null)
const selectedSimulations = ref([])
const sortDesc = ref(true)
const sortBy = ref<string>('')
const sortItems = ref<string[]>(['status', 'run', 'shot'])
const authentication = ref(null)
const selectedServer = ref<string | null>(null)
type AlertType = 'error' | 'success' | 'warning' | 'info' | undefined
const status = ref<{ show: boolean; text: string | null; type: AlertType }>({
  show: false,
  text: null,
  type: undefined
})

const props = defineProps({
  query: String
})
const params = ref<URLSearchParams>(new URLSearchParams(props.query))

onMounted(() => {
  params.value = new URLSearchParams(window.location.search)
  selectedServer.value = params.value.get('__server')
  updateServer().then((_) => {
    doQuery()
  })
})

watch(
  () => props.query,
  (query, _) => {
    selectedSimulations.value = []
    params.value = new URLSearchParams(query)
    selectedServer.value = params.value.get('__server')
    updateServer().then((_) => {
      doQuery()
    })
  }
)

function onlyUnique(value: any, index: any, self: any) {
  return self.indexOf(value) === index
}

function updateServer() {
  const new_server = params.value.get('__server')
  let promise: Promise<void> = Promise.resolve()
  if (new_server) {
    selectedServer.value = new_server
    promise = updateAuth()
  }
  return promise
}

function doQuery() {
  if (Array.from(params.value).length) {
  // if (params.value.size) {
    if (requiresAuth() && !getToken()) {
      dialog.value = true
    } else {
      fetchData('', '')
    }
  } else {
    items.value = []
    count.value = 0
    page.value = 1
    pageCount.value = 0
    return
  }

  sortDesc.value = !Array.from(params.value.keys()).includes('__sort_asc')
  sortItems.value = Array.from(params.value.keys())
    .filter((el) => !el.startsWith('__'))
    .sort()

  let additionalColumns = Array.from(params.value.keys())
    .filter((el) => !el.startsWith('__'))
    .filter((el) => params.value.getAll(el).join(''))
    .filter(onlyUnique)
    .filter((el) => !config.searchOutputColumns.includes(el))
  let searchColumns: string[] = config.searchOutputColumns.concat(additionalColumns)
  headers.value = searchColumns.map((el: string) => {
    let value = ''
    if (el === 'alias' || el === 'datetime') {
      value = el
    } else if (el === 'uuid') {
      value = 'uuid.hex'
    } else {
      value = 'metadata.' + el.replaceAll('.', '_dot_')
    }
    return { title: el.toLabel(), align: 'start', sortable: true, key: value }
  })
}

function doCompare() {
  window.location.href = 'compare/?uuid=' + selectedSimulations.value.join('&uuid=')
}

function getLabel(item: any) {
  return `${item.alias}`
}

function updateAuth(): Promise<void> {
  if (selectedServer.value === null) {
    return Promise.resolve()
  }
  status.value.show = false
  const url = config.rootURL(decodeURIComponent(selectedServer.value))
  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      authentication.value = data.authentication
    })
    .catch(function (error) {
      status.value.show = true
      status.value.text = error
      status.value.type = 'error'
    })
}

function requiresAuth() {
  if (selectedServer.value !== null && config.serverConfig && selectedServer.value in config.serverConfig) {
    return config.serverConfig[selectedServer.value].requiresAuth;
  }
  return authentication.value !== null && authentication.value !== 'None';
}

function getToken() {
  if (!token.value) {
    token.value = window.sessionStorage.getItem('simdb-token-' + selectedServer.value)
  }
  return token.value
}

function fetchData(username: string, password: string) {
  dialog.value = false
  if (!params.value) {
    return
  }
  loading.value = true
  const args: { headers: { [key: string]: any } } = {
    headers: { 'simdb-result-limit': 0, 'simdb-page': page.value }
  }
  if (sortBy.value) {
    args.headers['simdb-sort-by'] = sortBy.value
    args.headers['simdb-sort-asc'] = !sortDesc.value
  }
  if (requiresAuth()) {
    if (getToken()) {
      args.headers['Authorization'] = 'JWT-Token ' + token.value
    } else {
      args.headers['Authorization'] = 'Basic ' + btoa(username + ':' + password)
    }
  }
  const new_params = new URLSearchParams(params.value)
  const keys: string[] = Array.from(new_params.keys())
  var has_value = false
  for (let key of keys) {
    if (key.startsWith('__')) {
      new_params.delete(key)
    }
    if(key.match("value"))
    {
      has_value = true
    }  
  }

  if (has_value === true){
    new_params.append("summary.time","")
  }
  console.log(new_params.toString())
  const query = new_params.toString()
  if (selectedServer.value === null) {
    return
  }
  const url = config.rootAPI(decodeURIComponent(selectedServer.value))
  status.value.show = false
  fetch(url + '/simulations?' + query, args)
    .then((response) => {
      return response.json()
    })
    .then((data: any) => {
      items.value = data.results.map((el: any) => {
        // Adding a version of the metadata so that the table can dynamically read
        el.metadata.forEach((m: any) => {
          el.metadata[m.element.replaceAll('.', '_dot_')] = m.value
        })
        return el
      })
      // comp.items = data.results;
      count.value = data.count
      page.value = data.page
      pageCount.value = Math.ceil(data.count / 10)
    })
    .catch(function (error) {
      status.value.show = true
      status.value.text = error
      status.value.type = 'error'
    })
    .finally(function () {
      loading.value = false
    })
}

function getAlias(item: any) : string {
  return typeof(item) === 'object' && 'alias' in item && item.alias
}

function getDatetime(item: any) : string {
  return typeof(item) === 'object' && 'datetime' in item && item.datetime
}

function getHex(item: any) : string {
  return typeof(item) === 'object' && 'uuid' in item && item.uuid.hex
}

function getMetadata(item: any) : any[] {
  return typeof(item) === 'object' && 'metadata' in item && item.metadata
}
</script>
<template>
  <AuthDialog
    :server="selectedServer"
    v-model="dialog"
    @ok="fetchData"
    @error="dialog = false"
  ></AuthDialog>
  <div>
    <v-row dense>
      <v-col cols="12">
        <v-alert variant="text" :value="status.show" :type="status.type">{{ status.text }}</v-alert>
      </v-col>
    </v-row>
    <v-data-table
      v-model="selectedSimulations"
      :items="items"
      :headers="headers"
      item-value="uuid.hex"
      v-model:expanded="expanded"
      single-expand="true"
      show-select
      show-expand
    >
      <template #top>
        <v-card fluid class="d-flex align-center" flat tile>
          <v-toolbar-title>Search Results</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn dense variant="text" @click="doCompare" :disabled="selectedSimulations.length < 2">
            Compare
          </v-btn>
        </v-card>
      </template>
      <template #[`item.alias`]="{ item }">
        <a :href="'uuid/' + getHex(item) + '?server=' + selectedServer" @click.stop="">{{
          getAlias(item)
        }}</a>
      </template>
      <template #[`item.datetime`]="{ item }">
        {{ new Date(getDatetime(item)).toUTCString() }}
      </template>
      <template #expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length">
            <v-table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <DataRow
                  v-for="(field, index) in getMetadata(item)"
                  :key="index"
                  :name="field.element"
                  :value="field.value"
                  :index="index"
                  :data="getMetadata(item)"
                  :server="selectedServer"                  
                >
                </DataRow>
              </tbody>
            </v-table>
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-overlay :value="loading">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
  </div>
</template>
