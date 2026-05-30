# database-backups Specification

## Purpose

PostgreSQL backup strategy with pg_dump script, Railway automated backups, and documented restore procedure.

## Requirements

### Requirement: pg_dump Backup Script

The system MUST provide a `scripts/backup.sh` script that performs a `pg_dump` of the production database.

| Parameter | Source |
|-----------|--------|
| Connection string | `DATABASE_URL` env var |
| Output file | `backups/backup-YYYY-MM-DD-HHmmss.sql.gz` |
| Schedule | External cron (documented, not automated) |

The script SHALL use `pg_dump --format=custom` for compressed, restorable backups.

#### Scenario: Manual backup execution succeeds

- GIVEN `DATABASE_URL` is set and target database is reachable
- WHEN `bash scripts/backup.sh` is executed
- THEN a compressed `.sql.gz` backup SHALL be created in the `backups/` directory

#### Scenario: Backup fails on unreachable database

- GIVEN the target database is unreachable
- WHEN `scripts/backup.sh` is executed
- THEN the script SHALL exit with non-zero code AND print a descriptive error to stderr

### Requirement: Railway Backup Configuration

The system SHOULD document how to enable Railway's built-in daily automated backups as the primary strategy, with `pg_dump` as secondary.

#### Scenario: Operator consults Railway backup docs

- GIVEN `DEPLOYMENT.md` references Railway backups
- WHEN the operator reads the backup section
- THEN the documentation SHALL include steps to enable Railway automated backups AND daily retention settings

### Requirement: Restore Procedure

`DEPLOYMENT.md` SHALL document restore steps: download backup, `pg_restore` into target database, verify data integrity.

#### Scenario: Operator restores from backup

- GIVEN a valid backup file exists
- WHEN the operator follows documented restore steps
- THEN the target database SHALL contain the backed-up data AND a verification query SHALL confirm row counts match
