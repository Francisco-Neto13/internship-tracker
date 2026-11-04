#!/bin/sh
# Builds and starts the code already copied to the server. Safe to run again: secrets are
# generated once, migrations and the bucket setup are idempotent. Needs the open volume.
#   sh publicar.sh <dominio-do-sistema> <dominio-dos-arquivos>
set -eu

APP_DOMAIN=$1
STORAGE_DOMAIN=$2
PONTO=/srv/dados
AMBIENTE="$PONTO/.env"
CODIGO=/srv/internship-tracker

if ! mountpoint -q "$PONTO"; then
  echo "O cofre está fechado: rode cofre-abrir.sh ou cofre-criar.sh primeiro." >&2
  exit 1
fi

segredo() { openssl rand -hex 32; }

if [ ! -f "$AMBIENTE" ]; then
  umask 077
  cat > "$AMBIENTE" <<EOF
APP_DOMAIN=$APP_DOMAIN
STORAGE_DOMAIN=$STORAGE_DOMAIN
DIR_DADOS=$PONTO
POSTGRES_PASSWORD=$(segredo)
MIGRATOR_PASSWORD=$(segredo)
APP_RUNTIME_PASSWORD=$(segredo)
AUTH_RUNTIME_PASSWORD=$(segredo)
BETTER_AUTH_SECRET=$(segredo)
R2_ACCESS_KEY_ID=$(openssl rand -hex 16)
R2_SECRET_ACCESS_KEY=$(segredo)
CRON_SECRET=$(segredo)
EOF
  umask 022
fi
mkdir -p "$PONTO/postgres" "$PONTO/armazenamento" "$PONTO/caddy"

cd "$CODIGO"
COMPOSE="docker compose --env-file $AMBIENTE -f docker-compose.prod.yml"
$COMPOSE build app
$COMPOSE up -d --wait postgres storage
$COMPOSE run --rm ferramentas npm run db:migrate
$COMPOSE up -d --wait

# The certificates are issued after the proxy starts, and the bucket setup goes through HTTPS
for tentativa in $(seq 1 60); do
  if curl --silent --output /dev/null --max-time 5 "https://$STORAGE_DOMAIN" && curl --silent --output /dev/null --max-time 5 "https://$APP_DOMAIN/login"; then
    break
  fi
  if [ "$tentativa" -eq 60 ]; then
    echo "Os certificados não saíram em 5 minutos: veja docker compose logs proxy" >&2
    exit 1
  fi
  sleep 5
done

$COMPOSE run --rm ferramentas npm run storage:init
$COMPOSE run --rm ferramentas npm run storage:check

# Daily routine (RF012, RF040, RF069). A closed volume makes it fail without side effects
cat > /etc/systemd/system/internship-rotina.service <<EOF
[Unit]
Description=Rotina diaria do Internship Tracker

[Service]
Type=oneshot
ExecStart=/bin/sh $CODIGO/scripts/servidor/rotina-diaria.sh
EOF
cat > /etc/systemd/system/internship-rotina.timer <<EOF
[Unit]
Description=Rotina diaria do Internship Tracker

[Timer]
OnCalendar=*-*-* 09:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now internship-rotina.timer >/dev/null 2>&1

echo "Publicado em https://$APP_DOMAIN"
