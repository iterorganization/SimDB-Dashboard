import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const capitalize = function (word: string) {
  return word[0].toUpperCase() + word.slice(1)
}

const process_array_key = function (word: string) {
  return word.replace(/(.*)#(\d+)/, '$1[$2]')
}

String.prototype.toLabel = function () {
  return this.split(/[._]/).map(process_array_key).map(capitalize).join(' ')
}

const vuetify = createVuetify({
  components,
  directives
})

const app = createApp(App)

app.use(router).use(vuetify).mount('#app')
