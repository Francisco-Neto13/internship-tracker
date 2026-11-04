#!/usr/bin/env bash
# Puts origin/main in production. Runs as root through /usr/local/sbin/internship-deploy (see
# configurar-deploy.sh), always the version of this file that is on origin/main.
# Arguments: <project path> <dry-run: true|false>
set -euo pipefail

CODIGO="${1:?project path}"
DRY_RUN="${2:-false}"
PONTO=/srv/dados
AMBIENTE="$PONTO/.env"

exec 9>/run/internship-deploy.lock
flock -w 900 9

if ! mountpoint -q "$PONTO"; then
  echo "FALHA: o cofre está fechado (o servidor reiniciou?). Abra com cofre-abrir.sh e rode o deploy de novo." >&2
  exit 1
fi

cd "$CODIGO"
git fetch --quiet origin

if [ "$DRY_RUN" = "true" ]; then
  echo "[dry-run] Versão atual: $(git log --oneline -1 HEAD | cut -c1-72)"
  echo "[dry-run] Commits que seriam aplicados:"
  git log --oneline HEAD..origin/main | cut -c1-72
  docker compose --env-file "$AMBIENTE" -f docker-compose.prod.yml config -q
  echo "[dry-run] SSH, cofre e Compose OK. Nada foi alterado."
  exit 0
fi

git reset --quiet --hard origin/main

# Stops before replacing the containers if the build fails: the running version stays up
sh scripts/servidor/publicar.sh

DOMINIO=$(sed -n 's/^APP_DOMAIN=//p' "$AMBIENTE")
codigo=$(curl --silent --output /dev/null --max-time 30 --write-out '%{http_code}' "https://$DOMINIO/login")
if [ "$codigo" != "200" ]; then
  echo "FALHA: https://$DOMINIO/login respondeu $codigo depois do deploy." >&2
  docker compose --env-file "$AMBIENTE" -f docker-compose.prod.yml ps >&2
  exit 1
fi
echo "Deploy concluído: $(git log --oneline -1 HEAD | cut -c1-72)"
