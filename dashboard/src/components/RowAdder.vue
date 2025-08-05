<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { config } from '../config'
import { truncateSummary } from '../utils/utils'

const props = defineProps<{
  server: string | null
}>()

const emit = defineEmits(['error', 'remove', 'reset', 'add'])

const items = ref([])
const selectedItem = ref(null)
const selectedServer = ref(props.server)

watch(
  () => props.server,
  (newServer, _) => {
    selectedServer.value = newServer
    setOptions()
  }
)

onMounted(() => {
  setOptions()
})

function setOptions() {
  if (!selectedServer.value) {
    return
  }
  const url = config.rootAPI(decodeURIComponent(selectedServer.value))
  fetch(url + '/metadata')
    .then((response) => response.json())
    .then((data) => {
      items.value = data.map((el: { name: string }) => {
        return { value: el.name, title: truncateSummary(el.name) }
      })
    })
    .catch(function (error) {
      emit('error', error)
    })
}
</script>

<template>
  <v-container>
    <v-row>
      <v-autocomplete
        v-model="selectedItem"
        :items="items"
        density="compact"
        no-data-text="loading..."
      ></v-autocomplete>
      <v-btn class="mr-1 ml-3" :disabled="!selectedItem" @click="$emit('add', selectedItem)">
        Add Row
      </v-btn>
      <v-btn class="mr-1" @click="$emit('remove', selectedItem)"> Remove Last Row </v-btn>
      <v-btn class="mr-1" @click="$emit('reset')"> Reset </v-btn>
    </v-row>
  </v-container>
</template>
