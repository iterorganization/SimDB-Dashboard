# Installation and maintenance guide

This project uses the top-level Makefile as the main entry point for building,
running, and maintaining the dashboard.

## Prerequisites

Install the following tools:

1. Docker
2. Docker Compose provider
3. GNU Make

Clone the repository and move to its root:

```sh
git clone git@github.com:iterorganization/SimDB-Dashboard.git
cd SimDB-Dashboard
```

To see all available commands:

```sh
make help
```

## Systemd deployment profile (published image)

For host-level service management, use the systemd-oriented compose override.

### Quick start (HTTP)

```sh
sudo make systemd-install
sudo make systemd-enable
sudo make systemd-start
sudo make systemd-status
```

`systemd-install` copies files to `/opt/simdb-dashboard` and `/etc/simdb-dashboard`, installs the unit file to `/etc/systemd/system/simdb-dashboard.service`, and creates `/etc/simdb-dashboard/simdb-dashboard.env` from `.env.example` if it does not exist yet.

Note that there is no need to build the docker image. See the `SIMDB_DASHBOARD_IMAGE` in `simdb-dashboard.env`.

If needed, removing the service is accordingly:

```sh
sudo make systemd-stop
sudo make systemd-disable
sudo make systemd-uninstall  # will prompt before deletion
```

Note that the `make systemd-*` targets are all effectively `systemctl` commands, except for the `make systemd-install` and `-uninstall` targets.

### Quick start (HTTPS)

First provide TLS certificates in `docker/nginx/tls/server.pem` and `docker/nginx/tls/server.key`, or generate them with `make -C scripts/certs install`. 

Then install as above (HTTP).

Then modify the compose chain in `/etc/simdb-dashboard/simdb-dashboard.env` to include the
https compose overlay:

```sh
COMPOSE_FILE=docker-compose.yml:docker-compose.https.yml:docker-compose.systemd.yml
```

Finally enable/start as usual:

```sh
sudo make systemd-enable
sudo make systemd-start
```

### Environment reference

`/etc/simdb-dashboard/simdb-dashboard.env` values are passed to docker compose.

- `COMPOSE_FILE`: default systemd stack is `docker-compose.yml:docker-compose.systemd.yml`.
- `SIMDB_DASHBOARD_IMAGE`: optional image repository override (default `ghcr.io/iterorganization/simdb-dashboard`).
- `SIMDB_DASHBOARD_TAG`: optional image tag (default `latest` in `docker-compose.systemd.yml`).
- `DASHBOARD_CONTAINER_NAME`: optional docker container name override.
- `DASHBOARD_PORT`: host HTTP port (default `80`).
- `DASHBOARD_HTTPS_PORT`: host HTTPS port (default `443`).
- `API_HOST`: SimDB backend host (default `host.docker.internal`).
- `API_PORT`: SimDB backend port (default `5000`).
- `SIMDB_SERVER_URL`: browser-side API base path (default `/scenarios/api`).

See `scripts/simdb-dashboard.env.example` and `scripts/simdb-dashboard.service`
for the same defaults and where they are consumed.

## Local container building and installation workflow (Docker image + Compose)

For building and running docker containers directly (without need for systemd or root), also for development or tweaking.

From the repository root:

1. Build the production service image:

```sh
make service
```

2. Start the dashboard container:

```sh
make up
```

3. Open the dashboard: http://localhost:80/dashboard/

4. Stop the service when needed:

```sh
make down
```

## HTTPS installation workflow (Docker image + Compose override)

The repository also includes an HTTPS-specific Docker stage and a Compose override in `docker-compose.https.yml`.

1. Provide TLS certificate files at `docker/nginx/tls/server.pem` and `docker/nginx/tls/server.key`.

   If you don't have such certificates yet, see the Makefile helper in `scripts/certs` to generate them.

2. Build the HTTPS service image:

```sh
USE_HTTPS=1 make service
```

3. Start the dashboard with the HTTPS override:

```sh
USE_HTTPS=1 make up
```

4. Open the dashboard:

- HTTP: http://localhost:80/dashboard/ (redirects to https)
- HTTPS: https://localhost:443/dashboard/

5. Stop the HTTPS service when needed:

```sh
USE_HTTPS=1 make down
```

## Adjusting the installation

Did something change in the `docker-compose.yml`, `docker-compose.https.yml`, or `docker/*` files? Stop the service, and restart service (rebuild not necessary):

```sh
make down up
```

Changed something in the `dashboard/*` sources? (e.g. after a `git pull`.) Stop the service, rebuild the service image (dependencies are cached) and restart:

```sh
make down service up
```

Notes:

- Requests under `/scenarios/api/` are proxied by nginx to a simdb server expected at `API_HOST:API_PORT` (defaults to `host.docker.internal:5000`). nginx sends `X-Forwarded-Prefix: /scenarios/api`; SimDB should trust respect header (`ProxyFix(..., x_prefix=1)`) so absolute URLs it returns retain the public prefix.
- You can start multiple dashboards if you change the host port with `DASHBOARD_PORT`.
- The HTTPS compose override also publishes `DASHBOARD_HTTPS_PORT` (default `443`) and switches `SERVER_CONF` to `server-https.conf`.
- `docker-compose.https.yml` reuses the base `docker-compose.yml`; environment variables from the base file are inherited, and override entries only add new variables or replace matching keys such as `SERVER_CONF`.
- For non-systemd operations, set `USE_HTTPS=1` to switch shared Make targets such as `up`, `down`, `logs-f`, and `shell` to the HTTPS compose chain.
- The `USE_HTTPS=1` flag expects **TLS certificate files** at `docker/nginx/tls/server.pem` and `docker/nginx/tls/server.key`. If you do not have certificate files yet, a CA-signed key pair can be generated with the provided Makefile at `certs` (see the [HTTPS installation workflow](#https-installation-workflow-docker-image--compose-override) section for details).
- The SimDB proxy location sets `client_max_body_size 2M;` and `client_body_buffer_size 2M;` to avoid request-body failures (HTTP 413) for
    larger payloads. If your traffic requires larger uploads, increase both values in `docker/nginx/templates/snippets/location-simdb_proxy.conf.template`.
- Use `PUBLIC_SIMDB_URL` or edit `docker/nginx/templates/snippets/runtime-config-template.js` for adjusting the simdb server:

```sh
DASHBOARD_PORT=8080 make up
DASHBOARD_PORT=8081 API_PORT=5001 make up
DASHBOARD_PORT=8082 API_HOST=172.20.0.1 API_PORT=5001 make up
DASHBOARD_PORT=8080 DASHBOARD_HTTPS_PORT=8443 USE_HTTPS=1 make up
PUBLIC_SIMDB_URL=https://simdb.iter.org/scenarios/api make up
```

- Additional conveniences are:

```sh
make list-all  # list all running dashboard containers
DASHBOARD_PORT=8081 make list      # list container for the selected container
DASHBOARD_PORT=8081 make logs-f    # follow compose logs for the selected container
DASHBOARD_PORT=8081 make shell     # open sh inside running dashboard container
DASHBOARD_PORT=8081 USE_HTTPS=1 make logs-f  # follow HTTPS compose logs
DASHBOARD_PORT=8081 USE_HTTPS=1 make shell   # open sh inside HTTPS container
```

## Static artifact installation (non-Compose nginx deployments)

If you want to deploy static files to an existing nginx host:

1. Build and export frontend artifacts:

```sh
make dist
```

This creates `dist/` at the repository root containing the built app.

2. Copy artifacts to your web root (example path):

```sh
sudo cp -r dist/* /www/data/
```

With the Dockerfile defaults, assets are served under `/dashboard`, so the final
index path should be `/www/data/dashboard/index.html`.

## Exporting a runnable service image tar (non-Compose)

If you want a portable Docker image artifact (similar to CI artifacts), use:

```sh
make simdb-dashboard-service.tar
```

This creates `simdb-dashboard-service.tar` at the repository root.

Load and run it on a target machine:

```sh
docker load -i simdb-dashboard-service.tar
docker run --rm -p 8080:80 --add-host host.docker.internal:host-gateway simdb-dashboard:service
```

## nginx configuration

Use a location block that falls back to the SPA entry point:

```nginx
root /www/data;

location /dashboard {
    try_files $uri $uri.html /dashboard/index.html;
}
```

This is required for client-side routes under `/dashboard/*`.

## Maintenance and verification

Use Makefile targets for quality checks and updates:

```sh
make build        # build image for lint/type-check/test
make lint         # run lint checks against the build image
make type-check   # run TypeScript type checks against the build image
make test         # run unit tests against the build image
make update-base  # rebuild service image pulling latest base images
make update-deps  # refresh package-lock and apply npm audit fixes
make distclean    # remove local images/artifacts and compose runtime state
```
