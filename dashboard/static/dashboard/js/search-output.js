Vue.component('search-output', {
  delimiters: ['<[', ']>'],
  template: `
    <div>
      <auth-dialog :server="server" :show="dialog" @ok="fetchData" @error="dialog = false"></auth-dialog>
      <v-data-table
        v-model="selected"
        :headers="searchHeaders"
        :items="items"
        :sort-by.sync="sortBy"
        :sort-desc.sync="sortDesc"
        :page.sync="page"
        :items-per-page="itemsPerPage"
        single-select="false"
        :single-expand="singleExpand"
        :expanded.sync="expanded"
        item-key="uuid.hex"
        show-expand
        show-select
        @page-count="pageCount = $event"
        >
        <template v-slot:top>
          <v-card fluid class="d-flex align-center" flat tile>
            <v-toolbar-title>Search Results</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-switch v-model="singleExpand" label="single expand" class=""></v-switch>
            <v-btn dense text @click="doCompare" :disabled="selected.length < 2">
              Compare
            </v-btn>
          </v-card>
        </template>
        <template v-slot:item.alias="{ item }">
          <a :href="'uuid/' + item.uuid.hex + '?server=' + server" @click.stop=""><[ item.alias ]></a>
        </template>
        <template v-slot:item.datetime="{ item }">
          <[ (new Date(item.datetime)).toUTCString() ]>
        </template>
        <template v-slot:expanded-item="{ headers, item }">
          <td :colspan="headers.length">
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
          </td>
        </template>
      </v-data-table>
      <v-overlay :value="loading">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-overlay>
    </div>
  `,
  data: function () {
    return {
      loading: false,
      singleExpand: false,
      expanded: [],
      selected: [],
      searchHeaders: [],
      itemsPerPage: 10,
      count: 0,
      items: [],
      page: 1,
      pageCount: 0,
      dialog: false,
      token: null,
      error: null,
      selectedSimulations: {},
      panels: [],
      sortDesc: true,
      sortBy: null,
      sortItems: ['status', 'run', 'shot'],
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
      const sort = params.get('__sort');
      if (sort) {
        this.sort = sort;
      }
      this.sortDescending = !Array.from(params.keys()).includes('__sort_asc');
      this.sortItems = Array.from(params.keys()).filter(el => !el.startsWith('__')).sort();
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
      let additionalColumns = Array.from(params.keys())
        .filter(el => !el.startsWith('__'))
        .filter(el => params.getAll(el).join(''))
        .filter(onlyUnique)
        .filter(el => !config.searchOutputColumns.includes(el))
      let searchColumns = config.searchOutputColumns.concat(additionalColumns);
      this.searchHeaders = searchColumns.map(el => {
        let value = "";
        if (el === "alias" || el === "datetime") {
          value = el;
        } else if (el === "uuid") {
          value = "uuid.hex";
        } else {
          value = "metadata." + el.replaceAll('.', '_dot_');
        }
        return { text: el.toLabel(), align: 'start', sortable: true, value: value };
      });
    }
  },
  methods: {
    toggleSort() {
      this.sortDescending = !this.sortDescending;
      this.updatePage();
    },
    doCompare() {
      let uuids = this.selected.map(el => el.uuid.hex);
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
    updatePage() {
      this.panels = [];
      const params = new URLSearchParams(window.location.search);
      params.delete('__sort')
      params.delete('__sort_asc')
      params.append('__sort', this.sort)
      if (!this.sortDescending) {
        params.append('__sort_asc', '')
      }
      window.history.pushState({}, 'sort', '?' + params.toString());
      if (!this.getToken()) {
        this.dialog = true;
      } else {
        this.fetchData("", "");
      }
    },
    fetchData(username, password) {
      this.dialog = false;
      if (!this.query) {
        return;
      }
      this.loading = true;
      const args = {
        headers: {'simdb-result-limit': 0, 'simdb-page': this.page},
      };
      if (this.sort) {
        args.headers['simdb-sort-by'] = this.sort;
        args.headers['simdb-sort-asc'] = !this.sortDescending;
      }
      if (this.getToken()) {
        args.headers['Authorization'] = 'JWT-Token ' + this.token;
      } else {
        args.headers['Authorization'] = {
          'Authorization': 'Basic ' + btoa(username + ":" + password)
        }
      }
      const params = new URLSearchParams(this.query);
      const keys = Array.from(params.keys());
      for (let key of keys) {
        if (key.startsWith('__')) {
          params.delete(key);
        }
      }
      const query = params.toString();
      const url = config.rootAPI(decodeURIComponent(this.server));
      const comp = this;
      fetch(url + '/simulations?' + query, args)
        .then(response => response.json())
        .then(data => {
          comp.items = data.results.map(el => {
            // Adding a version of the metadata to that the table can dynamically read
            el.metadata.forEach(m => { el.metadata[m.element.replaceAll('.', '_dot_')] = m.value });
            return el;
          });
          // comp.items = data.results;
          comp.count = data.count;
          comp.page = data.page;
          comp.pageCount = Math.ceil(data.count / 10);
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        })
        .finally(function () {
          comp.loading = false;
        });
    },
  }
})
