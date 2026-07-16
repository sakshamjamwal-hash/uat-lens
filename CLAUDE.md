# UAT Lens — repo guide for Claude Code

This repo is a **design-UAT tool**. Given a Figma design and a live build (URL) or a
screen recording, you (Claude Code) run the comparison and generate an interactive
gap dashboard the user views locally.

## How it works
- **You are the engine.** The analysis (Figma extraction via the Figma MCP, build capture
  via browser/preview tools or recording frames, gap detection, annotation placement) is
  done by you when the user runs the **`/uat`** command. See `.claude/commands/uat.md` — it
  is the full procedure and the source of truth for the methodology and output schema.
- **`app/`** is the viewer: a Vite + React dashboard that renders `app/public/uat-data.json`.
  You never hand-edit the React components to add a report — you only write `uat-data.json`
  and drop screenshots into `app/public/uat/`.

## Running a UAT
```
/uat <figma_url> <build_url | path/to/recording.mp4> [notes]
```
This writes `app/public/uat-data.json` + screenshots, then starts the dashboard at
http://localhost:5173.

## Data contract (what the viewer reads)
`app/public/uat-data.json` → `{ meta, tabs[] }`. Each tab is one Figma↔build screen pair:
`compare` (the two screenshots) + `block` (one gap table, columns `# / Element / Build /
Figma / Priority`, Fix auto-appended). Rows may carry an `ann` box (percentages) that shows
as a numbered pin on the screenshot with a hover card. Full schema + rules: `.claude/commands/uat.md`.

## Key files
- `.claude/commands/uat.md` — the `/uat` procedure (methodology + schema). **Read this first.**
- `app/src/components/` — dashboard components (PairView, AnnotationLayer, FindingsTable, Lightbox, …). Reused across every report; don't special-case per project.
- `scripts/extract-frames.mjs` — ffmpeg wrapper: recording → frames.
- `app/public/uat-data.json` — the current report (git-ignored by default so each user's run is their own; a sample lives in `samples/`).

## Conventions
- Never report copy/text-wording gaps (only text *style*). One element × property = one row.
- **Saving edits**: Admin-mode Save posts the FULL merged document to `/api/data`, which
  overwrites the ONE canonical report in place — locally that endpoint (a Vite middleware
  in `app/vite.config.js`) rewrites `app/public/uat-data.json` itself; on Vercel
  (`app/api/data.js`) it writes a new versioned blob (`uat-lens/data/<ts>.json`, last 10
  kept as history) because single-blob overwrites are not read-after-write consistent.
  There is NO edit-overlay store and NO download flow (download remains only as a fallback
  on plain static hosting). NEVER reintroduce an overlay keyed to row/tab ids — renaming
  or merging tabs in the base json silently orphaned users' saved edits three times.
- **Publishing a new /uat run** to the shared app: update `app/public/uat-data.json` +
  screenshots, `cd app && vercel deploy --prod --yes`, then seed the backend with the new
  report: `POST https://uat-lens.vercel.app/api/data` with `{ password, data: <the json> }`.
  Without the seed, the deployed app keeps showing the previous canonical document.
