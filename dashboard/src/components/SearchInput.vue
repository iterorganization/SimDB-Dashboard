<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { config } from '../config'

type SearchEntry = {
  name: string
  display: string
  value: string | null
  comparator: string
  hover: boolean
  items: string[]
}

const servers = config.servers

const searchFields = ref<SearchEntry[]>(
  config.searchFields.map((el: any) => {
    return {
      name: el,
      display: el.toLabel(),
      value: null,
      comparator: 'eq',
      hover: false,
      items: []
    }
  })
)

const comparators = ['eq', 'ne', 'in', 'ni', 'gt', 'ge', 'lt', 'le']

const isLoading = ref<boolean>(true)
const items = ref<{ value: string, text: string }[]>([])
const itemsFor = ref<{ [key: string]: string[] }>({})
const wildSearch = ref<SearchEntry[]>([])
const selectedServer = ref<string>(config.defaultServer)

type AlertType = 'error' | 'success' | 'warning' | 'info' | undefined
const status = ref<{ show: boolean; text: string | null; type: AlertType }>({
  show: false,
  text: null,
  type: undefined
})

const helpText = function (item: string) {
  const help: { [key: string]: string } = {
    eq: 'Equal to',
    ne: 'Not equal to',
    in: 'Contained in',
    ni: 'Not contained in',
    gt: 'Greater than',
    ge: 'Greater than or equal to',
    lt: 'Less than',
    le: 'Less than or equal to'
  }
  return help[item]
}

onMounted(() => {
  let params = new URLSearchParams(window.location.search);
  let keys = new Set(params.keys());
  for (let key of keys) {
    if (key.startsWith('__')) {
      continue;
    }
    for (let value of params.getAll(key)) {
      let idx = value.search(':');
      if (idx >= 0) {
        let comp = value.substring(0, idx);
        let name = value.substring(idx + 1);
        setField(key, comp, name);
      } else {
        setField(key, "eq", value);
      }
    }
  }
  if (wildSearch.value.length === 0) {
    wildSearch.value = [];
  }
  setItems();
})

function setField(name: string, comp: string, value: string) {
  if (!value) {
    return;
  }
  let found = false;
  for (let i = 0; i < searchFields.value.length; i++) {
    if (searchFields.value[i].name === name && !searchFields.value[i].value) {
      searchFields.value[i].comparator = comp;
      searchFields.value[i].value = value;
      found = true;
      break;
    }
  }
  if (found) {
    return;
  }
  wildSearch.value.push({name: name, display: name.toLabel(), value: value, comparator: comp, hover: false, items: []});
}

function addSearch() {
  wildSearch.value.push({
    name: '',
    display: '',
    value: null,
    comparator: 'eq',
    hover: false,
    items: []
  })
}

function deleteSearch(index: number) {
  wildSearch.value.splice(index, 1)
}

function clearSearch() {
  for (let i = 0; i < searchFields.value.length; i++) {
    searchFields.value[i].value = null
    searchFields.value[i].comparator = 'eq'
  }
}

function setItems() {
  status.value.show = false
  const url = config.rootAPI(decodeURIComponent(selectedServer.value))
  for (let i = 0; i < searchFields.value.length; i++) {
    let name = searchFields.value[i].name
    fetch(url + '/metadata/' + name)
      .then((response) => response.json())
      .then((data) => {
        itemsFor.value[name] = data
      })
      .catch(function (error) {
        status.value.show = true
        status.value.text = error
        status.value.type = 'error'
      })
  }
  fetch(url + '/metadata')
    .then((response) => response.json())
    .then((data) => {
      items.value = data.map((el: any) => {
        return { value: el.name, text: el.name.toLabel() }
      })
      isLoading.value = false
    })
    .catch(function (error) {
      status.value.show = true
      status.value.text = error
      status.value.type = 'error'
    })
}

function getQueryPath() {
  return (
    '?__server=' +
    encodeURIComponent(selectedServer.value) +
    '&' +
    config.searchOutputFields.join('&') +
    '&' +
    getQuery()
  )
}

function getQuery() {
  let args = []
  for (let i = 0; i < searchFields.value.length; i++) {
    const name = searchFields.value[i].name
    const comp = searchFields.value[i].comparator + ':'
    const value = searchFields.value[i].value
    if (value !== null) {
      if (value.trim) {
        args.push(name + '=' + comp + value.trim())
      } else {
        args.push(name + '=' + comp + value)
      }
    }
  }
  for (let i = 0; i < wildSearch.value.length; i++) {
    const name = wildSearch.value[i].name
    const comp = wildSearch.value[i].comparator + ':'
    const value = wildSearch.value[i].value
    if (name && value) {
      if (value.trim) {
        args.push(name + '=' + comp + value.trim())
      } else {
        args.push(name + '=' + comp + value)
      }
    }
  }
  return args.join('&')
}

function changed() {
  for (let i = 0; i < wildSearch.value.length; i++) {
    let name = wildSearch.value[i].name
    if (!name) {
      wildSearch.value[i].items = []
      continue
    }
    if (name in itemsFor.value) {
      wildSearch.value[i].items = itemsFor.value[name]
      continue
    }
    const url = config.rootAPI(decodeURIComponent(selectedServer.value))
    fetch(url + '/metadata/' + name)
      .then((response: any) => {
        wildSearch.value[i].items = response.data
        itemsFor.value[name] = response.data
      })
      .catch(function (error) {
        status.value.show = true
        status.value.text = error
        status.value.type = 'error'
      })
  }
}
</script>

<template>
  <div>
    <v-row dense>
      <v-col cols="12">
        <v-select
          filled
          :items="servers"
          v-model="selectedServer"
          label="SimDB Server"
          hide-details
          @update:model-value="setItems"
        ></v-select>
      </v-col>
    </v-row>
    <v-row dense>
      <v-col cols="12">
        <v-alert variant="text" :value="status.show" :type="status.type">{{ status.text }}</v-alert>
      </v-col>
    </v-row>
    <v-divider></v-divider>
    <v-row dense v-for="item in searchFields" :key="item.name" align="center">
      <v-col cols="5">
        <p :for="item.name">{{ item.display }}</p>
      </v-col>
      <v-col cols="2" class="p-0" style="padding-right: 0">
        <v-select
          dense
          filled
          hide-details
          :items="comparators"
          v-model="item.comparator"
          @mouseover="item.hover = true"
          @mouseleave="item.hover = false"
          style="font-size: 0.7em"
        >
        </v-select>
        <v-card v-if="item.hover" style="position: absolute; padding: 0.2em">{{
          helpText(item.comparator)
        }}</v-card>
      </v-col>
      <v-col cols="5" class="p-0" style="padding-left: 0">
        <v-combobox
          clearable
          v-model="item.value"
          :items="itemsFor[item.name]"
          dense
          filled
          hide-details
          :loading="!itemsFor[item.name]"
        ></v-combobox>
      </v-col>
    </v-row>
    <v-row dense v-for="(item, index) in wildSearch" :key="index" align="center">
      <v-col cols="1">
        <v-btn @click="deleteSearch(index)" block small variant="text" style="padding: 0">
          <v-icon color="blue-grey">mdi-minus-box</v-icon>
        </v-btn>
      </v-col>
      <v-col cols="4">
        <v-autocomplete
          auto-select-first
          clearable
          v-model="item.name"
          item-title="text"
          item-value="value"
          :items="items"
          dense
          filled
          hide-details
          no-data-text="loading..."
          :loading="isLoading"
          @change="changed"
        ></v-autocomplete>
      </v-col>
      <v-col cols="2" class="p-0" style="padding-right: 0">
        <v-select
          dense
          filled
          hide-details
          @mouseover="item.hover = true"
          @mouseleave="item.hover = false"
          :items="comparators"
          v-model="item.comparator"
          style="font-size: 0.7em"
        >
        </v-select>
        <v-card v-if="item.hover" style="position: absolute; padding: 0.2em">{{
          helpText(item.comparator)
        }}</v-card>
      </v-col>
      <v-col cols="5" style="padding: 0">
        <v-combobox
          clearable
          v-model="item.value"
          :items="item.items"
          dense
          filled
          hide-details
        ></v-combobox>
      </v-col>
    </v-row>
    <v-row dense class="d-flex flex-row-reverse">
      <v-card tile flat dense class="mt-2 mb-2" style="padding: 0">
        <v-btn @click="addSearch" class="p-0" small variant="text" dense>
          <v-icon color="blue-grey">mdi-plus</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </v-card>
    </v-row>
    <v-row dense>
      <v-divider></v-divider>
    </v-row>
    <v-row dense>
      <v-card tile flat dense class="d-flex flex-row-reverse p-0 mt-2">
        <v-btn @click="$emit('search', getQueryPath())">
          <template v-if="getQuery().length == 0"> Show All </template>
          <template v-else>
            Search
            <v-icon>mdi-database-search</v-icon>
          </template>
        </v-btn>
        <v-btn @click="clearSearch" class="mr-1" :disabled="getQuery().length == 0"> Clear </v-btn>
      </v-card>
    </v-row>
  </div>  
  <v-row dense style="padding-top: 20px;">
    <v-card flat class="pa-3">  
      <div class="d-flex align-center">
        <span class="text-body-1"> 
        For more information on how to use the SimDB, please refer to the
        </span>
      </div>
      <div class="d-flex align-center" style="padding-top: 20px;">
        <span class="text-body-1">        
          <a 
            href="https://sharepoint.iter.org/departments/POP/CM/IMDesign/Code%20Documentation/simdb-doc/html/user_guide.html" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-decoration-none"
            style="color: #1976D2; "
          >
            SimDB User Guide<v-icon class="ml-2">mdi-open-in-new</v-icon>
          </a>
        </span>      
      </div>
      <div class="d-flex align-center">
        <span class="text-body-1">        
          <a 
            href="https://sharepoint.iter.org/departments/POP/CM/IMDesign/Code%20Documentation/simdb-doc/html/cli.html" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-decoration-none"
            style="color: #1976D2;"
          >
            SimDB CLI Commands <v-icon class="ml-2" >mdi-open-in-new</v-icon>
          </a>
        </span>        
      </div>
    </v-card>   
  </v-row>
</template>
