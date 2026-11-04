#!/bin/sh
# Proves the backup opens (RNF-12): downloads it from the destination outside the server, brings
# the database back at a chosen moment in throwaway containers and checks every stored document
# against its SHA-256. The system stays up and nothing of it is touched; the copy stays inside the
# encrypted volume and is erased at the end.
#   sh backup-testar-restauracao.sh ["2026-11-04 14:32:00-03"]
# Without a moment, it restores up to the latest change in the backup. Extra checks:
#   CONSULTA_EXTRA  query printed from the restored server, e.g. to look at a marker
#   BANCO_EXTRA     database for that query (default: internship_tracker)
#   ARQUIVO_MARCADOR, SHA_MARCADOR  object in the bucket and its SHA-256, compared after the restore
set -eu

MOMENTO=${1:-}
PONTO=/srv/dados
CONFIG="$PONTO/.backup"
DIR="$PONTO/restauracao-teste"
ORIGEM="$DIR/srv/dados"
IMAGEM_BANCO=internship-tracker-postgres
IMAGEM_ARQUIVOS=chrislusf/seaweedfs:4.06
BANCO=internship-restauracao-banco
ARQUIVOS=internship-restauracao-arquivos
REDE=internship-restauracao

limpar() {
  docker rm -f "$BANCO" "$ARQUIVOS" >/dev/null 2>&1 || true
  docker network rm "$REDE" >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
trap limpar EXIT
limpar

export RESTIC_REPOSITORY=rclone:backup:internship-tracker
export RESTIC_PASSWORD_FILE="$CONFIG/senha"
export RCLONE_CONFIG="$CONFIG/rclone.conf"

echo "== Baixando o backup do destino externo"
restic restore latest --quiet --target "$DIR"
echo "Último envio: $(cat "$CONFIG/ultimo-envio")"

echo "== Restaurando o banco ${MOMENTO:+até $MOMENTO}"
DADOS="$DIR/pgdata"
mkdir -p "$DADOS"
chown 999:999 "$DADOS"
chmod 700 "$DADOS"
docker network create --internal "$REDE" >/dev/null
CONF=/srv/internship-tracker/docker/postgres/pgbackrest.conf
montagens="-v $DADOS:/var/lib/postgresql/data -v $ORIGEM/backup:/backup -v $CONF:/etc/pgbackrest/pgbackrest.conf:ro"
if [ -n "$MOMENTO" ]; then
  # shellcheck disable=SC2086
  docker run --rm -u postgres $montagens "$IMAGEM_BANCO" pgbackrest --stanza=main --type=time "--target=$MOMENTO" --target-action=promote restore
else
  # shellcheck disable=SC2086
  docker run --rm -u postgres $montagens "$IMAGEM_BANCO" pgbackrest --stanza=main --type=default restore
fi
# shellcheck disable=SC2086
docker run -d --name "$BANCO" --network "$REDE" $montagens "$IMAGEM_BANCO" postgres -c archive_mode=off >/dev/null

sql() { docker exec "$BANCO" psql -U postgres -d "${2:-internship_tracker}" -Atc "$1"; }
for tentativa in $(seq 1 120); do
  if [ "$(sql 'select not pg_is_in_recovery()' 2>/dev/null || true)" = t ]; then
    break
  fi
  if [ "$tentativa" -eq 120 ]; then
    echo "FALHA: o banco restaurado não abriu em 4 minutos." >&2
    docker logs --tail 30 "$BANCO" >&2
    exit 1
  fi
  sleep 2
done
echo "Contas: $(sql 'select count(*) from public.usuario')"
echo "Registros de auditoria: $(sql 'select count(*) from public.auditoria')"
echo "Última auditoria: $(sql 'select max(ocorrido_em) from public.auditoria')"
if [ -n "${CONSULTA_EXTRA:-}" ]; then
  echo "Consulta extra: $(sql "$CONSULTA_EXTRA" "${BANCO_EXTRA:-internship_tracker}" | tr '\n' ' ')"
fi

echo "== Restaurando os arquivos"
ARQUIVOS_DIR="$ORIGEM/armazenamento"
mv "$ORIGEM/backup/filer" "$ARQUIVOS_DIR/filerldb2"
docker run -d --name "$ARQUIVOS" --hostname armazenamento --network "$REDE" -v "$ARQUIVOS_DIR:/data" \
  "$IMAGEM_ARQUIVOS" server -dir=/data -ip=armazenamento -filer -filer.encryptVolumeData >/dev/null
for tentativa in $(seq 1 60); do
  if docker exec "$ARQUIVOS" wget -qO /dev/null "http://armazenamento:8888/" 2>/dev/null; then
    break
  fi
  if [ "$tentativa" -eq 60 ]; then
    echo "FALHA: o armazenamento restaurado não abriu em 2 minutos." >&2
    docker logs --tail 30 "$ARQUIVOS" >&2
    exit 1
  fi
  sleep 2
done

CERTOS=0
ERRADOS=0
LISTA="$DIR/documentos"
sql "select chave_objeto || ' ' || sha256 from public.documento where sha256 <> repeat('0', 64)" > "$LISTA"
while read -r CHAVE SHA; do
  [ -n "$CHAVE" ] || continue
  LIDO=$(docker exec "$ARQUIVOS" sh -c "wget -qO- 'http://armazenamento:8888/buckets/internship-tracker/$CHAVE' | sha256sum | cut -d' ' -f1" || true)
  if [ "$LIDO" = "$SHA" ]; then
    CERTOS=$((CERTOS + 1))
  else
    ERRADOS=$((ERRADOS + 1))
    echo "Diferente do original: $CHAVE" >&2
  fi
done < "$LISTA"
echo "Documentos conferidos pelo SHA-256: $CERTOS certos, $ERRADOS errados"

if [ -n "${ARQUIVO_MARCADOR:-}" ]; then
  LIDO=$(docker exec "$ARQUIVOS" sh -c "wget -qO- 'http://armazenamento:8888/buckets/internship-tracker/$ARQUIVO_MARCADOR' | sha256sum | cut -d' ' -f1" || true)
  if [ "$LIDO" = "${SHA_MARCADOR:-}" ]; then
    CERTOS=$((CERTOS + 1))
    echo "Marcador igual ao original."
  else
    ERRADOS=$((ERRADOS + 1))
    echo "Marcador diferente do original: $LIDO" >&2
  fi
fi

if [ "$ERRADOS" -gt 0 ]; then
  echo "FALHA: há arquivos que não voltaram iguais." >&2
  exit 1
fi
# With nothing compared, the files were not proven: an empty result is not a success
if [ "$CERTOS" -eq 0 ]; then
  echo "FALHA: nenhum arquivo foi conferido. Sem documentos no banco, informe ARQUIVO_MARCADOR e SHA_MARCADOR." >&2
  exit 1
fi
echo "Restauração conferida. A cópia temporária será apagada."
