#!/usr/bin/env bash
# Sketch for manual blue/green deploy on Ubuntu. Edit APP_DIR, NGINX_CONF, SERVICE_PREFIX.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mannabe}"
STATE_FILE="${STATE_FILE:-/var/lib/mannabe/active-slot}"
LIVE_PORT="${LIVE_PORT:-3001}"
IDLE_PORT="${IDLE_PORT:-3002}"

cd "$APP_DIR"

if [[ -f "$STATE_FILE" ]]; then
  cur="$(cat "$STATE_FILE")"
  if [[ "$cur" == "$LIVE_PORT" ]]; then
    IDLE_PORT=3002
    LIVE_PORT=3001
  else
    IDLE_PORT=3001
    LIVE_PORT=3002
  fi
fi

echo "Building for idle slot on port $IDLE_PORT …"
git pull
pnpm install --frozen-lockfile
pnpm build

# Run migrations when your process uses Drizzle against production:
# DATABASE_URL=… pnpm db:migrate

echo "Starting idle instance on $IDLE_PORT (configure systemd to match) …"
# sudo systemctl start "mannabe@${IDLE_PORT}.service"

echo "Health check …"
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${IDLE_PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 1
done

echo "Point nginx upstream to $IDLE_PORT and reload (edit NGINX include) …"
# sudo nginx -s reload

echo "$IDLE_PORT" >"$STATE_FILE"

echo "Drain, then stop old live instance on $LIVE_PORT …"
# sudo systemctl stop "mannabe@${LIVE_PORT}.service"

echo "Done."
