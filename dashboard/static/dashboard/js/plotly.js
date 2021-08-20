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
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    xdata: {
      required: true,
    },
    ydata: {
      required: true,
    },
    xlabel: {
      type: String,
    },
    ylabel: {
      type: String,
    },
  },
  mounted() {
    let trace = {
      y: this.ydata,
    };
    if (this.xdata) {
      trace['x'] = this.xdata;
    }
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
    let data = [trace];
    Plotly.newPlot(this.$el, data, layout);
  },
})

Vue.component('PlotlyLoader', {
  delimiters: ['<[', ']>'],
  props: {
    id: {
      type: String,
      required: true,
    },
    xdata: {
      required: true,
    },
    ydata: {
      required: true,
    },
    xlabel: {
      type: String,
    },
    ylabel: {
      type: String,
    },
  },
  data() {
    return {
      isVisible: false,
    }
  },
  template: `
    <div>
      <template v-if="isVisible">
        <plotly :id="id" :title="ylabel.toLabel()" :xdata="xdata" :ydata="ydata" :xlabel="xlabel" :ylabel="ylabel"></plotly>
        <v-btn small text @click="downloadData(id)">Download Data</v-btn>
      </template>
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
  methods: {
    downloadData: function (id) {
      let labels = null;
      let data = null;
      if (this.xdata) {
        labels = (this.xlabel || 'time') + ',' + (this.ylabel || 'data');
        let ydata = this.ydata;
        let xdata = Array.from(this.xdata.values());
        data = xdata.map(function(el, idx) {
          return el.toString() + ',' + ydata[idx].toString();
        }).join('\n');
      } else {
        labels = this.ylabel || 'data';
        data = this.ydata.map(e => e.toString()).join("\n");
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