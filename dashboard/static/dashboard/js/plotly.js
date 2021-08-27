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
    <div :id="id" :style="style"></div>
  `,
  props: {
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    traces: {
      required: true,
    },
    xlabel: {
      type: String,
    },
    ylabel: {
      type: String,
    },
    width: {
      type: String,
      required: true,
    },
    height: {
      type: String,
      required: true,
    }
  },
  mounted() {
    let layout = {
      title: {
        text: this.title,
      },
      xaxis: {
        title: {
          text: this.xlabel,
        },
      },
      yaxis: {
        title: {
          text: this.ylabel,
        },
      },
    };
    if (this.traces.length > 1) {
      layout['showlegend'] = true;
      layout['legend'] = { x: 1, xanchor: 'right', y: 1, };
    }
    Plotly.newPlot(this.$el, this.traces, layout);
  },
  computed: {
    style: function () {
      return "width: " + this.width + ";height: " + this.height + ";margin-left: calc((100% - " + this.width + ") / 2)";
    }
  },
})

Vue.component('PlotlyLoader', {
  delimiters: ['<[', ']>'],
  props: {
    id: {
      type: String,
      required: true,
    },
    traces: {
      required: true,
    },
    xlabel: {
      type: String,
    },
    ylabel: {
      type: String,
    },
    width: {
      type: String,
      default: '600px',
    },
    height: {
      type: String,
      default: '400px',
    }
  },
  data() {
    return {
      isVisible: false,
    }
  },
  template: `
    <div>
      <template v-if="isVisible">
        <plotly 
          :id="id"
          :title="ylabel.toLabel()"
          :traces="traces"
          :xlabel="xlabel"
          :ylabel="ylabel"
          :height="height"
          :width="width">  
        </plotly>
        <v-card tile flat dense class="d-flex flex-row p-0 m-0">
          <v-btn small text @click="downloadData(id)" style="margin-left: calc(50% - 5em);">Download Data</v-btn>
        </v-card>
      </template>
      <skeleton-box :height="height" :width="width" v-else>Loading</skeleton-box>
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
  methods: {
    downloadData: function (id) {
      let labels = null;
      let data = null;
      if (this.traces.some(trace => trace.x)) {
        labels = "time," + this.traces.map(el => el.name).join(",");
        const max_lengths = this.traces.map(trace => Math.max(trace.x.length, trace.y.length));
        const max_length = Math.max(...max_lengths);

        let rows = [];
        for (const i of Array(max_length).keys()) {
          let row = Array(this.traces.length + 1);
          for (const n of row.keys()) {
            if (n === 0) {
              row[n] = this.traces[n].x[i];
            } else {
              row[n] = this.traces[n - 1].y[i];
            }
          }
          rows.push(row.map(e => e ? e.toString() : "").join(","));
        }

        data = rows.join("\n");
      } else {
        labels = this.traces.map(el => el.name).join(",");
        const max_lengths = this.traces.map(trace => trace.y.length);
        const max_length = Math.max(...max_lengths);

        let rows = [];
        for (const i of Array(max_length).keys()) {
          let row = Array(this.traces.length);
          for (const n of row.keys()) {
            row[n] = this.traces[n].y[i];
          }
          rows.push(row.map(e => e ? e.toString() : "").join(","));
        }

        data = rows.join("\n");
      }
      let csvContent = "data:text/csv;charset=utf-8," + labels + "\n" + data;
      let encodedUri = encodeURI(csvContent);

      var link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', this.id + '_data.csv');
      document.body.appendChild(link);

      link.click();
      document.body.removeChild(link);
    }
  }
})