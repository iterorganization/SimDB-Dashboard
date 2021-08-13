Vue.component('search-output', {
  delimiters: ['<[', ']>'],
  data: function () {
    return {
      loading: false,
      count: 0,
      items: [],
      url: null,
      page: 1,
      page_count: 0,
    }
  },
  template: `
    <div>
    <v-expansion-panels multiple accordion>
      <v-expansion-panel
          v-for="(item,i) in items"
          :key="i"
      >
        <v-expansion-panel-header>
          <v-btn :href="'simulation/uuid/' + item.uuid.hex" @click.stop="" text><[ item.alias ]></v-btn>
          <v-spacer></v-spacer>
          <v-spacer></v-spacer>
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
    <v-pagination v-model="page" :length="page_count" @input="fetchData"></v-pagination>
    <v-overlay :value="loading">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>
    </div>
  `,
  mounted () {
    this.fetchData()
  },
  methods: {
    fetchData (page = 1) {
      this.loading = true;
      const path = this.$route.fullPath.replace('search', 'simulations');
      this.url = path;
      //console.log(this.server);
      axios
        .get('http://0.0.0.0:5000/api/v1.0' + path, {
          auth: { username: 'admin', password: 'admin' },
          headers: { 'SimDB-Result-Limit': 10, 'SimDB-Page': page }
        })
        .then(response => {
          //this.items = response.data.map(el => { return { value: el.name, text: to_label(el.name) } });
          this.items = response.data.results;
          this.count = response.data.count;
          this.page = response.data.page;
          this.page_count = parseInt(response.data.count / 10);
          this.loading = false;
        })
    },
  }
})

const SearchOutput = { template: '<search-output></search-output>' }

const routes = [
  { path: '/search', component: SearchOutput },
]

const router = new VueRouter({
  mode: 'history',
  routes: routes
})

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
  router: router,
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
    }
  },
  mounted () {
    this.setItems();
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
      return query + "&index&description&status";
    },
    doSearch: function (evt) {
      const query = this.getQuery();
      this.$router.push("/search?" + query);
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