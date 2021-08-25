Vue.component('RowAdder', {
  template: `
      <tr>
      <td class="p-0 pb-3">
        <v-autocomplete
            auto-select-first
            v-model="selectedItem"
            :items="items"
            dense
            filled
            hide-details
            no-data-text="loading..."
        ></v-autocomplete>
      </td>
      <td class="pb-3">
        <v-btn class="m-1 ml-3" :disabled="!(selectedItem && selectedItem.length > 0)" @click="$emit('add', selectedItem)">
          Add Data
        </v-btn>
        <v-btn class="m-1" @click="$emit('reset')">
          Reset
        </v-btn>
      </td>
    </tr>
  `,
  props: {
    server: {
      type: String,
      required: true,
    }
  },
  data() {
    return {
      items: [],
      selectedItem: null,
      status: {
        show: false,
        text: null,
        type: 'error',
      },
    }
  },
  mounted() {
    this.setOptions();
  },
  watch: {
    server: function (newVal, oldVal) {
      this.setOptions();
    }
  },
  methods: {
    setOptions: function () {
      if (!this.server) {
        return;
      }
      this.status.show = false;
      const url = 'http://' + decodeURIComponent(this.server) + '/api/v1.0';
      const comp = this;
      axios
        .get(url + '/metadata')
        .then(response => {
          this.items = response.data.map(el => {
            return { value: el.name, text: el.name.toLabel() }
          })
        })
        .catch(function (error) {
          comp.status.show = true;
          comp.status.text = error;
          comp.status.type = 'error';
        });
    },
  }
});