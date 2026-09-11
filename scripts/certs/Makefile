# scripts/certs/Makefile
#
# See `make help` for info

SHELL := /bin/sh

# ---- configuration (override via environment or command line) -------------
RSA_BITS    ?= 2048
CERT_DAYS   ?= 3650
CA_DAYS     ?= $(CERT_DAYS)
DOMAIN_NAME ?= $(shell hostname -f 2>/dev/null || hostname --fqdn 2>/dev/null || hostname 2>/dev/null || echo localhost)
CERT_CN     ?= $(DOMAIN_NAME)
CA_CN       ?= $(CERT_CN) Root CA
OPENSSL     ?= openssl

# Ensure make is run from this directory
$(if $(shell test -f san.cnf.in && echo yes),, $(error Must run 'make' from scripts/certs directory))

# ---- paths ----------------------------------------------------------------
# Destination of `make install` (nginx expects server.pem / server.key here).
TLS_DIR    := ../../docker/nginx/tls

# ---- generated file names (all are Make targets) --------------------------
SAN_CNF     := san.cnf
# Source template for san.cnf (checked in, not generated). Consumed via sed
# (see the $(SAN_CNF) rule); only @CERT_CN@ and @DOMAIN_NAME@ are substituted.
SAN_CNF_IN  := san.cnf.in
ROOTCA_KEY  := rootCA.key
ROOTCA_PEM  := rootCA.pem
SERVER_KEY  := server.key
SERVER_CSR  := server.csr
SERVER_PEM  := server.pem

# Side-effect file written by openssl when signing (-CAcreateserial); it is
# not a declared target. If deleted, it is recreated on the next re-sign
# (with a reset serial), and `make install` simply skips it when absent.
TLS_SERIAL  := rootCA.srl

.DEFAULT_GOAL := help

.PHONY: \
	help \
	install \
	check \
	all

# == phony targets =============================================================
help:
	@echo 'Generate a root CA plus a CA-signed server certificate for the SimDB dashboard.'
	@echo 'Replaces scripts/generate-ca-signed-certs.sh.'
	@echo ''
	@echo 'Files are built here; `make install` copies to ../../docker/nginx/tls.'
	@echo ''
	@echo 'Dependency graph:'
	@echo ''
	@echo '  san.cnf.in -> san.cnf'
	@echo '  rootCA.key -> rootCA.pem'
	@echo '  server.key + san.cnf -> server.csr'
	@echo '  server.csr + rootCA.key + san.cnf -> server.pem'
	@echo ''
	@echo 'Generated files are never overwritten if they exist. Remove a file to rebuild'
	@echo 'it and its dependents (e.g., rm rootCA.key rebuilds the entire chain).'
	@echo ''
	@echo 'Targets (default: help):'
	@echo '  make              Show this help'
	@echo '  make all          Build all/missing files'
	@echo '  make check        Check certificate chain and key/cert pairs'
	@echo '  make install      Build, then copy files to docker/nginx/tls'
	@echo ''
	@echo 'Environment variables used:'
	@echo '  DOMAIN_NAME=$(DOMAIN_NAME)'
	@echo '  CERT_DAYS=$(CERT_DAYS) CA_DAYS=$(CA_DAYS)'
	@echo '  CERT_CN=$(CERT_CN) CA_CN=$(CA_CN)'
	@echo '  RSA_BITS=$(RSA_BITS)'

check-$(SERVER_PEM): check-%: $(ROOTCA_PEM) %
	@$(OPENSSL) verify -CAfile '$(ROOTCA_PEM)' '$(SERVER_PEM)' >/dev/null || { echo "FAIL: server.pem does not chain up to rootCA.pem"; exit 1; }

check-$(ROOTCA_KEY): check-%: $(ROOTCA_PEM) %
	@ca_pub="$$( $(OPENSSL) x509 -in '$(ROOTCA_PEM)' -noout -pubkey | $(OPENSSL) sha256 )"; \
	ca_key_pub="$$( $(OPENSSL) pkey -in '$(ROOTCA_KEY)' -pubout | $(OPENSSL) sha256 )"; \
	[ "$$ca_pub" = "$$ca_key_pub" ] || { echo "FAIL: rootCA.pem does not match rootCA.key (re-run make all)"; exit 1; }

check-$(SERVER_KEY): check-%: $(SERVER_PEM) %
	@sv_pub="$$( $(OPENSSL) x509 -in '$(SERVER_PEM)' -noout -pubkey | $(OPENSSL) sha256 )"; \
	sv_key_pub="$$( $(OPENSSL) pkey -in '$(SERVER_KEY)' -pubout | $(OPENSSL) sha256 )"; \
	[ "$$sv_pub" = "$$sv_key_pub" ] || { echo "FAIL: server.pem does not match server.key (re-run make all)"; exit 1; }

check: check-$(SERVER_PEM) check-$(ROOTCA_KEY) check-$(SERVER_KEY)
	@echo "check: OK (chain and key/cert pairs match)"

install: all
	@mkdir -p '$(TLS_DIR)'
	@install -m 600 '$(ROOTCA_KEY)' '$(SERVER_KEY)' '$(TLS_DIR)/'
	@install -m 644 '$(ROOTCA_PEM)' '$(SERVER_PEM)' '$(SERVER_CSR)' '$(SAN_CNF)' '$(TLS_DIR)/'
	@if [ -f '$(TLS_SERIAL)' ]; then install -m 644 '$(TLS_SERIAL)' '$(TLS_DIR)/'; fi
	@echo "Installed TLS files into $(TLS_DIR):"
	@echo "  rootCA.pem  - distribute to clients (trust anchor)"
	@echo "  rootCA.key  - keep secret (only used to sign)"
	@echo "  server.pem / server.key - used by nginx (server-https.conf)"
	@echo "  server.csr / san.cnf / rootCA.srl - introspection / serial"

all: $(ROOTCA_PEM) $(SERVER_PEM)
	@echo "All TLS files are up to date."

# == generated file targets ====================================================
# OpenSSL config carrying CN, SANs and X.509 v3 extensions, generated from
# $(SAN_CNF_IN) by substituting @CERT_CN@ and @DOMAIN_NAME@. Built when
# missing only; config values and SANs are applied at this point. The
# template is an order-only prerequisite, so editing it (or a checkout /
# `touch Makefile`) never churns the certificates.
$(SAN_CNF): | $(SAN_CNF_IN)
	@echo "Writing $@ from $(notdir $(SAN_CNF_IN)) ..."
	@sed \
		-e 's|@CERT_CN@|$(CERT_CN)|g' \
		-e 's|@DOMAIN_NAME@|$(DOMAIN_NAME)|g' \
		'$(SAN_CNF_IN)' > '$@'

# Root CA private key: generated once, never overwritten.
$(ROOTCA_KEY):
	@echo "Generating root CA private key ..."
	@$(OPENSSL) genrsa -out '$@' '$(RSA_BITS)' 2>/dev/null
	@chmod 600 '$@'

# Root CA certificate, derived from the key. Order-only prerequisite on the
# config: a changed CN/SAN does not rotate the trust anchor, but re-deriving
# the certificate from the same key keeps the same public key (existing
# server certs and client trust stay valid).
$(ROOTCA_PEM): $(ROOTCA_KEY) | $(SAN_CNF)
	@echo "Deriving root CA certificate from the key ..."
	@$(OPENSSL) req -x509 -new \
		-key '$(ROOTCA_KEY)' \
		-sha256 \
		-days '$(CA_DAYS)' \
		-subj '/CN=$(CA_CN)' \
		-extensions v3_ca \
		-config '$(SAN_CNF)' \
		-out '$@'
	@chmod 644 '$@'

# Server private key: generated once, never overwritten.
$(SERVER_KEY):
	@echo "Generating server private key ..."
	@$(OPENSSL) genrsa -out '$@' '$(RSA_BITS)' 2>/dev/null
	@chmod 600 '$@'

# Certificate signing request, derived from the server key + config.
$(SERVER_CSR): $(SERVER_KEY) $(SAN_CNF)
	@echo "Generating server certificate signing request ..."
	@$(OPENSSL) req -new \
		-key '$(SERVER_KEY)' \
		-sha256 \
		-config '$(SAN_CNF)' \
		-out '$@'

# Server certificate, signed by the root CA. Order-only prerequisite on the
# CA certificate: re-deriving rootCA.pem from the same key does not force a
# re-sign, but a brand-new rootCA.key (new CA) does.
$(SERVER_PEM): $(SERVER_CSR) $(ROOTCA_KEY) $(SAN_CNF) | $(ROOTCA_PEM)
	@echo "Signing server certificate with the root CA ..."
	@$(OPENSSL) x509 \
		-req \
		-in '$(SERVER_CSR)' \
		-CA '$(ROOTCA_PEM)' \
		-CAkey '$(ROOTCA_KEY)' \
		-CAcreateserial \
		-sha256 \
		-days '$(CERT_DAYS)' \
		-extfile '$(SAN_CNF)' \
		-extensions v3_req \
		-out '$@'
	@chmod 644 '$@'
