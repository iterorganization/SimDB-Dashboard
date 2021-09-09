const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      server: "",
      uuid: null,
      alias: null,
      inputs: [],
      outputs: [],
      items: [],
      displayItems: [...config.displayFields],
      token: null,
      dialog: true,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  watch: {
    displayItems: function() {
      window.localStorage.setItem('simdb-display-items', JSON.stringify(this.displayItems));
    }
  },
  mounted() {
    const tokens = window.location.pathname.split('/');
    const params = new URLSearchParams(window.location.search);
    this.uuid = tokens[tokens.length - 1];
    this.server = params.get('server') || config.defaultServer;
    if (this.getToken()) {
      this.setItems("", "");
    } else {
      this.dialog = true;
    }
    let displayItems = window.localStorage.getItem('simdb-display-items');
    if (displayItems) {
      this.displayItems = JSON.parse(displayItems);
    }
  },
  methods: {
    addRow(name) {
      if (!this.displayItems.includes(name)) {
        this.displayItems.push(name);
      }
    },
    resetRows() {
      this.displayItems = [...config.displayFields];
    },
    getToken() {
      return this.token || window.sessionStorage.getItem('simdb-token-' + this.server);
    },
    getValue(name) {
      let found = this.items.find(el => el.element.toLowerCase() === name);
      return found ? found.value : null;
    },
    setItems: function (username, password) {
      this.status.show = false;
      this.dialog = false;
      const args = { headers: {} };
      if (this.getToken()) {
        args.headers['Authorization'] = 'JWT-Token ' + this.getToken();
      } else {
        args['auth'] = { username: username, password: password };
      }
      const comp = this;
      const url = 'https://' + this.server + '/api/v' + config.api_version;
      axios
        .get(url + '/simulation/' + this.uuid, args)
        .then(response => {
          this.alias = response.data.alias;
          this.uuid = response.data.uuid.hex;
          this.items = response.data.metadata;
          this.outputs = response.data.outputs;
          this.inputs = response.data.inputs;
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        });
    },
  },
});
