#!/usr/bin/env bash
set -euo pipefail
cd ~/online-judge

git fetch origin
git reset --hard origin/main

# Docker daemon receives sandbox bind mounts, so this must exist on the host
# and be mounted into the worker at the same absolute path.
install -d -m 0755 /var/lib/itoj/judge

# Keep the currently-running images as a rollback target before rebuilding.
docker tag itoj-web:local itoj-web:prev 2>/dev/null || true
docker tag itoj-worker:local itoj-worker:prev 2>/dev/null || true

docker compose -f docker-compose.prod.yml build web worker
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

echo "health check failed, rolling back"
docker tag itoj-web:prev itoj-web:local 2>/dev/null || true
docker tag itoj-worker:prev itoj-worker:local 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --no-deps web worker
exit 1
