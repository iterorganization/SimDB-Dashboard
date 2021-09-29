Vue.component('search-output', {
  delimiters: ['<[', ']>'],
  template: `
    <div>
      <auth-dialog :server="server" :show="dialog" @ok="fetchData" @error="dialog = false"></auth-dialog>
      <div v-if="items.length > 0">
        <v-card flat tile dense class="d-flex flex-row-reverse mb-3">
          <v-btn dense text @click="doCompare" :disabled="numSelected < 2">
            Compare
          </v-btn>
        </v-card>
        <v-expansion-panels multiple accordion v-model="panels">
          <v-expansion-panel v-for="(item,i) in items" :key="i">
            <v-expansion-panel-header>
              <v-checkbox
                  v-model="selectedSimulations[item.uuid.hex]"
                  :value="item.uuid.hex"
                  @click.stop="" 
                  dense 
                  hide-details 
                  style="max-width: 50px" 
                  multiple>
                </v-checkbox>
              <span>
                <a :href="'uuid/' + item.uuid.hex + '?server=' + server" @click.stop="">
                  <[ getLabel(item) ]>
                </a>
              </span>
            </v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-simple-table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <data-row 
                      v-for="(field, index) in item.metadata"
                     :key="index" 
                     :name="field.element" 
                     :value="field.value" 
                     :index="index" 
                     :data="item.metadata">
                  </data-row>
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
      selectedSimulations: {},
      panels: [],
    }
  },
  props: {
    query: null,
    server: null,
  },
  computed: {
    numSelected() {
      let count = 0;
      for (let key in this.selectedSimulations) {
        if (this.selectedSimulations[key].length) {
          count += 1;
        }
      }
      return count;
    },
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
      } else {
          this.items = [];
          this.count = 0;
          this.page = 1;
          this.pageCount = 0;
      }
    }
  },
  methods: {
    doCompare() {
      let uuids = [];
      for (let uuid in this.selectedSimulations) {
        if (this.selectedSimulations[uuid].length) {
          uuids.push(uuid);
        }
      }
      window.location.href = 'compare/?uuid=' + uuids.join('&uuid=');
    },
    getLabel(item) {
      return `${item.alias}`;
    },
    getToken() {
      if (!this.token) {
        this.token = window.sessionStorage.getItem('simdb-token-' + this.server);
      }
      return this.token;
    },
    updatePage(page) {
      this.panels = [];
      if (!this.getToken()) {
        this.dialog = true;
      } else {
        this.fetchData("", "");
      }
    },
    fetchData(username, password) {
      // this.selectedSimulations = [];
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
      const url = config.rootAPI(decodeURIComponent(this.server));
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
