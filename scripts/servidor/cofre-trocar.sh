#!/bin/bash
# Moves the encrypted volume to a new one of another size. Stops the system, copies, proves the copy
# is equal and opens the new volume in the same place. The old file stays beside it until a person
# checks everything and deletes it; if a step fails, the old volume comes back on its own.
#   ssh -t root@<servidor> bash /srv/internship-tracker/scripts/servidor/cofre-trocar.sh 20G
# The passphrase stays the same. It comes from the terminal, or from stdin when not in one.
set -euo pipefail

TAMANHO=${1:?informe o tamanho novo, por exemplo 20G}
ATUAL=/srv/cofre.img
NOVO=/srv/cofre-novo.img
ANTIGO=/srv/cofre-antigo.img
PONTO=/srv/dados
COPIA=/mnt/cofre-novo
CODIGO=/srv/internship-tracker
COMPOSE="docker compose --env-file $PONTO/.env -f $CODIGO/docker-compose.prod.yml"

falha() { echo "FALHA: $1" >&2; exit 1; }

mountpoint -q "$PONTO" || falha "o cofre está fechado: rode cofre-abrir.sh primeiro."
[ -f "$CODIGO/docker-compose.prod.yml" ] || falha "não achei $CODIGO/docker-compose.prod.yml."
for temporizador in internship-backup.timer internship-rotina.timer; do
  systemctl cat "$temporizador" >/dev/null 2>&1 || falha "não achei $temporizador."
done
[ ! -e "$ANTIGO" ] || falha "$ANTIGO já existe: confira e apague a troca anterior antes."
[ ! -e "$NOVO" ] || falha "$NOVO já existe, de uma tentativa interrompida."

BYTES=$(numfmt --from=iec "$TAMANHO")
LIVRE=$(df --output=avail -B1 /srv | tail -1 | tr -d ' ')
[ "$LIVRE" -gt "$BYTES" ] || falha "o disco tem $(numfmt --to=iec "$LIVRE") livres, menos que $TAMANHO. Limpe o cache: docker builder prune -af"
# What the files really hold: a reservation of the storage does not travel with the copy
REAL=$(du -s --apparent-size -B1 "$PONTO" | cut -f1)
[ $((REAL * 2)) -lt "$BYTES" ] || falha "os dados somam $(numfmt --to=iec "$REAL"): $TAMANHO deixaria menos da metade livre."

if [ -t 0 ]; then
  printf 'Senha do cofre: '
  stty -echo
  IFS= read -r SENHA
  stty echo
  printf '\n'
else
  IFS= read -r SENHA || true
fi
printf '%s' "$SENHA" | cryptsetup open --test-passphrase --key-file=- "$ATUAL" || falha "a senha não abre o cofre atual. Nada foi alterado."

ETAPA=inicio
voltar() {
  codigo=$?
  [ "$codigo" -ne 0 ] || return 0
  echo "Algo falhou na etapa '$ETAPA' (saída $codigo). Voltando ao cofre antigo." >&2
  set +e
  mountpoint -q "$COPIA" && umount "$COPIA"
  [ -b /dev/mapper/cofre-novo ] && cryptsetup close cofre-novo
  if [ "$ETAPA" = trocado ]; then
    $COMPOSE stop >/dev/null 2>&1
    systemctl stop docker.service docker.socket
    mountpoint -q "$PONTO" && umount "$PONTO"
    [ -b /dev/mapper/cofre ] && cryptsetup close cofre
    mv "$ATUAL" "$NOVO"
    mv "$ANTIGO" "$ATUAL"
  fi
  rm -f "$NOVO"
  if ! mountpoint -q "$PONTO"; then
    [ -b /dev/mapper/cofre ] || printf '%s' "$SENHA" | cryptsetup open --key-file=- "$ATUAL" cofre
    mount /dev/mapper/cofre "$PONTO"
  fi
  systemctl start docker.service
  # Says only what it checked: a message of success after a failed return would hide the problem
  if $COMPOSE up -d --wait && systemctl start internship-backup.timer internship-rotina.timer; then
    echo "O sistema voltou no cofre antigo." >&2
  else
    echo "ATENÇÃO: a volta não terminou. Confira o sistema com docker ps e os timers. O cofre antigo está em $ATUAL." >&2
  fi
  exit "$codigo"
}
trap voltar EXIT

echo "== Parando o sistema"
ETAPA=parada
systemctl stop internship-backup.timer internship-rotina.timer
exec 9>/run/internship-backup.lock
flock -w 300 9
$COMPOSE stop

echo "== Criando o cofre de $TAMANHO"
ETAPA=copia
fallocate -l "$TAMANHO" "$NOVO"
chmod 600 "$NOVO"
printf '%s' "$SENHA" | cryptsetup luksFormat --batch-mode --type luks2 --key-file=- "$NOVO"
printf '%s' "$SENHA" | cryptsetup open --key-file=- "$NOVO" cofre-novo
mkfs.ext4 -q -L cofre /dev/mapper/cofre-novo
mkdir -p "$COPIA"
mount /dev/mapper/cofre-novo "$COPIA"
chmod 700 "$COPIA"

echo "== Copiando"
rsync -aHAX --sparse --numeric-ids --exclude=/lost+found "$PONTO/" "$COPIA/"
DIFERENCAS=$(rsync -anci --numeric-ids --delete --exclude=/lost+found "$PONTO/" "$COPIA/" | wc -l)
[ "$DIFERENCAS" -eq 0 ] || { echo "A cópia difere do original em $DIFERENCAS itens." >&2; exit 1; }
echo "Cópia conferida por checksum: igual ao original."

echo "== Abrindo o cofre novo"
systemctl stop docker.service docker.socket
umount "$COPIA"
rmdir "$COPIA"
cryptsetup close cofre-novo
umount "$PONTO"
cryptsetup close cofre
mv "$ATUAL" "$ANTIGO"
mv "$NOVO" "$ATUAL"
ETAPA=trocado
printf '%s' "$SENHA" | cryptsetup open --key-file=- "$ATUAL" cofre
mount /dev/mapper/cofre "$PONTO"
chmod 700 "$PONTO"
systemctl start docker.service
$COMPOSE up -d --wait
systemctl start internship-backup.timer internship-rotina.timer

echo "== Conferindo"
DOMINIO=$(sed -n 's/^APP_DOMAIN=//p' "$PONTO/.env")
for tentativa in $(seq 1 30); do
  codigo=$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "https://$DOMINIO/login" || true)
  [ "$codigo" = 200 ] && break
  [ "$tentativa" -lt 30 ] || { echo "O login respondeu $codigo." >&2; exit 1; }
  sleep 3
done
echo "Login: 200"
$COMPOSE run --rm ferramentas npm run storage:check
unset SENHA
trap - EXIT
df -h /srv /srv/dados
echo "Troca concluída. O cofre antigo continua em $ANTIGO. Depois de conferir o sistema: rm $ANTIGO"
