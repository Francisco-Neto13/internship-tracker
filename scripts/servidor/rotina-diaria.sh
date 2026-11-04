#!/bin/sh
# Calls the daily routine (RF012, RF040, RF069). The secret goes through stdin so it never
# appears in the process list.
set -eu

AMBIENTE=/srv/dados/.env
SEGREDO=$(sed -n 's/^CRON_SECRET=//p' "$AMBIENTE")
DOMINIO=$(sed -n 's/^APP_DOMAIN=//p' "$AMBIENTE")

printf 'header = "Authorization: Bearer %s"\n' "$SEGREDO" |
  curl --silent --show-error --fail --max-time 300 --config - "https://$DOMINIO/api/cron/diaria"
