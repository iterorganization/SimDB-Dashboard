# Installation and maintenance guide

## Installing the dashboard

1. Check out the dashboard: `git clone ssh://git@git.iter.org/imex/simdb-dashboard.git`.
2. Change to the `dashboard` directory: `cd dashboard`
3. Install the node dependencies: `npm install`
4. Build the dashboard: `npm run build`
5. As root install the dashboard: `cp -r dist/* /www-data/dashboard` (the location to install the files to will depend on which user is being used to serve them using nginx -- see below).

## Configuring nginx

Use the following configuration:

```
    root /www/data
    
    location /dashboard {
        try_files $uri $uri.html /dashboard/index.html
    }
```

This will serve static files from /www/data so /www/data/dashboard/index.html will be server as <server>/dashboard/index.html.

The `try_files` is required to allow for the behaviour of the single page app, as all endpoints under /dashboard will 
end up falling back to being served by /dashboard/index.html.