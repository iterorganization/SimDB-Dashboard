Vue.component('search-output', {
  delimiters: ['<[', ']>'],
  data: function () {
    return {
      loading: false,
      count: 0,
      items: [],
      page: 1,
      page_count: 0,
    }
  },
  props: {
    query: null,
  },
  watch: {
    query: function (newVal, oldVal) {
      this.fetchData();
    }
  },
  template: `
    <div>
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
    <v-pagination v-model="page" :length="page_count" @input="fetchData"></v-pagination>
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
    this.fetchData()
  },
  methods: {
    fetchData (page = 1) {
      if (!this.query) {
        return;
      }
      this.loading = true;
      axios
        .get('http://0.0.0.0:5000/api/v1.0/simulations' + this.query, {
          auth: { username: 'admin', password: 'admin' },
          headers: { 'SimDB-Result-Limit': 10, 'SimDB-Page': page }
        })
        .then(response => {
          this.items = response.data.results;
          this.count = response.data.count;
          this.page = response.data.page;
          this.page_count = parseInt(response.data.count / 10);
          this.loading = false;
        })
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