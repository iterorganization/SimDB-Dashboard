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
      <v-col cols="5">
        <v-subheader :for="item.name"><[ item.display ]></v-subheader>
      </v-col>
      <v-col cols="2" class="p-0" style="padding-right: 0">
        <v-select
            dense
            filled 
            hide-details 
            :items="comparators" 
            v-model="item.comparator" 
            @mouseover.native="item.hover = true" 
            @mouseleave.native="item.hover = false"  
            style="font-size: 0.7em">
        </v-select>
        <v-card v-if="item.hover" style="position: absolute; padding: 0.2em"><[ helpText(item.comparator) ]></v-card>
      </v-col>
      <v-col cols="5" class="p-0" style="padding-left: 0">
        <v-text-field :id="item.name" v-model="item.value" dense filled hide-details></v-text-field>
      </v-col>
    </v-row>
    <v-row dense v-for="(item, index) in wildSearch" :key="index" align="center">
      <v-col cols="1">
        <v-btn @click="deleteSearch(index)" block small text style="padding: 0">
          <v-icon color="blue-grey">mdi-minus-box</v-icon>
        </v-btn>
      </v-col>
      <v-col cols="4">
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
      <v-col cols="2" class="p-0" style="padding-right: 0">
        <v-select 
            dense 
            filled
            hide-details 
            @mouseover.native="item.hover = true" 
            @mouseleave.native="item.hover = false" 
            :items="comparators" 
            v-model="item.comparator" 
            style="font-size: 0.7em">  
        </v-select>
        <v-card v-if="item.hover" style="position: absolute; padding: 0.2em"><[ helpText(item.comparator) ]></v-card>
      </v-col>
      <v-col cols="5" style="padding: 0">
        <v-text-field v-model="item.value" dense filled hide-details></v-text-field>
      </v-col>
    </v-row>
    <v-row dense class="d-flex flex-row-reverse">
      <v-card tile flat dense class="mt-2 mb-2" style="padding: 0">
        <v-btn @click="addSearch" class="p-0" small text dense>
          <v-icon color="blue-grey">mdi-plus</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </v-card>
    </v-row>
    <v-row dense>
      <v-divider></v-divider>
    </v-row>
    <v-row dense>
      <v-card tile flat dense class="d-flex flex-row-reverse p-0 mt-2">
        <v-btn @click="$emit('search', getQueryPath())">
          <template v-if="getQuery().length == 0">
            Show All
          </template>
          <template v-else>
            Search
            <v-icon>mdi-database-search</v-icon>
          </template>
        </v-btn>
        <v-btn @click="clearSearch" class="mr-1" :disabled="getQuery().length == 0">
          Clear
        </v-btn>
      </v-card>
    </v-row>
  </div>
  `,
  data() {
    return {
      items: [],
      wildSearch: [{value: null, comparator: 'eq', hover: false}],
      searchFields: config.searchFields.map(el => {
        return {name: el, display: el.toLabel(), value: null, comparator: 'eq', hover: false};
      }),
      servers: config.servers,
      selectedServer: config.defaultServer,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
      comparators: ['eq', 'in', 'gt', 'ge', 'lt', 'le'],
    }
  },
  mounted() {
    this.setItems();
  },
  methods: {
    addSearch: function () {
      this.wildSearch.push({value: null, comparator: 'eq', hover: false});
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
      for (let i = 0; i < this.searchFields.length; i++) {
        const name = this.searchFields[i].name;
        const comp = this.searchFields[i].comparator + ":";
        const value = this.searchFields[i].value;
        if (value) {
          args.push(name + "=" + comp + value)
        }
      }
      for (let i = 0; i < this.wildSearch.length; i++) {
        const name = this.wildSearch[i].name;
        const comp = this.wildSearch[i].comparator + ":";
        const value = this.wildSearch[i].value;
        if (name && value) {
          args.push(name + "=" + comp + value);
        }
      }
      return args.join('&');
    },
    clearSearch: function () {
      for (let i = 0; i < this.searchFields.length; i++) {
        this.searchFields[i].value = null;
        this.searchFields[i].comparator = "eq";
      }
    },
    doSearch: function () {
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
            return {value: el.name, text: el.name.toLabel()}
          })
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        });
    },
    helpText: function (item) {
      const help = {
        "eq": "Equals",
        "in": "Contained in",
        "gt": "Greater than",
        "ge": "Greater than or equal to",
        "lt": "Less than",
        "le": "Less than or equal to",
      }
      return help[item];
    }
  },
})
