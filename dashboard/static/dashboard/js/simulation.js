Vue.component('RowAdder', {
  template: `
      <tr>
      <td class="p-0">
        <v-autocomplete
            auto-select-first
            v-model="selectedItem"
            :items="items"
            dense
            filled
            hide-details
            no-data-text="loading..."
        ></v-autocomplete>
      </td>
      <td>
        <v-btn class="m-1" :disabled="!(selectedItem && selectedItem.length > 0)" @click="$emit('add', selectedItem)">
          Add Data
        </v-btn>
      </td>
    </tr>
  `,
  props: {
    server: null,
  },
  data() {
    return {
      items: [],
      selectedItem: null,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  mounted() {
    this.setOptions();
  },
  watch: {
    server: function (newVal, oldVal) {
      this.setOptions();
    }
  },
  methods: {
    setOptions: function () {
      if (!this.server) {
        return;
      }
      this.status.show = false;
      const url = 'http://' + decodeURIComponent(this.server) + '/api/v1.0';
      const comp = this;
      axios
        .get(url + '/metadata')
        .then(response => {
          this.items = response.data.map(el => {
            return { value: el.name, text: el.name.toLabel() }
          })
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        });
    },
  }
});

const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      server: null,
      uuid: null,
      alias: null,
      inputs: [],
      outputs: [],
      items: [],
      displayItems: ['description', 'summary.fusion.neutron_fluxes.dd.total.value'],
      token: null,
      dialog: true,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  mounted() {
    const tokens = window.location.pathname.split('/');
    const params = new URLSearchParams(window.location.search);
    this.uuid = tokens[tokens.length - 1];
    this.server = params.get('server') || '0.0.0.0:5000'; // TODO: change to use default server from config.js
    if (this.getToken()) {
      this.setItems("", "");
    } else {
      this.dialog = true;
    }
  },
  methods: {
    addRow(name) {
      this.displayItems.push(name);
    },
    getToken() {
      return this.token || window.sessionStorage.getItem('simdb-token-' + this.server);
    },
    getValue(name) {
      let found = this.items.find(el => el.element.toLowerCase() === name);
      return found ? found.value : null;
    },
    setItems: function (username, password) {
      this.status.show = false;
      this.dialog = false;
      const args = { headers: {} };
      if (this.getToken()) {
        args.headers['Authorization'] = 'JWT-Token ' + this.getToken();
      } else {
        args['auth'] = { username: username, password: password };
      }
      const comp = this;
      axios
        .get('http://' + this.server + '/api/v1.0/simulation/' + this.uuid, args)
        .then(response => {
          this.alias = response.data.alias;
          this.uuid = response.data.uuid.hex;
          this.items = response.data.metadata;
          this.outputs = response.data.outputs;
          this.inputs = response.data.inputs;
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        });
    },
  },
});