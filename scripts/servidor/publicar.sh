#!/bin/sh
# Builds and starts the code already copied to the server. Safe to run again: secrets are
# generated once, migrations and the bucket setup are idempotent. Needs the open volume.
#   sh publicar.sh [<dominio-do-sistema> <dominio-dos-arquivos>]
# The domains are needed only the first time; after that they come from the volume.
set -eu

PONTO=/srv/dados
AMBIENTE="$PONTO/.env"
CODIGO=/srv/internship-tracker

if ! mountpoint -q "$PONTO"; then
  echo "O cofre está fechado: rode cofre-abrir.sh ou cofre-criar.sh primeiro." >&2
  exit 1
fi

segredo() { openssl rand -hex 32; }

if [ -f "$AMBIENTE" ]; then
  APP_DOMAIN=$(sed -n 's/^APP_DOMAIN=//p' "$AMBIENTE")
  STORAGE_DOMAIN=$(sed -n 's/^STORAGE_DOMAIN=//p' "$AMBIENTE")
else
  APP_DOMAIN=${1:?informe o dominio do sistema}
  STORAGE_DOMAIN=${2:?informe o dominio dos arquivos}
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
mkdir -p "$PONTO/postgres" "$PONTO/armazenamento" "$PONTO/backup/pgbackrest" "$PONTO/backup/log"
# The user of the postgres image writes the database backups
chown -R 999:999 "$PONTO/backup/pgbackrest" "$PONTO/backup/log"

cd "$CODIGO"
sh scripts/servidor/configurar-vps.sh
# The build needs room, and a full disk stops the database along with it
LIVRE_GB=$(df -BG --output=avail /srv | tail -1 | tr -dc 0-9)
if [ "$LIVRE_GB" -lt 8 ]; then
  docker builder prune -af >/dev/null
  LIVRE_GB=$(df -BG --output=avail /srv | tail -1 | tr -dc 0-9)
  if [ "$LIVRE_GB" -lt 8 ]; then
    echo "O disco tem só $LIVRE_GB GB livres, e o build precisa de 8. A versão atual continua no ar. Rode vps-espaco." >&2
    exit 1
  fi
fi
COMPOSE="docker compose --env-file $AMBIENTE -f docker-compose.prod.yml"
$COMPOSE build app postgres
$COMPOSE up -d --wait postgres storage
# RNF-12: repository of the database backups; safe to run again
$COMPOSE exec -T -u postgres postgres pgbackrest --stanza=main stanza-create
$COMPOSE run --rm ferramentas npm run db:migrate
$COMPOSE up -d --wait
# The bucket setup goes through HTTPS, by the server proxy (/srv/proxy)
for tentativa in $(seq 1 60); do
  if curl --silent --output /dev/null --max-time 5 "https://$STORAGE_DOMAIN" && curl --silent --output /dev/null --max-time 5 "https://$APP_DOMAIN/login"; then
    break
  fi
  if [ "$tentativa" -eq 60 ]; then
    echo "O sistema não respondeu por HTTPS em 5 minutos: veja o proxy do servidor, em /srv/proxy" >&2
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
# Backup every hour (RNF-12). A closed volume makes it fail without side effects
cat > /etc/systemd/system/internship-backup.service <<EOF
[Unit]
Description=Backup do Internship Tracker

[Service]
Type=oneshot
ExecStart=/bin/sh $CODIGO/scripts/servidor/backup.sh
EOF
cat > /etc/systemd/system/internship-backup.timer <<EOF
[Unit]
Description=Backup do Internship Tracker

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now internship-rotina.timer >/dev/null 2>&1
systemctl enable --now internship-backup.timer >/dev/null 2>&1
# The first database copy starts now, without holding the deploy
systemctl start --no-block internship-backup.service

# Images of older versions are of no use once the new one is up
docker image prune -f >/dev/null
docker builder prune -f --reserved-space=3GB >/dev/null

echo "Publicado em https://$APP_DOMAIN"
