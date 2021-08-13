Vue.component('SkeletonBox', {
  delimiters: ['<[', ']>'],
  template: `
  <span :style="{ height, width: computedWidth }" class="SkeletonBox" />
  `,
  props: {
    maxWidth: {
      default: 100,
      type: Number,
    },
    minWidth: {
      default: 80,
      type: Number,
    },
    height: {
      default: '1em',
      type: String,
    },
    width: {
      default: null,
      type: String,
    },
  },
  computed: {
    computedWidth() {
      return this.width || `${Math.floor((Math.random() * (this.maxWidth - this.minWidth)) + this.minWidth)}%`;
    }
  }
})

Vue.component('Plotly', {
  delimiters: ['<[', ']>'],
  template: `
  <div :id="id" style="width:600px;height:250px;"></div>
  `,
  props: {
    data: {
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
  },
  mounted () {
    Plotly.newPlot(this.$el, [{
      y: this.data,
    }]);
  },
})

Vue.component('PlotlyContainer', {
  delimiters: ['<[', ']>'],
  props: {
    data: {
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
  },
  data () {
    return {
      isVisible: false,
    }
  },
  template: `
    <div>
      <plotly v-if="isVisible" :id="id" :data="data"></plotly>
      <skeleton-box height="250px" v-else>Loading</skeleton-box>
    </div>
  `,
  mounted () {
    let comp = this;
    var observer = new IntersectionObserver(function(entries) {
        if (entries[0]['isIntersecting'] === true) {
            if (entries[0]['intersectionRatio'] > 0) {
                comp.isVisible = true;
            }
        } else {
          comp.isVisible = false;
        }
    }, { threshold: 0 });
    observer.observe(this.$el);
  },
})

const process_array_key = function( word ) {
    return word.replace(/(.*)#(\d+)/, '$1[$2]')
}

const capitalize = function( word ) {
    return word[0].toUpperCase() + word.slice(1);
}

const to_label = function( name ) {
    return name.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
}

const to_buf = function( str ) {
    var bytes = window.atob(str);
    var buf = new ArrayBuffer(bytes.length);
    var dv = new DataView(buf);
    for (var i = 0; i < bytes.length; i++) {
        dv.setUint8(i, bytes.charCodeAt(i));
    }
    return buf;
}

const to_i32_array = function( str ) {
    return new Int32Array(to_buf(str));
}

const to_f32_array = function( str ) {
    return new Float32Array(to_buf(str));
}

const to_f64_array = function( str ) {
    return new Float64Array(to_buf(str));
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
    processData: function (data) {
      if (data.hasOwnProperty('_type') && data._type == 'numpy.ndarray') {
        if (data.dtype == "int32") {
            return to_i32_array(data.bytes);
        } else if (data.dtype == "float32") {
            return to_f32_array(data.bytes);
        } else if (data.dtype == "float64") {
            return to_f64_array(data.bytes);
        } else {
            return "Unknown data type: " + data.dtype;
        }
      }
      return data;
    },
    isXML: function (data) {
      return (typeof data == "string") && data.startsWith('<?xml');
    },
    isArray: function (data) {
      return (data.hasOwnProperty('_type') && data._type == 'numpy.ndarray');
    },
    drawPlot: function (index, data) {
      var plot = document.getElementById('plot' + index);
      Plotly.newPlot(plot, [{
        x: [1, 2, 3, 4, 5],
        y: [1, 2, 4, 8, 16]
      }]);
      return '';
    },
  },
});