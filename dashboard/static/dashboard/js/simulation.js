const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    return {
      server: null,
      uuid: null,
      alias: null,
      inputs: [],
      outputs: [],
      items: [],
      displayItems: ['description', 'summary.fusion.neutron_fluxes.dd.total.value'],
      token: null,
      dialog: true,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  mounted() {
    const tokens = window.location.pathname.split('/');
    const params = new URLSearchParams(window.location.search);
    this.uuid = tokens[tokens.length - 1];
    this.server = params.get('server') || '0.0.0.0:5000'; // TODO: change to use default server from config.js
    if (this.getToken()) {
      this.setItems("", "");
    } else {
      this.dialog = true;
    }
  },
  methods: {
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
      axios
        .get('http://' + this.server + '/api/v1.0/simulation/' + this.uuid, args)
        .then(response => {
          this.alias = response.data.alias;
          this.uuid = response.data.uuid.hex;
          this.items = response.data.metadata;
          this.outputs = response.data.outputs;
          this.inputs = response.data.inputs;
          // this.displayItems = [];
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        });
    },
  },
});