#!/bin/sh
# Daily dump of the Kompri database, kept BACKUP_DAYS days (30 by default, as
# announced in the privacy policy). Connection settings come from the standard
# PG* variables. BACKUP_ONCE=1 runs a single dump, for tests and manual use.
set -eu
keep="${BACKUP_DAYS:-30}"
dir="${BACKUP_DIR:-/backups}"
while true; do
  file="$dir/kompri-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
  # Written under a temporary name: a failed dump never looks like a backup.
  if pg_dump --format=custom --file="$file.partial"; then
    mv "$file.partial" "$file"
    echo "backup written: $(basename "$file")"
  else
    rm -f "$file.partial"
    echo "backup failed" >&2
  fi
  find "$dir" -name 'kompri-*.dump' -mtime +"$((keep - 1))" -delete
  [ "${BACKUP_ONCE:-0}" = 1 ] && break
  sleep 86400
done
