<script setup lang="ts">
import { ref } from 'vue'
import SearchOutput from './SearchOutput.vue'
import SearchInput from './SearchInput.vue'

const searchQuery = ref<string>('')

function doSearch(queryPath: string) {
  if (queryPath) {
    window.history.pushState({}, 'search', queryPath)
    searchQuery.value = queryPath
  }
}
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="4">
        <v-row>
          <p class="text-h5 sub-header">Search</p>
        </v-row>
        <v-divider></v-divider>
        <SearchInput @search="doSearch"></SearchInput>
      </v-col>
      <v-col cols="8">
        <v-row>
          <p class="text-h5 sub-header">Search Results</p>
        </v-row>
        <v-divider></v-divider>
        <SearchOutput :query="searchQuery"></SearchOutput>
      </v-col>
    </v-row>
  </v-container>
</template>
