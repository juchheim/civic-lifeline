# Data Governance

## Provenance
- Store `source`, `sourceUrl`, `fetchedAt`, and `dataVintage` where applicable.
- Keep ETL logs with checksums for CSVs.

## Retention
- Counselor cache: 24h
- Letters: 30 days (configurable)
- Logs: 30–90 days
- Analytics: aggregate without PII

## Access Control
- RBAC on datasets (mods see verification data).
- Production DB read access limited to operators.

## Backups
- MongoDB Atlas backups daily; restore tested quarterly.
- S3 versioning for raw CSV.

## Data Quality
- Schema validation; null-safe rendering.
- Random sample audits per release.

## Change Management
- Version schemas; migration scripts.
- Communicate breaking changes in RELEASE_NOTES.md.
