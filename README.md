# Transcript Synthesis

Local-first interview synthesis: paste or open a markdown transcript, highlight evidence into typed notes, and keep a linked `.md` file auto-updated.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Workflow

1. **Paste** a transcript (or a previously saved `.md`), **Open** a file, or **Load sample**
2. Edit the filename/title and optional properties
3. Select text → **+ add insight** → pick type → write a note
4. Work is always saved as a **browser draft** (survives refresh). Status shows `draft saved`.
5. In **Chrome/Edge**, Open (or the first note) can **link** a `.md` for live disk writes — status becomes `linked · live`
6. Hover a highlight to view or edit its note

Topbar: filename + status, **Open**, **New**.

## Markdown shape

```markdown
title: Document title
session type: interview

---
Notes

insight-abc-1234
The note text is the focus
quote:
"supporting excerpt"
---
transcript body with ==highlighted spans==^insight-abc-1234
```

Notes sit above the transcript (no markdown headers). Each note starts with a `{type}-{doc}-{n}` ref line, then the note body, then quotes. In the app, notes still appear on highlight hover.## Scripts

- `npm run dev`
- `npm run build`
- `npm test`
