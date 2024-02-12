<script setup lang="ts">
import { defineModel, ref } from 'vue'
import { config } from '../config'
import { VTextField } from 'vuetify/components'

const props = defineProps<{
  server: string | null
}>()

const show = defineModel<boolean | undefined>()

const emit = defineEmits(['ok', 'error'])

const username = ref<VTextField | null>(null)
const password = ref<VTextField | null>(null)

function submit(_evt: any) {
  if (document === null) {
    return
  }

  const _username = username.value !== null ? username.value.value : ''
  const _password = password.value !== null ? password.value.value : ''

  emit('ok', _username, _password)
}

function storeToken(_evt: any) {
  if (props.server === null) {
    return
  }

  const _username = username.value !== null ? username.value.value : ''
  const _password = password.value !== null ? password.value.value : ''

  const url = config.rootAPI(decodeURIComponent(props.server))
  let args = {
    headers: {
      Authorization: 'Basic ' + btoa(_username + ':' + _password)
    }
  }
  fetch(url + '/token', args)
    .then((response) => response.json())
    .then((data) => {
      const token = data.token
      window.sessionStorage.setItem('simdb-token-' + props.server, token)
      emit('ok', '', '')
    })
    .catch(function (error) {
      emit('error', error)
    })
}
</script>

<template>
  <v-dialog persistent max-width="400px" v-model="show">
    <v-card>
      <v-card-title class="text-h5"> Authentication Credentials </v-card-title>
      <v-card-text>
        Please enter your credentials for server {{ server }}.
        <v-container>
          <v-row>
            <v-col cols="12" sm="6" md="6">
              <v-text-field label="Username" ref="username"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="6">
              <v-text-field type="password" label="Password" ref="password"></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" variant="text" @click="show = false"> Cancel </v-btn>
        <v-btn color="green darken-1" variant="text" @click="submit"> Submit </v-btn>
        <v-tooltip bottom>
          <template v-slot:activator="{ props }">
            <v-btn color="green darken-1" variant="text" @click="storeToken" v-bind="props">
              Generate Token
            </v-btn>
          </template>
          <span>Generate and save an access token in session storage.</span>
        </v-tooltip>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
