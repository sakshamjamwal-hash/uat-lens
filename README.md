# UAT Lens

Turn a **Figma design + a live build (or a screen recording)** into an interactive,
annotated design-QA report — driven entirely by **Claude Code**, run locally.

You give it two links. Claude compares the design against what shipped, finds the gaps
(colour, size, spacing, radius, missing/added elements, wrong components…), and generates
a dashboard: side-by-side screenshots with numbered gap pins, hover cards showing the
issue + fix + severity, a filterable gap table, fullscreen view, and an admin mode to
edit/add/remove findings.

## Prerequisites
- [Claude Code](https://claude.com/claude-code)
- Node.js 18+
- The **Figma MCP** connected in Claude Code (for reading the design)
- For a live-URL build: a browser/preview MCP (Claude's preview tools or a Chrome MCP)
- For a recording: `ffmpeg` on your PATH (`brew install ffmpeg`)

## Use it
1. Clone and open the folder in Claude Code.
2. Run:
   ```
   /uat <figma_url> <build_url | ./recording.mp4> [optional notes: which screen/state, viewport]
   ```
   e.g. `/uat https://figma.com/design/abc?node-id=12-34 https://beta.myapp.com/checkout "checkout, 1440px"`
   or   `/uat https://figma.com/design/abc?node-id=12-34 ./walkthrough.mov "uploads section, 2:53–3:53"`
3. Claude extracts the Figma frames, captures the build, audits the gaps, writes the report,
   and starts the dashboard at **http://localhost:5173**.

## In the dashboard
- Hover a numbered **gap pin** on a screenshot → card with the element, the build issue, the **fix**, and **severity**.
- Click a screenshot → fullscreen (× to close).
- Click a gap's **#** in the table → jumps to and highlights it on the screenshot.
- **Admin** (top-right, password-gated) → edit cells, change severity, add/delete gaps; save writes back to `uat-data.json`.

## Sharing
Share the repo. Each colleague runs `/uat` locally with their own links. To publish a report
for viewing without Claude, `cd app && npm run build` and host `app/dist/` anywhere static
(or `npx vercel`).

## How it's built
- `app/` — the Vite + React viewer (renders `app/public/uat-data.json`).
- `.claude/commands/uat.md` — the `/uat` procedure Claude follows (the methodology + output schema).
- `scripts/extract-frames.mjs` — recording → frames helper.
- `CLAUDE.md` — guide for Claude Code.
