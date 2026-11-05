#!/bin/sh
# Rules of the whole server, not of one project (scripts/servidor/REGRAS-DA-VPS.md). Runs on each
# deploy and is safe to repeat. daemon.json takes effect the next time Docker starts.
set -eu

ORIGEM=$(dirname "$0")

install -m 644 "$ORIGEM/REGRAS-DA-VPS.md" /srv/REGRAS-DA-VPS.md
# Agents read these names when they work from this folder
ln -sf /srv/REGRAS-DA-VPS.md /srv/AGENTS.md
ln -sf /srv/REGRAS-DA-VPS.md /srv/CLAUDE.md

install -m 755 "$ORIGEM/vps-espaco.sh" /usr/local/bin/vps-espaco

# The disk shows up at every login
cat > /etc/update-motd.d/60-vps-espaco <<'EOF'
#!/bin/sh
/usr/local/bin/vps-espaco --curto
EOF
chmod 755 /etc/update-motd.d/60-vps-espaco

# Build cache and logs stop growing without limit, for every project
if [ ! -f /etc/docker/daemon.json ]; then
  cat > /etc/docker/daemon.json <<'EOF'
{
  "builder": { "gc": { "enabled": true, "defaultReservedSpace": "3GB" } },
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  echo "Regras do Docker gravadas; valem quando o Docker reiniciar."
fi
