#!/bin/sh
# Creates the encrypted volume (RN-38, RNF-05). Runs once, on the server, in a terminal: the
# passphrase is typed by a person and is not stored anywhere on the server. Without it, and
# without a backup, the data is gone.
#   ssh -t root@<servidor> sh /srv/internship-tracker/scripts/servidor/cofre-criar.sh [tamanho]
# The size is fixed and leaves the rest of the server's projects with less, used or not. It starts
# small because growing is simple and shrinking takes the system down (REGRAS-DA-VPS.md).
set -eu

TAMANHO=${1:-20G}

ARQUIVO=/srv/cofre.img
PONTO=/srv/dados

if cryptsetup isLuks "$ARQUIVO" 2>/dev/null; then
  echo "O cofre já existe em $ARQUIVO. Para abrir: cofre-abrir.sh" >&2
  exit 1
fi

ler_senha() {
  printf '%s: ' "$1"
  stty -echo
  IFS= read -r SENHA_LIDA || SENHA_LIDA=""
  stty echo
  printf '\n'
}

BYTES=$(numfmt --from=iec "$TAMANHO")
DISCO=$(df --output=size -B1 /srv | tail -1 | tr -d ' ')
if [ $((BYTES * 100 / DISCO)) -gt 30 ]; then
  echo "$TAMANHO passa de 30% do disco. Nada foi alterado: veja /srv/REGRAS-DA-VPS.md." >&2
  exit 1
fi

ler_senha "Cole a senha do cofre e aperte Enter"
SENHA=$SENHA_LIDA
echo "Recebi ${#SENHA} caracteres."
if [ "${#SENHA}" -lt 30 ]; then
  echo "A senha precisa de pelo menos 30 caracteres. Nada foi alterado." >&2
  exit 1
fi

ler_senha "Cole a mesma senha de novo e aperte Enter"
if [ "$SENHA" != "$SENHA_LIDA" ]; then
  echo "As duas senhas não são iguais (a segunda veio com ${#SENHA_LIDA} caracteres). Nada foi alterado." >&2
  exit 1
fi

mkdir -p "$PONTO"
# Immutable while closed: if the volume is not mounted, nothing writes data to the plain disk
chattr +i "$PONTO"

# Only the header step can fail on the passphrase; an unformatted file is safe to discard
rm -f "$ARQUIVO"
trap 'cryptsetup isLuks "$ARQUIVO" 2>/dev/null || rm -f "$ARQUIVO"' EXIT
fallocate -l "$TAMANHO" "$ARQUIVO"
chmod 600 "$ARQUIVO"

echo "Criando o cofre, leva alguns segundos..."
# printf is a shell builtin: the passphrase never appears in the process list
printf '%s' "$SENHA" | cryptsetup luksFormat --batch-mode --type luks2 --key-file=- "$ARQUIVO"
printf '%s' "$SENHA" | cryptsetup open --key-file=- "$ARQUIVO" cofre
unset SENHA SENHA_LIDA

mkfs.ext4 -q -L cofre /dev/mapper/cofre
mount /dev/mapper/cofre "$PONTO"
chmod 700 "$PONTO"

# Docker only starts after the volume opens, or containers would come back without their data
systemctl disable --now docker.service docker.socket >/dev/null 2>&1
systemctl start docker.service

echo "Cofre criado e aberto em $PONTO."
