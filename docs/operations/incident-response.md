# Incident Response

## Severity
- **SEV1**: Data integrity breach, major outage, PII exposure.
- **SEV2**: Critical upstream down, major feature broken.
- **SEV3**: Minor degradation, stale data beyond SLA.

## Roles
- **Incident Commander**: coordinates, updates status.
- **Ops**: mitigates infra issues.
- **Data Lead**: disables bad panels, triggers re-ingest.
- **Comms**: posts status banner/notes.

## Playbooks
- **Upstream down**: Open breaker, serve cache, banner with transparency.
- **Bad dataset**: Disable panel, revert to prior snapshot, post-mortem in 48h.
- **Security event**: Rotate keys, invalidate sessions, notify users if required.

## Communication
- Status banner in app; internal Slack/Email; incident doc with timeline.

## Post-Mortem
- Within 72h: root cause, impact, actions, owners, deadlines. No blame.
