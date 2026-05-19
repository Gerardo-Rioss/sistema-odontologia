#!/bin/bash
# ─── Database Backup Script ─────────────────────────────────
# Generates a compressed pg_dump of the production database.
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/backup.sh
#
# Output:
#   backups/backup-YYYY-MM-DD-HHmmss.sql.gz
#
# Requires:
#   - PostgreSQL client tools (pg_dump)
#   - gzip

set -euo pipefail

# ─── Configuration ─────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ─── Pre-flight checks ─────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL no está definida." >&2
  echo "  Uso: DATABASE_URL=\"postgresql://...\" bash scripts/backup.sh" >&2
  exit 1
fi

if ! command -v pg_dump &> /dev/null; then
  echo "[ERROR] pg_dump no encontrado. Instalá PostgreSQL client tools." >&2
  exit 1
fi

if ! command -v gzip &> /dev/null; then
  echo "[ERROR] gzip no encontrado." >&2
  exit 1
fi

# ─── Ensure backup directory exists ────────────────────
mkdir -p "${BACKUP_DIR}"

# ─── Generate timestamped filename ─────────────────────
TIMESTAMP="$(date +"%Y-%m-%d-%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql.gz"

# ─── Run pg_dump with compression ──────────────────────
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Iniciando backup..."

if pg_dump --format=custom --dbname="${DATABASE_URL}" 2> /tmp/pgdump_error.log | gzip > "${BACKUP_FILE}"; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup exitoso: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup FALLÓ" >&2
  if [ -s /tmp/pgdump_error.log ]; then
    echo "  pg_dump error:" >&2
    cat /tmp/pgdump_error.log >&2
  fi
  rm -f "${BACKUP_FILE}" /tmp/pgdump_error.log
  exit 1
fi

rm -f /tmp/pgdump_error.log

# ─── Clean old backups ─────────────────────────────────
if [ -n "${RETENTION_DAYS}" ] && [ "${RETENTION_DAYS}" -gt 0 ]; then
  DELETED_COUNT=$(find "${BACKUP_DIR}" -name "backup-*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
  if [ "${DELETED_COUNT}" -gt 0 ]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Limpieza: ${DELETED_COUNT} backups eliminados (>${RETENTION_DAYS} días)"
  fi
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Completado."
