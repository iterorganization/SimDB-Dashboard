# Development guide

The SimDB dashboard frontend is a Vite/Vue single-page app. The recommended development workflow is to run the Vite dev server through Make using Docker.

## Setting up a development environment

1. Clone the repository:

```bash
git clone git@github.com:iterorganization/SimDB-Dashboard.git
cd SimDB-Dashboard
```

2. Start the development server with hot reload:

```bash
read -rsp "Password: " SIMDB_DEV_FIREWALL_PASSWORD && export SIMDB_DEV_FIREWALL_PASSWORD
module load nodejs
make dev
```

3. Open the `http://localhost:5173/dashboard/?simdb_dev_token=...` link printed by `make dev`.

`make dev` uses Docker if available, otherwise the local Node.js.

## SimDB servers

Defined in [`dashboard/dev-servers.json`](../dashboard/dev-servers.json) (default: `simdb-pp`). Local overrides: `dashboard/dev-servers.local.json`.

Servers behind a firewall with HTTP Basic login (ITER: F5) use `"firewall": {"type": "basic", "userAgent": "..."}`; set `SIMDB_DEV_FIREWALL_PASSWORD` (and `SIMDB_DEV_FIREWALL_USERNAME` if not `$USER`).

```bash
SIMDB_DEV_SERVER=itpa make dev       # other server (name or URL)
```

## Other useful commands

Run lint checks:

```bash
make lint
```

Run unit tests:

```bash
make test
```

The `make lint`, `make type-check`, and `make test` targets each run `docker run` against the prebuilt `simdb-dashboard:build` image, so `make build` (or `make service`) must be run first.

Run type checks:

```bash
make type-check
```

At the moment, the project does not include test files, so `make test` will exit with no tests found.

## Releases and image tags

Pushing a tag makes CI publish a versioned image and a GitHub Release, and moves
`latest`; pushes to `develop` move `develop`. The version comes from
`git describe --tags`, so tag releases as plain versions (`0.9.0`) and don't leave
stray tags around. See [Published image tags](installation.md#published-image-tags-ghcr).
