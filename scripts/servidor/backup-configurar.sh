#!/bin/sh
# Connects the backup to the destination outside the server. Runs once, in a terminal, because a
# person types the restic password and pastes the Google Drive token. Without that password the
# backup cannot be opened: keep a copy outside the server.
#   ssh -t root@<servidor> sh /srv/internship-tracker/scripts/servidor/backup-configurar.sh
set -eu

PONTO=/srv/dados
CONFIG="$PONTO/.backup"

if ! mountpoint -q "$PONTO"; then
  echo "O cofre está fechado: rode cofre-abrir.sh primeiro." >&2
  exit 1
fi
if [ -f "$CONFIG/senha" ]; then
  echo "O backup já está configurado em $CONFIG." >&2
  exit 1
fi

ler() {
  printf '%s: ' "$1"
  stty -echo
  IFS= read -r LIDO || LIDO=""
  stty echo
  printf '\n'
}

ler "Cole a senha do backup e aperte Enter"
SENHA=$LIDO
echo "Recebi ${#SENHA} caracteres."
if [ "${#SENHA}" -lt 30 ]; then
  echo "A senha precisa de pelo menos 30 caracteres. Nada foi alterado." >&2
  exit 1
fi
ler "Cole a mesma senha de novo e aperte Enter"
if [ "$SENHA" != "$LIDO" ]; then
  echo "As duas senhas não são iguais. Nada foi alterado." >&2
  exit 1
fi

ler "Cole o token do Google Drive (a linha entre chaves) e aperte Enter"
TOKEN=$LIDO
echo "Recebi ${#TOKEN} caracteres."
case "$TOKEN" in
  \{*access_token*\}) ;;
  *)
    echo "Isso não parece o token: ele começa com { e termina com }. Nada foi alterado." >&2
    exit 1
    ;;
esac

apt-get install -y -qq restic rclone >/dev/null

TEMPORARIO="$CONFIG.novo"
rm -rf "$TEMPORARIO"
umask 077
mkdir -p "$TEMPORARIO"
printf '%s' "$SENHA" > "$TEMPORARIO/senha"
# drive.file: the token only reaches what rclone itself created, not the rest of the account
cat > "$TEMPORARIO/rclone.conf" <<EOF
[backup]
type = drive
scope = drive.file
token = $TOKEN
EOF
unset SENHA LIDO TOKEN

export RESTIC_REPOSITORY=rclone:backup:internship-tracker
export RESTIC_PASSWORD_FILE="$TEMPORARIO/senha"
export RCLONE_CONFIG="$TEMPORARIO/rclone.conf"
if ! restic init --quiet; then
  echo "Não consegui criar o backup no Drive. Nada ficou configurado." >&2
  rm -rf "$TEMPORARIO"
  exit 1
fi
mv "$TEMPORARIO" "$CONFIG"

echo "Enviando o primeiro backup..."
sh /srv/internship-tracker/scripts/servidor/backup.sh
echo "Backup configurado. Último envio: $(cat "$CONFIG/ultimo-envio")"
