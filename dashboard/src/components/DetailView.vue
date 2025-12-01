<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const items = ref<Data[]>([])
const outputs = ref<File[]>([])
const inputs = ref<File[]>([])
const parents = ref<Item[]>([])
const children = ref<Item[]>([])
const uploadDate = ref('')
const uploadInfo = ref('')
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
  } else if (name === 'upload_info') {
    uploadInfo.value = items.value.find((el: any) => el.element.toLowerCase() === 'uploaded_by') ?.value || 'unknown'
    return uploadInfo.value + ', ' + new Date(uploadDate.value).toUTCString()
  } else {
    let found: any = items.value
      ? items.value.find((el: any) => el.element.toLowerCase() === name)
      : false
    return found ? found.value : null
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

// Add this computed property to extract unique metadata elements excluding displayed items
const metadataElements = computed(() => {
  if (!items.value || items.value.length === 0) {
    return []
  }

  // Extract all metadata elements
  const allElements = items.value
    .map((item: Data) => item.element)
    .filter((element: string) => element) // Remove any null/undefined elements

  // Filter out already displayed items
  const availableElements = allElements.filter(
    (element: string) => !displayItems.value.includes(element)
  )

  // Remove duplicates and sort
  const uniqueElements = [...new Set(availableElements)].sort()

  return uniqueElements
})

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
      uploadDate.value = data.datetime
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

const inputSort = ref({ key: 'uri', asc: false })
const outputSort = ref({ key: 'uri', asc: false })

const sortedInputs = computed(() => {
  if (!inputs.value || inputs.value.length === 0) return []
  
  return [...inputs.value].sort((a, b) => {
    if (inputSort.value.asc) {
      return a.uri.localeCompare(b.uri)
    } else {
      return b.uri.localeCompare(a.uri)
    }
  })
})

const sortedOutputs = computed(() => {
  if (!outputs.value || outputs.value.length === 0) return []
  
  return [...outputs.value].sort((a, b) => {
    if (outputSort.value.asc) {
      return a.uri.localeCompare(b.uri)
    } else {
      return b.uri.localeCompare(a.uri)
    }
  })
})

function sortInputs(key: string) {
  if (inputSort.value.key === key) {
    inputSort.value.asc = !inputSort.value.asc
  } else {
    inputSort.value.key = key
    inputSort.value.asc = true
  }
}

function sortOutputs(key: string) {
  if (outputSort.value.key === key) {
    outputSort.value.asc = !outputSort.value.asc
  } else {
    outputSort.value.key = key
    outputSort.value.asc = true
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

  <v-container fluid class="pa-5">
    <v-row v-for="item in displayHeaders" :key="item.label" dense>
      <v-col cols="2" class="text-h7">{{ item.label }}</v-col>
      <v-col cols="10" class="text-h7">{{ getValue(item.value) }}</v-col>
    </v-row>

    <v-row>
      <v-divider></v-divider>
    </v-row>
    <v-row>
      <v-col>
        <span class="text-h7">Metadata</span>
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
              :name="name === 'code.name' ? 'code name': name === 'description' ? 'description' : name === 'ids_properties.creation_date' ? 'creation date' : name === 'uploaded_by' ? 'uploaded by' : name"
              :value="getValue(name)"
              :index="index"
              :data="items"
              :server="selectedServer"
              :meta_name="name"
            >
            </DataRow>
          </tbody>
          <div v-if="!showAllFields">
            <RowAdder
              :server="selectedServer"
              :metadata="metadataElements"
              :displayedItems="displayItems"
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
          <span
            class="text-h5 clickable-header"
            @click="toggleSection('inputs')"
            style="cursor: pointer;"
          >
            Inputs
          </span>
          <v-list-item v-if="inputs.length > 0">
            <v-btn icon @click="toggleSection('inputs')" style="box-shadow: none;">
              <v-icon>{{ showInputs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </v-list-item>
        </div>
        <v-table v-if="showInputs">
          <thead>
            <tr>
              <th class="pl-1 sortable" @click="sortInputs('uri')">
                URI
                <v-icon v-if="inputSort.key === 'uri'">
                  {{ inputSort.asc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="input in sortedInputs" :key="input.uuid.hex">
              <td>{{ input.uri }}</td>
            </tr>
            <tr v-if="inputs.length === 0">
              <td>No input data</td>
              <td></td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <span
          class="text-h5 clickable-header"
          @click="toggleSection('outputs')"
          style="cursor: pointer;"
          >
            Outputs
          </span>
          <v-list-item v-if="outputs.length > 0">
            <v-btn icon @click="toggleSection('outputs')" style="box-shadow: none;">
              <v-icon>{{ showOutputs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </v-list-item>
        </div>
        <v-table v-if="showOutputs">
          <thead>
            <tr>
              <th class="pl-1 sortable" @click="sortOutputs('uri')">
                URI
                <v-icon v-if="outputSort.key === 'uri'">
                  {{ outputSort.asc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="output in sortedOutputs" :key="output.uuid.hex">
              <td>{{ output.uri }}</td>
            </tr>
            <tr v-if="outputs.length === 0">
              <td>No output data</td>
              <td></td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between">
          <span
            class="text-h5 clickable-header"
            @click="toggleSection('relatedsim')"
            style="cursor: pointer;"
          >
            Related Simulations
          </span>
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
                    <span
                      v-bind="props"
                      class="text-h6 clickable-header"
                      @click="toggleSection('parents')"
                      style="cursor: pointer;"
                    >
                      Parents
                      <v-icon size="20">{{'mdi-information-variant'}}</v-icon>
                    </span>
                    <v-list-item v-if="parents.length > 0">
                      <v-btn icon @click="toggleSection('parents')" style="box-shadow: none;">
                        <v-icon>{{ showParents ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-list-item>
                  </div>
                </template>
                <span>Simulation whose outputs are the inputs of the current simulation</span>
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
                    <span
                    v-bind="props"
                      class="text-h6 clickable-header"
                      @click="toggleSection('children')"
                      style="cursor: pointer;"
                    >
                      Children
                      <v-icon size="20">{{'mdi-information-variant'}}</v-icon>
                    </span>
                    <v-list-item v-if="children.length > 0">
                      <v-btn icon @click="toggleSection('children')" style="box-shadow: none;">
                        <v-icon>{{ showChildren ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </v-list-item>
                  </div>
                </template>
                <span>Simulation whose inputs are the outputs of the current simulation</span>
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
