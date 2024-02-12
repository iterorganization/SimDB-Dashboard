<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { config } from '../config'

import AuthDialog from './AuthDialog.vue'
import RowAdder from './RowAdder.vue'
import ComparePlot from './ComparePlot.vue'
import CompareRow from './CompareRow.vue'

type AlertType = 'error' | 'success' | 'warning' | 'info' | undefined
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

const server = ref<string>(config.defaultServer)
const dialog = ref(false)
const status = ref<{ show: boolean; text: string | null; type: AlertType }>({
  show: false,
  text: null,
  type: undefined
})
const authentication = ref<string | null>(null)
const displayItems = ref([...config.displayFields])
const token = ref<string | null>(null)
const items = ref([])
const uuids = ref<string[]>([])
const simulations = ref<Simulation[]>([])
const loaded = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  uuids.value = params.getAll('uuid')
  server.value = params.get('server') || config.defaultServer
  updateAuth().then((_) => {
    if (requiresAuth() && !getToken()) {
      dialog.value = true
    } else {
      setItems('', '')
    }
    const _displayItems = window.localStorage.getItem('simdb-display-items')
    if (_displayItems) {
      displayItems.value = JSON.parse(_displayItems)
    }
  })
})

function updateAuth() {
  status.value.show = false
  const url = config.rootURL(decodeURIComponent(server.value))
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

function addRow(name: string) {
  if (!displayItems.value.includes(name)) {
    displayItems.value.push(name)
  }
}

function removeRow() {
  displayItems.value.pop()
}

function resetRows() {
  displayItems.value = [...config.displayFields]
}

function requiresAuth() {
  if (server.value !== null && server.value in config.serverConfig) {
    return config.serverConfig[server.value].requiresAuth;
  }
  return authentication.value !== null && authentication.value !== 'None';
}

function getToken() {
  return token.value || window.sessionStorage.getItem('simdb-token-' + server.value)
}

function getAlias(uuid: string) {
  return simulations.value.find((el) => el.uuid === uuid)?.alias
}

function getValue(name: string) {
  if (name === 'server') {
    return server.value
  } else {
    let found: any = items.value
      ? items.value.find((el: any) => el.element.toLowerCase() === name)
      : false
    return found ? found.value : null
  }
}

function setItems(username: string, password: string) {
  status.value.show = false
  dialog.value = false
  const args: { headers: { [key: string]: any } } = { headers: {} }
  if (getToken()) {
    args.headers['Authorization'] = 'JWT-Token ' + getToken()
  } else {
    args.headers['Authorization'] = {
      Authorization: 'Basic ' + btoa(username + ':' + password)
    }
  }
  if (server.value === null) {
    return
  }
  const url = config.rootAPI(decodeURIComponent(server.value))
  uuids.value.forEach(function (uuid) {
    fetch(url + '/simulation/' + uuid, args)
      .then((response) => response.json())
      .then((data) => {
        let simulation = {
          alias: data.alias,
          uuid: data.uuid.hex,
          items: data.metadata,
          outputs: data.outputs,
          inputs: data.inputs
        }
        simulations.value.push(simulation)
      })
      .catch(function (error) {
        status.value.show = true
        status.value.text = error
        status.value.type = 'error'
      })
  })
}
</script>

<template>
  <AuthDialog :server="server" :show="dialog" @ok="setItems" @error="dialog = false"></AuthDialog>

  <v-container fluid>
    <v-row dense style="min-height: 5em">
      <v-col cols="2" class="text-h5">Server</v-col>
      <v-col cols="10" class="text-h5">{{ server }}</v-col>
    </v-row>
    <v-row>
      <v-divider></v-divider>
    </v-row>
    <v-row>
      <v-col>
        <v-table>
          <thead>
            <tr>
              <th class="pl-1">UUID</th>
              <th class="pl-2" v-for="id in uuids" v-bind:key="id">{{ id }}</th>
            </tr>
            <tr>
              <th class="pl-1">Alias</th>
              <th class="pl-2" v-for="id in uuids" v-bind:key="id">{{ getAlias(id) }}</th>
            </tr>
          </thead>
          <tbody>
            <CompareRow
              v-for="(name, index) in displayItems"
              :key="index"
              :name="name"
              :value="getValue(name)"
              :simulations="simulations"
              :uuids="uuids"
              :index="index"
            >
            </CompareRow>
            <ComparePlot
              v-for="(name, index) in displayItems"
              :key="'plot' + index"
              :name="name"
              :simulations="simulations"
              :uuids="uuids"
              :index="index"
              :loaded="loaded"
            >
            </ComparePlot>
            <RowAdder
              :server="server"
              @add="addRow"
              @remove="removeRow"
              @reset="resetRows"
            ></RowAdder>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>
