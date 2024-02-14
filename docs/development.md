# Development guide

The SimDB dashboard is a single page Vue.js application built using Vite and npm.



The SimDB dashboard consists of a few pages being served from a flask app, with the frontend interactivity being handled by the Vue.js library.

The dashboard consists mostly of static pages and javascript files, with Flask being used to set some configuration values in the html pages being served.

## Setting up a development environment

You can clone the code using git and run a development version of the dashboard using:

```bash
git clone ssh://git@git.iter.org/imex/simdb-dashboard.git
cd dashboard
npm install
npm run dev
```

You can build the dashboard using:

```bash
npm run build
```

and can serve it using a test server by running:

```bash
npm run preview
```