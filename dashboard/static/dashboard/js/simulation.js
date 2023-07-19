const app = new Vue({
  el: '#app',
  vuetify: new Vuetify(),
  delimiters: ['<[', ']>'],
  data() {
    let showAllFields = (typeof(config.displayFields) === 'string' && config.displayFields.toLowerCase() === 'all');
    let displayFields = showAllFields
      ? []
      : [...config.displayFields];
    return {
      server: "",
      uuid: null,
      alias: null,
      inputs: [],
      outputs: [],
      parent: [],
      children: [],
      items: [],
      showAllFields: showAllFields,
      displayItems: displayFields,
      displayHeaders: config.displayHeaders,
      token: null,
      dialog: true,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
      authentication: null,
    }
  },
  watch: {
    displayItems: function() {
      if (!this.showAllFields) {
        window.localStorage.setItem('simdb-display-items', JSON.stringify(this.displayItems));
      }
    }
  },
  mounted() {
    const tokens = window.location.pathname.split('/');
    const params = new URLSearchParams(window.location.search);
    let aliasIdx = tokens.findIndex(el => el === 'alias');
    if (aliasIdx >= 0) {
      this.alias = tokens.slice(aliasIdx + 1).join('/');
    } else {
      this.uuid = tokens[tokens.length - 1];
    }
    this.server = params.get('server') || config.defaultServer;
    this.updateAuth().then(_ => {
      if (this.requiresAuth() && !this.getToken()) {
        this.dialog = true;
      } else {
        this.setItems("", "");
      }
      let displayItems = window.localStorage.getItem('simdb-display-items');
      if (displayItems) {
        this.displayItems = JSON.parse(displayItems);
      }
    });
  },
  methods: {
    valueFor(name) {
      return this[name];
    },
    updateAuth() {
      this.status.show = false;
      const url = config.rootURL(decodeURIComponent(this.server));
      const comp = this;
      return fetch(url)
        .then(response => response.json())
        .then(data => {
          comp.authentication = data.authentication;
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.error = error;
          comp.status.type = 'error';
        });
    },
    addRow(name) {
      if (!this.displayItems.includes(name)) {
        this.displayItems.push(name);
      }
    },
    removeRow() {
      this.displayItems.pop();
    },
    resetRows() {
      this.displayItems = this.showAllFields
        ? []
        : [...config.displayFields];
    },
    requiresAuth() {
      return this.authentication !== null && this.authentication !== "None";
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
        args.headers['Authorization'] = {
          'Authorization': 'Basic ' + btoa(username + ":" + password)
        }
      }
      const comp = this;
      const url = config.rootAPI(decodeURIComponent(this.server));
      let sim_id = this.uuid ? this.uuid : this.alias;
      fetch(url + '/simulation/' + sim_id, args)
        .then(response => response.json())
        .then(data => {
          comp.alias = data.alias;
          comp.uuid = data.uuid.hex;
          comp.items = data.metadata;
          comp.outputs = data.outputs;
          comp.inputs = data.inputs;
          comp.parents = data.parents;
          comp.children = data.children;
          if (comp.showAllFields) {
            comp.displayItems = data.metadata.map(el => el.element);
          }
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        });
    },
  },
});
