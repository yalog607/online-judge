#!/usr/bin/env bash
set -euo pipefail
cd /opt/itoj

export WEB_IMAGE WORKER_IMAGE
docker compose -f docker-compose.prod.yml pull db
docker pull "$WEB_IMAGE"
docker pull "$WORKER_IMAGE"

PREV_WEB=$(docker compose -f docker-compose.prod.yml images -q web || true)

docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm worker npm run db:migrate

# caddy is not started here: the VPS's own native Caddy reverse-proxies to
# web on 127.0.0.1:3000 instead (see deploy/itoj-site.caddy).
docker compose -f docker-compose.prod.yml up -d --no-deps web worker

for i in $(seq 1 20); do
  if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "healthy"
    exit 0
  fi
  sleep 3
done

echo "health check failed, rolling back web to $PREV_WEB"
if [ -n "$PREV_WEB" ]; then
  WEB_IMAGE="$PREV_WEB" docker compose -f docker-compose.prod.yml up -d --no-deps web
fi
exit 1
