#!/bin/sh
# After a restart the system stays down until someone runs this and types the passphrase.
#   ssh -t root@<servidor> sh /srv/internship-tracker/scripts/servidor/cofre-abrir.sh
set -eu

ARQUIVO=/srv/cofre.img
PONTO=/srv/dados

[ -b /dev/mapper/cofre ] || cryptsetup open "$ARQUIVO" cofre
mountpoint -q "$PONTO" || mount /dev/mapper/cofre "$PONTO"
systemctl start docker.service

cd /srv/internship-tracker
docker compose --env-file "$PONTO/.env" -f docker-compose.prod.yml up -d --wait
echo "Cofre aberto e sistema no ar."
