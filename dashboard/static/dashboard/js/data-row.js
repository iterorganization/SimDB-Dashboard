Vue.component('DataRow', {
  delimiters: ['<[', ']>'],
  template: `
  <tr>
    <td><[ toLabel() ]></td>
    <td>
      <div v-if="isXML()">
        <v-container style="width: 70%;">
        <pre style="max-height: 400px">
<[ value ]>
        </pre>
        </v-container>
      </div>
      <div v-else-if="isArray()">
        <v-container style="width: 70%">
        <plotly-loader :id="'plot' + index" :ydata="processValue(value)" :ylabel="label" :xdata="getXData()" xlabel="time"></plotly-loader>
        </v-container>
      </div>
      <div v-else>
        <v-container style="width: 70%">
          <[ processValue(value) ]>
        </v-container>
      </div>
    </td>
  </tr>
  `,
  props: {
    label: null,
    value: null,
    index: null,
    data: null,
  },
  methods: {
    getXData: function (name, value) {
      let root = this.label.split('.')[0];
      let time = this.data.find(el => el.element === root + '.time');
      return time ? this.processValue(time.value) : null;
    },
    processValue: function (value) {
      if (!value) {
        return toString(value);
      }
      if (value.hasOwnProperty('_type') && value._type === 'numpy.ndarray') {
        if (value.dtype === "int32") {
          return to_i32_array(value.bytes);
        } else if (value.dtype === "float32") {
          return to_f32_array(value.bytes);
        } else if (value.dtype === "float64") {
          return to_f64_array(value.bytes);
        } else {
          return "Unknown data type: " + value.dtype;
        }
      }
      return value;
    },
    isXML: function () {
      return (typeof this.value == "string") && this.value.startsWith('<?xml');
    },
    isArray: function () {
      return (this.value.hasOwnProperty('_type') && this.value._type === 'numpy.ndarray');
    },
    toLabel: function () {
      return this.label.toLabel();
    },
  },
});