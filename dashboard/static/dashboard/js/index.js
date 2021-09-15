const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      selectedServer: config.defaultServer,
      searchQuery: null,
    }
  },
  mounted() {
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
    doSearch: function (queryPath) {
      if (queryPath) {
        window.history.pushState({}, 'search', queryPath);
        this.searchQuery = queryPath;
      }
    },
  },
})
