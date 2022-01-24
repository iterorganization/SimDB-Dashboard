Vue.component('DataRow', {
  delimiters: ['<[', ']>'],
  template: `
  <tr>
    <td style="min-width: 25em"><[ name.toLabel() ]></td>
    <td style="min-width: 35em">
      <v-container style="width: 70%" class="ml-0">
        <template v-if="isXML()">
          <v-card height="400px" class="scroll">
            <pre style="max-height: 400px">
<[ value ]>
            </pre>
          </v-card>
        </template>
        <template v-else-if="isArray()">
          <plotly-loader :id="'plot' + index" :traces="getTraces(value)" :ylabel="name" xlabel="time"></plotly-loader>
        </template>
        <template v-else-if="isUUID()">
          <a :href="'uuid/' + value.hex" :title="value.hex"><[ value.hex ]></a>
        </template>
        <template v-else-if="isShortString()">
          <a :href="'/?__server=' + server + '&' + name + '=eq:' + value"><[ processValue(value) ]></a>
        </template>
        <template v-else-if="value">
          <span style="white-space: pre-wrap;">
<[ processValue(value) ]>
          </span>
        </template>
        <template v-else>
          No data available.
        </template>
      </v-container>
    </td>
  </tr>
  `,
  props: {
    name: {
      type: String,
      required: true,
    },
    value: {
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    data: {
      required: true,
    },
    server: {
      required: true,
    },
  },
  methods: {
    getTraces: function (value) {
      let data = {
        y: this.processValue(value),
      };
      let xdata = this.getXData();
      if (xdata) {
        data['x'] = xdata;
      }
      return [data];
    },
    getXData: function () {
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
    isUUID: function () {
      return (this.value && this.value.hasOwnProperty('_type') && this.value._type === 'uuid.UUID');
    },
    isShortString: function () {
      return (this.value && this.value.toString && this.value.toString().length < 20);
    },
  },
});