Vue.component('search-input', {
  delimiters: ['<[', ']>'],
  template: `
  <div>
    <v-row dense>
      <v-col cols="12">
        <v-select filled :items="servers" v-model="selectedServer" label="SimDB Server" hide-details @change="setItems"></v-select>
      </v-col>
    </v-row>
    <v-row dense>
      <v-col cols="12">
        <v-alert text :value="status.show" :type="status.type"><[ status.text ]></v-alert>
      </v-col>
    </v-row>
    <v-divider></v-divider>
    <v-row dense v-for="(item, index) in searchFields" :key="item.name" align="center">
      <v-col cols="6">
        <v-subheader :for="item.name"><[ item.display ]></v-subheader>
      </v-col>
      <v-col cols="6" class="p-0">
        <v-text-field :id="item.name" v-model="searchModels[index]" dense filled hide-details></v-text-field>
      </v-col>
    </v-row>
    <v-row dense v-for="(item, index) in wildSearch" :key="index" align="center">
      <v-col cols="1">
        <v-btn @click="deleteSearch(index)" block class="p-0" small text>
          <v-icon color="blue-grey">mdi-minus-box</v-icon>
        </v-btn>
      </v-col>
      <v-col cols="5">
        <v-autocomplete
            auto-select-first
            clearable
            v-model="item.name"
            :items="items"
            dense
            filled
            hide-details
            no-data-text="loading..."
        ></v-autocomplete>
      </v-col>
      <v-col cols="6" class="p-0">
        <v-text-field :id="item.id" v-model="item.value" dense filled hide-details></v-text-field>
      </v-col>
    </v-row>
    <v-row dense>
      <v-card tile flat dense class="d-flex flex-row-reverse p-0 mt-2">
        <v-btn @click="addSearch" class="p-0" small text dense>
          <v-icon color="blue-grey">mdi-plus</v-icon>
        </v-btn>
      </v-card>
    </v-row>
    <v-divider></v-divider>
    <v-row dense>
      <v-card tile flat dense class="d-flex flex-row-reverse p-0 mt-1">
        <v-btn @click="$emit('search', getQueryPath())">
          <template v-if="getQuery().length == 0">
            Show All
          </template>
          <template v-else>
            Search
            <v-icon>mdi-database-search</v-icon>
          </template>
        </v-btn>
        <v-btn @click="doSearch" class="mr-1" :disabled="getQuery().length == 0">
          Clear
        </v-btn>
      </v-card>
    </v-row>
  </div>
  `,
  data() {
    return {
      items: [],
      wildSearch: [{ value: null }],
      searchModels: [],
      searchFields: config.searchFields.map(el => {
        return { name: el, display: el.toLabel() };
      }),
      servers: config.servers,
      selectedServer: config.defaultServer,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  mounted() {
    this.setItems();
  },
  methods: {
    addSearch: function () {
      this.wildSearch.push({ value: null });
    },
    deleteSearch: function (index) {
      this.wildSearch.splice(index, 1);
    },
    getQueryPath: function () {
      return "?__server="
        + encodeURIComponent(this.selectedServer)
        + '&' + config.searchOutputFields.join('&')
        + '&' + this.getQuery();
    },
    getQuery: function () {
      let args = [];
      for (let i = 0; i < this.searchModels.length; i++) {
        const el = this.searchModels[i];
        if (el) {
          args.push(this.searchFields[i].name + "=" + el)
        }
      }
      for (let i = 0; i < this.wildSearch.length; i++) {
        const name = this.wildSearch[i].name;
        const value = this.wildSearch[i].value;
        if (name && value) {
          args.push(name + "=" + value);
        }
      }
      return args.join('&');
    },
    doSearch: function (evt) {
      const query = this.getQueryPath();
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
      const url = 'https://' + decodeURIComponent(this.selectedServer) + '/api/v' + config.api_version;
      axios
        .get(url + '/metadata')
        .then(response => {
          this.items = response.data.map(el => {
            return { value: el.name, text: el.name.toLabel() }
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
