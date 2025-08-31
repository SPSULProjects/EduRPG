#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
STAMP=$(date +%F)
mkdir -p /backups
pg_dump "$DATABASE_URL" | gzip > "/backups/edurpg-${STAMP}.sql.gz"
echo "Backup written to /backups/edurpg-${STAMP}.sql.gz"
