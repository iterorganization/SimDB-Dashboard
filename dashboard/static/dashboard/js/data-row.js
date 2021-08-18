const to_buf = function (str) {
  const bytes = window.atob(str);
  const buf = new ArrayBuffer(bytes.length);
  const dv = new DataView(buf);
  for (let i = 0; i < bytes.length; i++) {
    dv.setUint8(i, bytes.charCodeAt(i));
  }
  return buf;
}

const to_i32_array = function (str) {
  return new Int32Array(to_buf(str));
}

const to_f32_array = function (str) {
  return new Float32Array(to_buf(str));
}

const to_f64_array = function (str) {
  return new Float64Array(to_buf(str));
}

const process_array_key = function (word) {
  return word.replace(/(.*)#(\d+)/, '$1[$2]')
}

const capitalize = function (word) {
  return word[0].toUpperCase() + word.slice(1);
}

const to_label = function (name) {
  return name.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
}

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
    <div :id="id" style="width:600px;height:400px;"></div>
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
  mounted() {
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
  data() {
    return {
      isVisible: false,
    }
  },
  template: `
    <div>
      <plotly v-if="isVisible" :id="id" :data="data"></plotly>
      <skeleton-box height="400px" v-else>Loading</skeleton-box>
    </div>
  `,
  mounted() {
    let comp = this;
    const observer = new IntersectionObserver(function (entries) {
      if (entries[0]['isIntersecting'] === true) {
        if (entries[0]['intersectionRatio'] > 0) {
          comp.isVisible = true;
        }
      } else {
        comp.isVisible = false;
      }
    }, {threshold: 0});
    observer.observe(this.$el);
  },
})

Vue.component('DataRow', {
  delimiters: ['<[', ']>'],
  template: `
  <tr>
    <td><[ toLabel(label) ]></td>
    <td>
      <div v-if="isXML(value)">
        <v-container style="width: 70%;">
        <pre style="max-height: 400px">
<[ value ]>
        </pre>
        </v-container>
      </div>
      <div v-else-if="isArray(value)">
        <v-container style="width: 70%">
        <plotly-container :id="'plot' + index" :data="processData(value)"></plotly-container>
        </v-container>
      </div>
      <div v-else>
        <v-container style="width: 70%">
          <[ processData(value) ]>
        </v-container>
      </div>
    </td>
  </tr>
  `,
  props: {
    label: null,
    value: null,
    index: null,
  },
  methods: {
    processData: function (data) {
      if (!data) {
        return toString(data);
      }
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
      const plot = document.getElementById('plot' + index);
      Plotly.newPlot(plot, [{
        x: [1, 2, 3, 4, 5],
        y: [1, 2, 4, 8, 16]
      }]);
      return '';
    },
    toLabel: function (name) {
      return to_label(name);
    },
  },
});