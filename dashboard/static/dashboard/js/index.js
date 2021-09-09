const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
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
      searchQuery: null,
    }
  },
  mounted() {
    this.setItems();
    this.searchQuery = window.location.search;
    window.onpopstate = this.handleStateChange;
  },
  beforeDestroy () {
    window.onpopstate = null;
  },
  methods: {
    handleStateChange: function() {
      app.searchQuery = window.location.search;
    },
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
