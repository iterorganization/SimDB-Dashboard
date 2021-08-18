Vue.component('search-output', {
  delimiters: ['<[', ']>'],
  data: function () {
    return {
      loading: false,
      count: 0,
      items: [],
      page: 1,
      pageCount: 0,
      dialog: false,
      token: null,
      error: null,
    }
  },
  props: {
    query: null,
    server: null,
  },
  watch: {
    query: function (newVal, oldVal) {
      const params = new URLSearchParams(newVal);
      const server = params.get('__server');
      if (server) {
        this.server = server;
      }
      if (this.query) {
        if (!this.getToken()) {
          this.dialog = true;
        } else {
          this.fetchData("", "", this.page);
        }
      }
    }
  },
  template: `
    <div>
    <auth-dialog :server="server" :show="dialog" @ok="fetchData" @error="dialog = false"></auth-dialog>
    <div v-if="items.length > 0">
    <v-expansion-panels multiple accordion>
      <v-expansion-panel
          v-for="(item,i) in items"
          :key="i"
      >
        <v-expansion-panel-header>
          <span>
          <a :href="'simulation/uuid/' + item.uuid.hex + '?server=' + server" @click.stop=""><[ item.alias ]></a>
          </span>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-simple-table>
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              <data-row v-for="(field, index) in item.metadata" :key="index" :label="field.element" :value="field.value" :index="index"></data-row>
            </tbody>
          </v-simple-table>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
    <v-pagination v-model="page" :length="pageCount" @input="updatePage"></v-pagination>
    </div>
    <div v-else>
      <span>No search results</span>
    </div>
    <v-overlay :value="loading">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
    </div>
  `,
  mounted() {
//    this.fetchData()
  },
  methods: {
    getToken() {
      if (!this.token) {
        this.token = window.sessionStorage.getItem('simdb-token-' + this.server);
      }
      return this.token;
    },
    updatePage(page) {
      if (!this.getToken()) {
        this.dialog = true;
      } else {
        this.fetchData("", "", page);
      }
    },
    fetchData(username, password) {
      this.dialog = false;
      if (!this.query) {
        return;
      }
      this.loading = true;
      const comp = this;
      const args = {
        headers: {'simdb-result-limit': 10, 'simdb-page': this.page},
      };
      if (this.getToken()) {
        args.headers['Authorization'] = 'JWT-Token ' + this.token;
      } else {
        args['auth'] = { username: username, password: password };
      }
      const params = new URLSearchParams(this.query);
      params.delete('__server');
      const query = params.toString();
      const url = 'http://' + decodeURIComponent(this.server) + '/api/v1.0';
      axios
        .get(url + '/simulations?' + query, args)
        .then(response => {
          this.items = response.data.results;
          this.count = response.data.count;
          this.page = response.data.page;
          this.pageCount = Math.ceil(response.data.count / 10);
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        })
        .finally(function () {
          comp.loading = false;
        });
    },
  }
})

const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      items: [],
      value: null,
      wild_search: [{id: 'search-1'}],
      searchModels: [],
      searchFields: searchFields.map(el => {
        return {name: el, display: to_label(el)};
      }),
      servers: [
        '0.0.0.0:5000',
        '0.0.0.0:4000',
      ],
//      selectedServer: 'http://0.0.0.0:5000/api/v1.0',
      selectedServer: '0.0.0.0:5000',
      status: {
        show: false,
        text: null,
        type: 'error',
      },
      searchQuery: null,
    }
  },
  mounted() {
    this.setItems();
    const url = new URL(location.href);
    this.searchQuery = url.search;
  },
  methods: {
    addSearch: function () {
      this.search.push({});
    },
    deleteSearch: function (index) {
      this.search.splice(index, 1);
    },
    getQuery: function () {
      const len = this.searchModels.length;
      let query = "";
      for (let i = 0; i < len; i++) {
        const el = this.searchModels[i];
        if (el) {
          query += this.searchFields[i].name + "=" + el + "&";
        }
      }
      return "?__server=" + encodeURIComponent(this.selectedServer) + "&description&status&summary.fusion.neutron_fluxes.thermal.value&" + query;
    },
    doSearch: function (evt) {
      const query = this.getQuery();
      if (query) {
        window.history.pushState({}, 'search', query);
        this.searchQuery = query;
      }
    },
    toLabel: function (name) {
      return name.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
    },
    setItems: function () {
      this.status.show = false;
      const url = 'http://' + decodeURIComponent(this.selectedServer) + '/api/v1.0';
      axios
        .get(url + '/metadata')
        .then(response => {
          this.items = response.data.map(el => {
            return {value: el.name, text: to_label(el.name)}
          })
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        });
    },
  },
})