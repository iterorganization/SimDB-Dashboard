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
        server: 'http://0.0.0.0:5000/api/v1.0',
        uuid: null,
        alias: null,
        inputs: [],
        outputs: [],
        metadata: [],
        status: {
          show: false,
          text: null,
          type: 'error',
        },
    }
  },
  mounted () {
    var tokens = window.location.href.split('/');
    this.uuid = tokens[tokens.length - 1];
    this.setItems();
  },
  methods: {
    toLabel: function (name) {
      return to_label(name);
    },
    setItems: function () {
      this.status.show = false;
      axios
        .get(this.server + '/simulation/' + this.uuid, {
          auth: { username: 'admin', password: 'admin' }
        })
        .then(response => {
          this.alias = response.data.alias;
          this.uuid = response.data.uuid.hex;
          this.metadata = response.data.metadata;
          this.outputs = response.data.outputs;
          this.inputs = response.data.inputs;
        })
        .catch(function (error) {
          app.status.show = true;
          app.status.text = error;
          app.status.type = 'error';
        });
    },
  },
});