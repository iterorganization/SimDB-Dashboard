<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { config } from '../config'
import DataRow from './DataRow.vue'
import AuthDialog from './AuthDialog.vue'
import RowAdder from './RowAdder.vue'

const _showAllFields =
  typeof config.displayFields === 'string' && new String(config.displayFields).toLowerCase() === 'all'
const _displayFields = _showAllFields ? [] : [...config.displayFields]

type UUID = { hex: string }

const selectedServer = ref('')
const dialog = ref(false)
const displayHeaders = ref(config.displayHeaders)
const showAllFields = ref(_showAllFields)
const displayItems = ref(_displayFields)
const uuid = ref<UUID | undefined>()
const alias = ref<string | undefined>()
const creationDate = ref('')
const items = ref<Data[]>([])
const outputs = ref<File[]>([])
const inputs = ref<File[]>([])
const parents = ref<Item[]>([])
const children = ref<Item[]>([])
const token = ref('')
const authentication = ref('')

onMounted(() => {
  const tokens = window.location.pathname.split('/')
  const params = new URLSearchParams(window.location.search)

  let aliasIdx = tokens.findIndex((el) => el === 'alias')
  if (aliasIdx >= 0) {
    alias.value = tokens.slice(aliasIdx + 1).join('/')
  } else {
    uuid.value = { hex: tokens[tokens.length - 1] }
  }

  selectedServer.value = params.get('server') || config.defaultServer

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

type Item = {
  alias: string
  uuid: UUID
}

type Data = { element: string; value: any }

type File = {
  uri: string
  uuid: UUID
  datetime: string
}

type AlertType = 'error' | 'success' | 'warning' | 'info' | undefined
const status = ref<{ show: boolean; text: string | null; type: AlertType }>({
  show: false,
  text: null,
  type: undefined
})

function getToken() {
  return token.value || window.sessionStorage.getItem('simdb-token-' + selectedServer.value)
}

function requiresAuth() {
  if (selectedServer.value !== null && config.serverConfig && selectedServer.value in config.serverConfig) {
    return config.serverConfig[selectedServer.value].requiresAuth;
  }
  return authentication.value !== null && authentication.value !== 'None';
}

function getValue(name: string) {
  if (name === 'server') {
    return selectedServer.value
  } else if (name === 'alias') {
    return alias.value
  } else if (name === 'uuid') {
    return uuid.value?.hex
  } else {
    // removed .toLowerCase() to avoid case sensitivity
    let found: any = items.value
      ? items.value.find((el: any) => el.element === name)
      : false
    return found ? name==='creation_date'? new Date(found.value).toUTCString() : found.value : null
  }
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
  displayItems.value = showAllFields.value ? [] : [...config.displayFields]
}

function setItems(username: string, password: string) {
  status.value.show = false
  dialog.value = false
  const args: { headers: { [key: string]: any } } = { headers: {} }
  if (requiresAuth()) {
    if (getToken()) {
      args.headers['Authorization'] = 'JWT-Token ' + getToken()
    } else {
      args.headers['Authorization'] = {
        Authorization: 'Basic ' + btoa(username + ':' + password)
      }
    }
  }
  const url = config.rootAPI(decodeURIComponent(selectedServer.value))
  let sim_id = uuid.value ? uuid.value.hex : alias.value
  fetch(url + '/simulation/' + sim_id, args)
    .then((response) => response.json())
    .then((data) => {
      alias.value = data.alias
      uuid.value = data.uuid
      items.value = data.metadata
      outputs.value = data.outputs
      inputs.value = data.inputs
      parents.value = data.parents
      children.value = data.children
      if (showAllFields.value) {
        displayItems.value = data.metadata.map((el: any) => el.element)
      }
    })
    .catch(function (error) {
      status.value.show = true
      status.value.text = error
      status.value.type = 'error'
    })
}

function updateAuth() {
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

function showError(error: string) {
  status.value.show = true
  status.value.text = error
  status.value.type = 'error'
}

const showOutputs = ref(false)
const showInputs = ref(false)
const showRelatedSim = ref(false)
const showParents = ref(false)
const showChildren = ref(false)
function toggleSection(section: string) {
  if (section === 'inputs') {
    showInputs.value = !showInputs.value;
    showOutputs.value = false;
    showRelatedSim.value = false;  
    showParents.value = false;
    showChildren.value = false;
  } else if (section === 'outputs') {
    showOutputs.value = !showOutputs.value;
    showInputs.value = false;
    showRelatedSim.value = false;    
    showParents.value = false;
    showChildren.value = false;
  } else if (section === 'parents') {
    showParents.value = !showParents.value;
    showInputs.value = false;
    showOutputs.value = false;
    showChildren.value = false;
  } else if (section === 'children') {
    showChildren.value = !showChildren.value;
    showInputs.value = false;
    showOutputs.value = false;
    showParents.value = false;
  } else if (section === 'relatedsim') {
    showRelatedSim.value = !showRelatedSim.value;
    showInputs.value = false;
    showOutputs.value = false;
  }
}

</script>

<template>
  <AuthDialog
    :server="selectedServer"
    v-model="dialog"
    @ok="setItems"
    @error="dialog = false"
  ></AuthDialog>

  <v-container fluid class="pa-10">
    <v-row v-for="item in displayHeaders" :key="item.label" dense>
      <v-col cols="2" class="text-h5">{{ item.label }}</v-col>
      <v-col cols="10" class="text-h5">{{ getValue(item.value) }}</v-col>
    </v-row>
    <v-row>
      <v-divider></v-divider>
    </v-row>
    <v-row>
      <v-col>
        <span class="text-h5">Metadata</span>
        <v-table>
          <thead>
            <tr>
              <th class="pl-1">Key</th>
              <th class="pl-2">Value</th>
            </tr>
          </thead>
          <tbody>
            <DataRow
              v-for="(name, index) in displayItems"
              :key="index"
              :name="name === 'summary.pulse' ? 'Pulse' : name === 'summary.code.name' ? 'Code Nam': name === 'summary.simulation.description' ? 'Description' : name === 'ids' ? 'IDSs' :name"
              :value="getValue(name)"
              :index="index"
              :data="items"
              :server="selectedServer"
            >
            </DataRow>
          </tbody>
          <div v-if="!showAllFields">
            <RowAdder
              :server="selectedServer"
              @add="addRow"
              @remove="removeRow"
              @reset="resetRows"
              @error="showError"
            ></RowAdder>
          </div>
        </v-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <span class="text-h5">Inputs</span>
          <v-list-item v-if="outputs.length > 0">
            <v-btn icon @click="toggleSection('inputs')" style="box-shadow: none;">
              <v-icon>{{ showInputs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </v-list-item>
        </div>
        <v-table v-if="showInputs">
          <thead>
            <tr>
              <th class="pl-1">URI</th>
              <!-- <th class="pl-2">Creation Time</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="input in inputs" :key="input.uuid.hex">
              <td>{{ input.uri }}</td>
              <!-- <td>{{ new Date(input.datetime).toUTCString() }}</td> -->
            </tr>
            <tr v-if="inputs.length === 0">
              <td>No input simulation</td>
              <td></td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <span class="text-h5">Outputs</span>
          <v-list-item v-if="outputs.length > 0">
            <v-btn icon @click="toggleSection('outputs')" style="box-shadow: none;">
              <v-icon>{{ showOutputs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </v-list-item>
        </div>
        <v-table v-if="showOutputs">
          <thead>
            <tr>
              <th class="pl-1">URI</th>
              <!-- <th class="pl-2">Creation Time</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="output in outputs" :key="output.uuid.hex">
              <td>{{ output.uri }}</td>
              <!-- <td>{{ new Date(output.datetime).toUTCString() }}</td> -->
            </tr>
            <tr v-if="outputs.length === 0">
              <td>No output simulation</td>
              <td></td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <span class="text-h5" >Related Simulations</span>
          <v-list-item>
            <v-btn icon @click="toggleSection('relatedsim')" style="box-shadow: none;">
              <v-icon>{{ showRelatedSim ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </v-list-item>
        </div>
        <v-list v-if="showRelatedSim">
          <v-row>
            <v-col>
              <v-tooltip top>
                <template v-slot:activator="{ props }">
                  <div class="d-flex align-center justify-space-between" style="margin-left: 10px;">
                    <span class="text-h6" v-bind="props">Parents<v-icon size="20">{{'mdi-information-variant'}}</v-icon></span>
                    <v-list-item v-if="parents.length > 0">
                      <v-btn icon @click="toggleSection('parents')" style="box-shadow: none;">
                        <v-icon>{{ showParents ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-list-item>
                  </div>
                </template>
                <span>Simulation whose outputs is equal to the inputs of the current simulation</span>
              </v-tooltip>
              <v-list v-if="showParents">
                <v-list-item v-for="parent in parents" :key="parent.uuid.hex">
                  <a :href="parent.uuid.hex + '?server=' + selectedServer" @click.stop="">{{
                    parent.alias
                  }}</a>
                </v-list-item>
              </v-list>
              <v-list-item v-if="parents.length === 0">
                <span>No parent simulation</span>
              </v-list-item>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-tooltip top>
                <template v-slot:activator="{ props }">
                  <div class="d-flex align-center justify-space-between" style="margin-left: 10px;">
                    <span class="text-h6" v-bind="props">Children<v-icon size="20">{{'mdi-information-variant'}}</v-icon></span>
                    <v-list-item v-if="children.length > 0">
                      <v-btn icon @click="toggleSection('children')" style="box-shadow: none;">
                        <v-icon>{{ showChildren ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-list-item>
                  </div>
                </template>
                <span>Simulation whose inputs is equal to the outputs of the current simulation</span>
              </v-tooltip>
              <v-list v-if="showChildren">
                <v-list-item v-for="child in children" :key="child.uuid.hex">
                  <a :href="child.uuid.hex + '?server=' + selectedServer" @click.stop="">{{
                    child.alias
                  }}</a>
                </v-list-item>
              </v-list>
              <v-list-item v-if="children.length === 0">
                <span>No child simulation</span>
              </v-list-item>
            </v-col>
          </v-row>

        </v-list>
      </v-col>
    </v-row>
  </v-container>
</template>
