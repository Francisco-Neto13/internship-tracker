#!/usr/bin/env bash
# Runs once, as root, on the server: bash configurar-deploy.sh "<public key of the CI>"
# Creates the user 'deploy', whose key can only trigger /usr/local/sbin/internship-deploy.
set -euo pipefail

CHAVE_CI="${1:?public key of the CI}"

if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
passwd -l deploy >/dev/null

cat > /usr/local/sbin/internship-deploy <<'EOF'
#!/usr/bin/env bash
# Deploy of the Internship Tracker: runs the script that is on origin/main.
set -euo pipefail
CODIGO=/srv/internship-tracker
case "${1:-}" in
  "") DRY_RUN=false ;;
  --dry-run) DRY_RUN=true ;;
  *) echo "uso: internship-deploy [--dry-run]" >&2; exit 2 ;;
esac
cd "$CODIGO"
git fetch --quiet origin
git show origin/main:scripts/servidor/implantar.sh | bash -s -- "$CODIGO" "$DRY_RUN"
EOF

cat > /usr/local/sbin/internship-deploy-ssh <<'EOF'
#!/usr/bin/env bash
# Forced command of the CI key: it can only trigger the deploy.
set -euo pipefail
case "${SSH_ORIGINAL_COMMAND:-}" in
  "deploy") exec sudo -n /usr/local/sbin/internship-deploy ;;
  "deploy --dry-run") exec sudo -n /usr/local/sbin/internship-deploy --dry-run ;;
  *) echo "Comando não permitido para esta chave. Use: deploy | deploy --dry-run" >&2; exit 1 ;;
esac
EOF

chown root:root /usr/local/sbin/internship-deploy /usr/local/sbin/internship-deploy-ssh
chmod 755 /usr/local/sbin/internship-deploy /usr/local/sbin/internship-deploy-ssh

SUDOERS_TMP="$(mktemp)"
cat > "$SUDOERS_TMP" <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/local/sbin/internship-deploy "", /usr/local/sbin/internship-deploy --dry-run
EOF
visudo -cf "$SUDOERS_TMP" >/dev/null
install -o root -g root -m 440 "$SUDOERS_TMP" /etc/sudoers.d/internship-deploy
rm -f "$SUDOERS_TMP"

install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
printf 'command="/usr/local/sbin/internship-deploy-ssh",restrict %s\n' "$CHAVE_CI" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

visudo -c >/dev/null
echo "usuario: $(id deploy)"
echo "senha: $(passwd -S deploy | awk '{print $2}') (L = bloqueada)"
