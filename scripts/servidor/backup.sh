#!/bin/sh
# Runs every hour (internship-backup.timer). RNF-12: a full copy of the database on Sundays and a
# differential one on the other days, with the WAL archived continuously by PostgreSQL. Then the
# database copies and the files go, encrypted by restic, to the destination outside the server.
# A closed volume makes it fail without side effects.
set -eu

PONTO=/srv/dados
CONFIG="$PONTO/.backup"
CODIGO=/srv/internship-tracker
ARMAZENAMENTO="$PONTO/armazenamento"
COPIA_FILER="$PONTO/backup/filer"

if ! mountpoint -q "$PONTO"; then
  echo "O cofre está fechado: nenhum backup foi feito." >&2
  exit 1
fi

exec 9>/run/internship-backup.lock
flock -n 9 || exit 0

cd "$CODIGO"
COMPOSE="docker compose --env-file $PONTO/.env -f docker-compose.prod.yml"
pgbackrest() { $COMPOSE exec -T -u postgres postgres pgbackrest --stanza=main "$@"; }

HORA=$(date -u +%H)
DIA=$(date -u +%u)
if ! pgbackrest info --output=json | grep -q '"label"' || { [ "$HORA" = 06 ] && [ "$DIA" = 7 ]; }; then
  pgbackrest --type=full backup
elif [ "$HORA" = 06 ]; then
  pgbackrest --type=diff backup
fi

if [ ! -f "$CONFIG/senha" ]; then
  echo "Destino externo ainda não configurado (backup-configurar.sh): só a cópia local foi feita."
  exit 0
fi

# The file index changes in place, so it is copied with the storage frozen. The volumes only
# grow, and a volume newer than the index still holds everything the index points to.
rm -rf "$COPIA_FILER"
trap '$COMPOSE unpause storage >/dev/null 2>&1 || true' EXIT
$COMPOSE pause storage >/dev/null
cp -a "$ARMAZENAMENTO/filerldb2" "$COPIA_FILER"
$COMPOSE unpause storage >/dev/null
trap - EXIT

export RESTIC_REPOSITORY=rclone:backup:internship-tracker
export RESTIC_PASSWORD_FILE="$CONFIG/senha"
export RCLONE_CONFIG="$CONFIG/rclone.conf"
restic backup --quiet --exclude "$ARMAZENAMENTO/filerldb2" "$PONTO/backup" "$ARMAZENAMENTO" "$PONTO/.env"
if [ "$HORA" = 07 ]; then
  restic forget --quiet --prune --keep-hourly 24 --keep-daily 14 --keep-weekly 8
fi
date -u +%FT%TZ > "$CONFIG/ultimo-envio"
