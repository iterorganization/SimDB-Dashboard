<script setup lang="ts">
import { ref, computed } from 'vue'
import { config } from '../config'
import { truncateSummary } from '../utils/utils'

const props = defineProps<{
  server: string | null
  metadata?: string[]
  displayedItems?: string[]
}>()

const emit = defineEmits(['error', 'remove', 'reset', 'add'])

// const items = ref([])
const selectedItem = ref(null)
const selectedServer = ref(props.server)

const items = computed(() => {
  console.log('Props metadata:', props.metadata)
  if (!props.metadata || !Array.isArray(props.metadata)) {
    return []
  }

  // Filter out already displayed items if provided
  const availableMetadata = props.displayedItems
    ? props.metadata.filter(element => !(props.displayedItems ?? []).includes(element))
    : props.metadata

  return availableMetadata.map((element: string) => ({
    value: element,
    title: element
  }))
})

</script>

<template>
  <v-container>
    <v-row>
      <v-autocomplete
        v-model="selectedItem"
        :items="items"
        density="compact"
        no-data-text="No metadata available"
        label="Select metadata"
        clearable
      ></v-autocomplete>
      <v-btn
        class="mr-1 ml-3"
        :disabled="!selectedItem"
        @click="$emit('add', selectedItem)"
      >
        Add Row
      </v-btn>
      <v-btn class="mr-1" @click="$emit('remove', selectedItem)"> Remove Last Row </v-btn>
      <v-btn class="mr-1" @click="$emit('reset')"> Reset </v-btn>
    </v-row>
  </v-container>
</template>
