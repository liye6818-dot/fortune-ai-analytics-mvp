# Server stability runbook

The production server has two independent Node.js services:

- `caishenye-admin`: main site and administration API on port 3000.
- `caishenye-online`: online application on port 3100.

Production data and `.env` files must never be replaced by a routine code rollback.

## Before every deployment

1. Run `scripts/server-health-check.ps1`.
2. Run `scripts/server-backup-current.ps1`.
3. Confirm both PM2 services are online.
4. Deploy only from a reviewed GitHub commit.
5. Run the health check again.

## Safe rollback

Use `scripts/server-restore-code.ps1` with an explicit backup path and confirmation:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Sites\operations\server-restore-code.ps1 `
  -BackupPath C:\Sites\backups\stable-20260716 `
  -Confirm RESTORE-CODE
```

The restore script excludes:

- `database` directories
- `.env` files
- `node_modules`
- `.git`

This preserves access codes, room data, orders, secrets, and installed dependencies.

## Never delete

- The PM2 working directories.
- `production.sqlite` while a service is running.
- `.env` files.
- The most recent verified backup.
- `C:\Users\Administrator\.pm2\dump.pm2`.
