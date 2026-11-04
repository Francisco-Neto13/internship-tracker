#!/bin/sh
# Creates the encrypted volume (RN-38, RNF-05). Runs once, on the server, in a terminal: the
# passphrase is typed by a person and is not stored anywhere on the server. Without it, and
# without a backup, the data is gone.
#   ssh -t root@<servidor> sh /srv/internship-tracker/scripts/servidor/cofre-criar.sh
set -eu

ARQUIVO=/srv/cofre.img
PONTO=/srv/dados

if [ -e "$ARQUIVO" ]; then
  echo "O cofre já existe em $ARQUIVO. Para abrir: cofre-abrir.sh" >&2
  exit 1
fi

mkdir -p "$PONTO"
# Immutable while closed: if the volume is not mounted, nothing writes data to the plain disk
chattr +i "$PONTO"

fallocate -l 60G "$ARQUIVO"
chmod 600 "$ARQUIVO"
cryptsetup luksFormat --batch-mode --type luks2 --verify-passphrase "$ARQUIVO"
echo "Digite a mesma senha de novo, para abrir o cofre:"
cryptsetup open "$ARQUIVO" cofre
mkfs.ext4 -q -L cofre /dev/mapper/cofre
mount /dev/mapper/cofre "$PONTO"
chmod 700 "$PONTO"

# Docker only starts after the volume opens, or containers would come back without their data
systemctl disable --now docker.service docker.socket >/dev/null 2>&1
systemctl start docker.service

echo "Cofre criado e aberto em $PONTO."
