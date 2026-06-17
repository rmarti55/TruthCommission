# NM Truth Commission Tracker

Independent civic platform that ingests official Survivors' Truth Commission materials (subpoenas, agendas, handouts) and NM Legislature meeting transcripts, then publishes searchable archives and instant email summaries.

## Status

| Block | Status |
|-------|--------|
| **A — Recon** | Done — see [`recon/`](recon/) |
| **B — Foundation** | Next — Next.js + Postgres + Vercel |
| **C — Subpoena MVP** | Pending |
| **D–F** | Pending |

## Repo layout (planned)

```
TruthCommission/
  apps/web/           # Next.js App Router (Vercel root directory)
  packages/db/        # Drizzle schema + migrations
  packages/ingest/    # Source adapters (commission, nmlegis, Harmony)
  recon/              # Block A manifest + caption samples
  docs/               # Deployment and ops notes
```

## Data sources

Documented in [`recon/sources.json`](recon/sources.json):

- [nmtruthcommission.com](https://www.nmtruthcommission.com) — subpoenas, meetings
- [nmlegis.gov HISC](https://www.nmlegis.gov/Committee/Interim_Committee?CommitteeCode=HISC) — agendas, handouts
- Harmony SLIQ — `GetClosedCaption?meetingID={id}` for transcripts

## Deploy

GitHub → Vercel. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Disclaimer

Independent tracker — not affiliated with the NM Legislature or the Truth Commission.
