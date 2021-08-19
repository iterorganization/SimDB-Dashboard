const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      items: [],
      wildSearch: [{ value: null }],
      searchModels: [],
      searchFields: searchFields.map(el => {
        return { name: el, display: to_label(el) };
      }),
      servers: [
        '0.0.0.0:5000',
        '0.0.0.0:4000',
      ],
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
      this.wildSearch.push({ value: null });
    },
    deleteSearch: function (index) {
      this.wildSearch.splice(index, 1);
    },
    getQueryPath: function () {
      return "?__server="
        + encodeURIComponent(this.selectedServer)
        + "&description&status&summary.fusion.neutron_fluxes.thermal.value&"
        + this.getQuery();
    },
    getQuery: function () {
      let query = "";
      for (let i = 0; i < this.searchModels.length; i++) {
        const el = this.searchModels[i];
        if (el) {
          query += this.searchFields[i].name + "=" + el + "&";
        }
      }
      for (let i = 0; i < this.wildSearch.length; i++) {
        const name = this.wildSearch[i].name;
        const value = this.wildSearch[i].value;
        if (name && value) {
          query += name + "=" + value + "&";
        }
      }
      return query;
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