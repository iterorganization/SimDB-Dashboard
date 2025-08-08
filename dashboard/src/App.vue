<script setup lang="ts">
import { RouterView } from 'vue-router'
import { version } from '../package.json'
</script>

<template>
  <v-app>
    <v-system-bar app dark color="#002F55">
      ITER Simulation Database
      <v-spacer></v-spacer>
      Version {{ version }}
    </v-system-bar>

    <v-app-bar app shrink-on-scroll dark color="#002F55" height="80" dense>
      <v-spacer></v-spacer>
      <v-toolbar-title class="d-flex align-center justify-center" style="height: 100%">
        <v-btn
          variant="text"
          href="/dashboard"
          class="text-none text-h4"
          style="letter-spacing: 0; color: white !important;"
          >SimDB Dashboard</v-btn
        >
      </v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <RouterView></RouterView>
    </v-main>
  </v-app>
</template>
