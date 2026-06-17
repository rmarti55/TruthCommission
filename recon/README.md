# Block A Recon — NM Truth Commission Tracker

Completed **2026-06-17**. Maps all ingest sources before building the pipeline.

## Deliverables

| File | Purpose |
|------|---------|
| [`sources.json`](sources.json) | Master manifest — URLs, patterns, subpoenas, meetings, adapter specs |
| [`caption-validation.json`](caption-validation.json) | Harmony API validation summary |
| [`samples/captions-79821.json`](samples/captions-79821.json) | Full Jun 1, 2026 transcript API response (~1275 segments) |
| [`samples/captions-79719.json`](samples/captions-79719.json) | Full Feb 17, 2026 transcript API response (~368 segments) |

## Step 1 — Recent Subpoenas ✓

- **Page:** https://www.nmtruthcommission.com/subpoena (nav: Public Information)
- **6 PDFs** verified (302 → Squarespace CDN, all HTTP 200)
- Issued **2026-06-05**; compliance deadline **2026-06-30**
- **8 more** of 14 announced targets not yet posted

## Step 2 — Commission meetings page ✓

- **Page:** https://www.nmtruthcommission.com/meetingsandarchives
- **Upcoming:** July 2026 (details TBD on site)
- **Previous meetings:**
  - Jun 1, 2026 — Harmony **79821**, handout link **broken (404)** on commission site
  - Feb 17, 2026 — Harmony **79719**
  - Nov 6–7, 2025 — CCJC presentation PDF on nmlegis.gov

## Step 3 — nmlegis HISC patterns ✓

- **Committee page:** https://www.nmlegis.gov/Committee/Interim_Committee?CommitteeCode=HISC
- **Agendas:** `/agendas/HISCage{Mon}{DD}.26.pdf` (Jun 1 + Jun 18 confirmed)
- **Handouts:** `Handouts_List?CommitteeCode=HISC&Date={M/D/YYYY}`
- **Upcoming Jun 18:** teleconference + Zoom `88271745882`
- **Feb 17 recording:** event **79719** (PowerBrowserV2)

## Step 4 — Harmony APIs ✓

| API | Event 79821 (Jun 1) | Event 79719 (Feb 17) |
|-----|---------------------|----------------------|
| `GetClosedCaption?meetingID=` | 1275 segments, key `lang` | 368 segments, key `en` |
| `GetNewData?id=` | Adjourned, 45 min | Adjourned, ~14 min |
| `GetStreamData?id=` | HLS enabled, 2736s | HLS enabled, 825s |

Primary transcript ingest: **`GetClosedCaption`** — no browser scraping needed.

## Known issues

1. Commission site handout `/s/NM-Survivors-Truth-Commission-6126.pdf` returns **404** — use nmlegis handout (5.7MB) as fallback.
2. Jun 1 recording link on commission site uses **linkprotect** wrapper — normalize to canonical Harmony URL.
3. Commission site says **July 2026** upcoming; nmlegis shows **June 18** — poll both.

## Next: Block B (Steps 5–8)

Scaffold monorepo, Postgres (Neon via Vercel), Blob, Cron — then push to GitHub and import on Vercel. See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).
