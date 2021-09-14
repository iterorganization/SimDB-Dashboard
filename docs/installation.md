# Installation and maintenance guide

## Installing the dashboard

1. Check out the dashboard: `git clone ssh://git@git.iter.org/imex/simdb-dashboard.git`.
2. Create the virtual environment: `python -m venv env`.
3. Activate the environment: `source ./env/bin/activate`.
4. Install the app: `pip install ./simdb-dashboard`.
5. Install the static files: `cp -r ./simdb-dashboard/dashboard/static /www-data/` (the location to install the static files to will depend on which user is being used to serve them using nginx -- see below).

## Setting up the gunicorn service

1. Copy `dashboard.service` and `dashboard.socket` from `scripts` to `/etc/systemd/system`.
2. Update the settings in the scripts to specify the users that nginx and the flask service will run under as well as the paths to the installed files.
3. Activate the simdb service `systemctl enable dashboard`.
4. Test the service using `sudo -u nginx curl --unix-socket /run/dashboard.sock http` (where `nginx` is the user that nginx will be running under). This should return some html from the service.

## Configuring nginx

1. If you are running the dashboard on the same server as the simdb server add the following location to the simdb nginx configuration: 
```
    location /dashboard {
        include proxy_params;
        rewrite /dashboard(.*) /$1 break;
        proxy_pass http://unix:/var/run/dashboard.sock;
    }
```
2. If you are running the dashboard on a different nginx server, copy the `scripts/nginx.conf` file to `/etc/nginx/sites-available` and soft link this file into `/etc/nginx/sites-enabled`.