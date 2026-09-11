#!/usr/bin/env sh
set -eu

cp "/etc/nginx/conf.d/snippets/${SERVER_CONF:-server-http.conf}" /etc/nginx/conf.d/snippets/server.conf
