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
      server: 'http://0.0.0.0:5000/api/v1.0',
      token: null,
      error: null,
    }
  },
  props: {
    query: null,
  },
  watch: {
    query: function (newVal, oldVal) {
      if (this.query) {
        if (!this.token) {
          this.dialog = true;
        } else {
          this.fetchData("", "", page);
        }
      }
    }
  },
  template: `
    <div>
    <v-dialog v-model="dialog" persistent max-width="400px">
      <v-card>
        <v-card-title class="text-h5">
          Authentication Credentials
        </v-card-title>
        <v-card-text>
          Please enter your credentials for server <[ server ]>.
        <v-container>
          <v-row>
            <v-col cols="12" sm="6" md="6">
              <v-text-field id="username" label="Username"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="6">
              <v-text-field id="password" type="password" label="Password"></v-text-field>
            </v-col>
          </v-row>
        </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="dialog = false">
            Cancel
          </v-btn>
          <v-btn color="green darken-1" text @click="submit">
            Submit
          </v-btn>
          <v-btn color="green darken-1" text @click="storeToken">
            Generate Token
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <div v-if="items.length > 0">
    <v-expansion-panels multiple accordion>
      <v-expansion-panel
          v-for="(item,i) in items"
          :key="i"
      >
        <v-expansion-panel-header>
          <span>
          <a :href="'simulation/uuid/' + item.uuid.hex" @click.stop=""><[ item.alias ]></a>
          </span>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-simple-table>
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              <tr v-for="field in item.metadata">
                <td><[ field.element ]></td><td><[ field.value ]></td>
              </tr>
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
  mounted () {
//    this.fetchData()
  },
  methods: {
    submit (evt) {
      var username = document.getElementById('username').value;
      var password = document.getElementById('password').value;
      this.dialog = false;
      this.fetchData(username, password, this.page);
    },
    storeToken (evt) {
      var username = document.getElementById('username').value;
      var password = document.getElementById('password').value;
      var comp = this;
      axios
        .get(this.server + '/token', {
          auth: { username: username, password: password },
        })
        .then(response => {
          this.token = response.data.token;
          this.fetchData("", "", this.page);
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        })
        .finally(function () {
          comp.dialog = false;
        })
    },
    updatePage (page) {
       if (!this.token) {
         this.dialog = true;
       } else {
         this.fetchData("", "", page);
       }
    },
    fetchData (username, password, page = 1) {
      if (!this.query) {
        return;
      }
      this.loading = true;
      var comp = this;
      var args = {
        headers: { 'simdb-result-limit': 10, 'simdb-page': page },
      };
      if (this.token) {
        args.headers['Authorization'] = 'JWT-Token ' + this.token;
      } else {
        args['auth'] = { username: username, password: password };
      }
      axios
        .get(this.server + '/simulations' + this.query, args)
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

//const SearchOutput = { template: '<search-output></search-output>' }
//
//const routes = [
//  { path: '/search', component: SearchOutput },
//]
//
//const router = new VueRouter({
//  mode: 'history',
//  routes: routes
//})

const process_array_key = function( word ) {
    return word.replace(/(.*)#(\d+)/, '$1[$2]')
}

const capitalize = function( word ) {
    return word[0].toUpperCase() + word.slice(1);
}

const to_label = function( name ) {
    return name.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
}

const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data () {
    return {
      items: [],
      value: null,
      wild_search: [{ id: 'search-1' }],
      searchModels: [],
      searchFields: searchFields.map(el => { return { name: el, display: to_label(el) }; }),
      servers: [
        'http://0.0.0.0:5000/api/v1.0',
        'http://0.0.0.0:4000/api/v1.0',
      ],
      selectedServer: 'http://0.0.0.0:5000/api/v1.0',
      status: {
        show: false,
        text: null,
        type: 'error',
      },
      searchQuery: null,
    }
  },
  mounted () {
    this.setItems();
    var url = new URL(location.href);
    this.searchQuery = url.search;
  },
  methods: {
    addSearch: function () {
      this.search.push({});
    },
    deleteSearch: function (index) {
      this.search.splice(index, 1);
    },
    getQuery: function() {
      const len = this.searchModels.length;
      var query = "";
      for (var i = 0; i < len; i++) {
        const el = this.searchModels[i];
        if (el) {
          query += this.searchFields[i].name + "=" + el + "&";
        }
      }
      if (query) {
        query += "description&status";
      }
      return "?" + query;
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
      axios
        .get(this.selectedServer + '/metadata')
        .then(response => {
          this.items = response.data.map(el => { return { value: el.name, text: to_label(el.name) } })
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        });
    },
  },
})