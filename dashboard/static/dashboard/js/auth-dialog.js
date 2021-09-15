Vue.component('AuthDialog', {
  delimiters: ['<[', ']>'],
  template:
  `
  <v-dialog v-model="show" persistent max-width="400px">
    <v-card>
      <v-card-title class="text-h5">
        Authentication Credentials
      </v-card-title>
      <v-card-text>
        Please enter your credentials for server <[ server ]>.
      <v-container>
        <v-row>
          <v-col cols="12" sm="6" md="6">
            <v-text-field id="username" label="Username"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="6">
            <v-text-field id="password" type="password" label="Password"></v-text-field>
          </v-col>
        </v-row>
      </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" text @click="show = false">
          Cancel
        </v-btn>
        <v-btn color="green darken-1" text @click="submit">
          Submit
        </v-btn>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn color="green darken-1" text @click="storeToken" v-bind="attrs" v-on="on">
              Generate Token
            </v-btn>
          </template>
          <span>Generate and save an access token in session storage.</span>
        </v-tooltip>
      </v-card-actions>
    </v-card>
  </v-dialog> 
  `,
  props: {
    server: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    submit(evt) {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      this.$emit('ok', username, password);
    },
    storeToken(evt) {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const url = 'https://' + decodeURIComponent(this.server) + '/api/v' + config.api_version;
      axios
        .get(url + '/token', {
          auth: { username: username, password: password },
        })
        .then(response => {
          this.token = response.data.token;
          window.sessionStorage.setItem('simdb-token-' + this.server, this.token);
          this.$emit('ok', "", "");
        })
        .catch(function (error) {
          app.status.text = error;
          app.status.type = 'error';
          this.$emit('error');
        })
    },
  },
})
