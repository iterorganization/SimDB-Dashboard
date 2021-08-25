Vue.component('DataRow', {
  delimiters: ['<[', ']>'],
  template: `
  <tr>
    <td style="min-width: 25em"><[ name.toLabel() ]></td>
    <td>
      <v-container style="width: 70%" class="ml-0">
        <template v-if="isXML()">
          <pre style="max-height: 400px">
<[ value ]>
          </pre>
        </template>
        <template v-else-if="isArray()">
          <plotly-loader :id="'plot' + index" :ydata="processValue(value)" :ylabel="name" :xdata="getXData()" xlabel="time"></plotly-loader>
        </template>
        <template v-else>
          <[ processValue(value) ]>
        </template>
      </v-container>
    </td>
  </tr>
  `,
  props: {
    name: null,
    value: null,
    index: null,
    data: null,
  },
  methods: {
    getXData: function (name, value) {
      let root = this.name.split('.')[0];
      let time = this.data.find(el => el.element === root + '.time');
      return time ? this.processValue(time.value) : null;
    },
    processValue: function (value) {
      if (!value) {
        return "No data available.";
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
      return (this.value && this.value.hasOwnProperty('_type') && this.value._type === 'numpy.ndarray');
    },
  },
});