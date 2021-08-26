Vue.component('CompareRow', {
  delimiters: ['<[', ']>'],
  template: `
  <tr v-if="!isArray(name)">
    <td style="min-width: 20em"><[ name.toLabel() ]></td>
    <td v-for="uuid in uuids">
      <v-container class="ml-0">
        <template v-if="isXML(uuid, name)">
          <pre style="max-height: 400px">
<[ getValue(uuid, name) ]>
          </pre>
        </template>
        <template v-else>
          <[ processValue(uuid, name) ]>
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
    simulations: {
      required: true,
    },
    uuids: {
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    data: {
      required: true,
    },
  },
  methods: {
    getValue: function (simulation, name) {
      let item = simulation == null ? null : simulation.items.find(el => el.element === name);
      return item != null ? item.value : null;
    },
    processValue: function (uuid, name) {
      let simulation = this.getSimulation(uuid);
      let value = this.getValue(simulation, name);
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
    getSimulation: function (uuid) {
      return this.simulations.find(el => el.uuid === uuid);
    },
    isXML: function (uuid, name) {
      let simulation = this.getSimulation(uuid);
      let value = this.getValue(simulation, name);
      return (typeof value == "string") && value.startsWith('<?xml');
    },
    isArray: function (name) {
      return this.simulations
        .map(sim => this.getValue(sim, name))
        .some(value => value && value.hasOwnProperty('_type') && value._type === 'numpy.ndarray');
    },
  },
});

Vue.component('ComparePlot', {
  delimiters: ['<[', ']>'],
  template: `
  <tr v-if="isArray(name)">
    <td style="min-width: 20em"><[ name.toLabel() ]></td>
    <td :colspan="simulations.length">
      <v-container class="ml-0">
        <plotly-loader
          v-if="loaded"
          :id="'plot' + index"
          :traces="getTraces(name)"
          :ylabel="name"
          xlabel="time"
          width="800px"
          height="600px">    
      </plotly-loader>
      </v-container>
    </td>
  </tr>
  `,
  props: {
    name: {
      type: String,
      required: true,
    },
    simulations: {
      required: true,
    },
    uuids: {
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    data: {
      required: true,
    },
    loaded: {
      required: true,
    }
  },
  methods: {
    getTraces: function (name) {
      return this.uuids.map(uuid => {
        let simulation = this.simulations.find(sim => sim.uuid === uuid);
        let data = {
          y: this.processValue(simulation, name),
          name: simulation.alias || simulation.uuid,
        };
        let xdata = this.getXData(simulation, name);
        if (xdata) {
          data['x'] = xdata;
        }
        return data;
      });
    },
    getValue: function (simulation, name) {
      let item = simulation == null ? null : simulation.items.find(el => el.element === name);
      return item != null ? item.value : null;
    },
    getXData: function (simulation, name) {
      let root = name.split('.')[0];
      let time = this.data.find(el => el.element === root + '.time');
      return time ? this.processValue(simulation, name) : null;
    },
    processValue: function (simulation, name) {
      let value = this.getValue(simulation, name);
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
    isXML: function (simulation, name) {
      let value = this.getValue(simulation, name);
      return (typeof value == "string") && value.startsWith('<?xml');
    },
    isArray: function (name) {
      return this.simulations
        .map(sim => this.getValue(sim, name))
        .some(value => value && value.hasOwnProperty('_type') && value._type === 'numpy.ndarray');
    },
  },
});