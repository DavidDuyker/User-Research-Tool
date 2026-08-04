# Pitch: Transcript synthesis MVP

**Appetite:** 2 weeks (small batch)  
**Shape:** Paste → linear review → one markdown export

---

## Problem

User researchers leave interview sessions with transcripts, a head full of half-formed insights, and a mandate to show their work. The tools they reach for fight that job.

Word docs become a dumping ground for notes interleaved with quotes. Digital whiteboards become sticky forests that don’t travel cleanly into a decision memo, a slide, or a Figma comment. Synthesis gets deferred—or done only in the researcher’s head—because documenting rigorously is slower than the next meeting.

What they need is not another research *platform*. They need a focused place to move through one transcript, pull insights with supporting quotes, and leave with something portable and human-readable that can back a conclusion to stakeholders.

---

## Appetite

This is worth **two weeks**, not a quarter.

That appetite forces a hard shape: one session, one surface, one file out. No project library, no multi-interview search, no sync layer. If the idea needs those to feel complete, it doesn’t fit this bet—we ship the core loop first and earn the right to grow.

A solo builder or a pair should be able to finish a usable path: paste a transcript, review it linearly, capture insights with evidence, download markdown that someone else can read without the app.

---

## Solution

### The bet

Build a **browser SPA** (Vite + React + TypeScript) with **no backend**. Interview data never leaves the machine unless the researcher exports it. Session state lives in memory, with `localStorage` as a draft safety net so a refresh doesn’t erase mid-review work. The deliverable of a session is a **downloaded `.md` file**—markdown as the portable source of truth for what comes next (docs repo, whiteboard, slides, Figma comments).

Desktop shells, vault sync, and true filesystem watchers are deliberately later bets. Markdown keeps that door open without paying for it now.

### Opinionated workflow

One composition, three sequential modes—no navigation chrome, no file tree:

```
┌─────────────┐    ┌──────────────────────────────┐    ┌─────────────┐
│   PASTE     │ →  │          REVIEW              │ →  │   EXPORT    │
│             │    │  transcript (scroll) │ insights│    │  preview    │
│  raw text   │    │  select quote → attach/create │    │  .md download│
└─────────────┘    └──────────────────────────────┘    └─────────────┘
```

1. **Paste** — Researcher pastes a meeting transcript. Light heuristics format common speaker patterns (`Speaker:`, Zoom/Meet-ish lines) into readable turns. Parsing can be imperfect; the bar is “readable enough to review,” not universal importer coverage.

2. **Review** — Linear scroll through the interview. Select a span of text to create an insight or attach the quote as evidence to an existing one. Insights sit alongside the transcript (sticky panel) so synthesis accumulates without leaving the scroll.

3. **Export** — Preview the markdown, then download. The file leads with insights (title, notes, supporting quotes), then the transcript with highlights preserved in a simple, greppable marker convention (e.g. `==highlighted span==`). Researchers can copy chunks elsewhere without opening the app again.

### Data shape (one session = one document)

```markdown
# Insights

## Checkout felt risky without a receipt
Researchers note: users hesitated at pay.

> "I never know if it actually went through"
> — Participant, turn 42

# Transcript

**Interviewer:** Walk me through the last time you paid.

**Participant:** ==I never know if it actually went through== so I refresh…
```

No multi-file architecture this cycle. The app’s job is to *produce* that document well, not to manage a research corpus.

### Architecture sketch

| Layer | Choice |
| --- | --- |
| UI | Single-page React app; three modes, shared in-memory session model |
| Persist (draft) | `localStorage` restore mid-session |
| Persist (real) | User-triggered `.md` download |
| Parse | Small heuristic speaker splitter; fall back to plain paragraphs |
| Serialize | Deterministic markdown writer (insights first, then transcript) |
| Backend | None — local-first by omission |

Portability for stakeholders is copy/download, not plugins. A quote block in markdown is already sticky- and comment-friendly.

---

## Rabbit holes

Call these out so the cycle doesn’t disappear into them:

- **Universal transcript parsing.** Zoom, Otter, Teams, Fireflies, and custom note formats all differ. Ship one or two heuristics. If paste looks wrong, the researcher can still highlight—don’t chase format coverage.
- **Round-trip markdown.** Export-only this cycle. Re-importing a hand-edited `.md` and reconstituting highlight ↔ insight links is a project of its own.
- **AI coding / auto-insights.** Tempting, and orthogonal. Manual capture is the product; automation can wait.
- **Desktop / Obsidian / vault integration.** Markdown export is the bridge. File watchers and native shells come after the loop is proven.
- **Perfect highlight fidelity.** Markers should be human-readable and stable enough to cite. Pixel-perfect rich text is out of appetite.

---

## No-gos

Explicitly out of this bet:

- Multi-file projects, libraries, or search across interviews
- Auth, cloud sync, multiplayer, or any server that stores transcripts
- AI summarization or auto-affinity
- Whiteboard / affinity-mapping canvas
- Native desktop app (Tauri/Electron) this cycle
- Figma, Notion, or Slack plugins—portability via markdown is enough
- Bidirectional markdown import / edit-in-place of the exported file

---

## Why this is a good bet

The painful gap is not “lack of research tooling”—it’s the cost of turning one interview into defensible, portable insight. A two-week, local, markdown-out loop attacks that gap directly. If researchers use it once and the file shows up in a decision doc, we’ve validated the shape. Everything else—vaults, multi-session synthesis, AI assist—builds on a proven core instead of a platform bet on day one.
