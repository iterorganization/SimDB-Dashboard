# Development guide

The SimDB dashboard consists of a few pages being served from a flask app, with the frontend interactivity being handled by the Vue.js library.

The dashboard consists mostly of static pages and javascript files, with Flask being used to set some configuration values in the html pages being served.

## Setting up a development environment

After you clone the code using git and create a virtual environment:
```bash
git clone ssh://git@git.iter.org/imex/simdb-dashboard.git
pip -m venv env
source env/bin/activate
```

You can install the dashboard using:
```bash
pip install -e simdb-dashboard
```

and can run a development server using the following:
```bash
export FLASK_APP=dashboard
export FLASK_ENV=development

flask run -p 8000 
```