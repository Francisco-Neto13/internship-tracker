#!/bin/sh
# What takes the disk, separating data from reservation. Changes nothing and opens no file.
# Installed as /usr/local/bin/vps-espaco; with --curto, one line for the login message.
set -u

DISCO=/srv
LIMITE_LIVRE=20
USO=$(df --output=pcent "$DISCO" | tail -1 | tr -dc 0-9)
LIVRE=$((100 - USO))
LIVRE_GB=$(df -BG --output=avail "$DISCO" | tail -1 | tr -dc 0-9)

if [ "${1:-}" = "--curto" ]; then
  if [ "$LIVRE" -lt "$LIMITE_LIVRE" ]; then
    printf '\n  ATENÇÃO: disco com só %s%% livre (%s GB). Rode: vps-espaco\n\n' "$LIVRE" "$LIVRE_GB"
  else
    printf '\n  Disco: %s%% livre (%s GB). Regras desta VPS: /srv/REGRAS-DA-VPS.md\n\n' "$LIVRE" "$LIVRE_GB"
  fi
  exit 0
fi

echo "Disco"
df -h "$DISCO" | tail -1 | awk '{printf "  %s de %s em uso, %s livres (%s)\n", $3, $2, $4, $5}'
if [ "$LIVRE" -lt "$LIMITE_LIVRE" ]; then
  echo "  ATENÇÃO: menos de ${LIMITE_LIVRE}% livre. Resolva antes de subir qualquer coisa."
fi

if [ -e /srv/cofre.img ]; then
  echo
  echo "Cofre do tracker"
  echo "  Tamanho fixo: $(du -h /srv/cofre.img | cut -f1)"
  if mountpoint -q /srv/dados; then
    df -h /srv/dados | tail -1 | awk '{printf "  Em uso dentro dele: %s, dos quais só tamanhos, sem abrir nada:\n", $3}'
    du -sh /srv/dados/* 2>/dev/null | sed 's/^/    /'
    echo "  Dado real, sem reserva: $(du -sh --apparent-size /srv/dados 2>/dev/null | cut -f1)"
  else
    echo "  Fechado: rode cofre-abrir.sh"
  fi
fi
if [ -e /srv/cofre-antigo.img ]; then
  echo
  echo "ATENÇÃO: /srv/cofre-antigo.img ocupa $(du -h /srv/cofre-antigo.img | cut -f1). Depois de conferir o sistema, apague."
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo
  echo "Docker"
  docker system df --format '  {{.Type}}: {{.Size}} ({{.Reclaimable}} recuperável)'
fi

echo
echo "Maiores pastas fora do cofre"
du -xh --max-depth=1 / 2>/dev/null | sort -rh | sed -n '2,6p' | sed 's/^/  /'
echo
echo "Regras desta VPS: /srv/REGRAS-DA-VPS.md"
