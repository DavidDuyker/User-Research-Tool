import { createDocId, isValidNoteId, parseNoteId } from './ids'
import type { Document, Highlight, Note, NoteType, Property } from '../types'
import { NOTE_TYPES } from '../types'

const HIGHLIGHT_RE = /==([\s\S]*?)==((?:\s*\^[a-z0-9]{3}-\d{1,4})+)/gi
const REF_RE = /\^([a-z0-9]{3}-\d{1,4})/gi
const NOTE_HEADER_RE = /^###\s+([a-z0-9]{3}-\d{1,4})\s*$/i
const NOTE_TYPES_SET = new Set<string>(NOTE_TYPES)

function newPropId(): string {
  return crypto.randomUUID()
}

function parseProperties(header: string): { title: string; properties: Property[] } {
  const lines = header.split(/\r?\n/)
  const properties: Property[] = []
  let title = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const hashTitle = /^#\s+(.+)$/.exec(trimmed)
    if (hashTitle) {
      title = hashTitle[1]!.trim()
      continue
    }

    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const key = trimmed.slice(0, colon).trim()
    const value = trimmed.slice(colon + 1).trim()
    if (!key) continue

    if (key.toLowerCase() === 'title' && !title) {
      title = value
      continue
    }

    properties.push({ id: newPropId(), key, value })
  }

  return { title, properties }
}

function extractHighlights(markedBody: string): { body: string; highlights: Highlight[]; docIdFromRefs: string | null } {
  const highlights: Highlight[] = []
  let body = ''
  let cursor = 0
  let docIdFromRefs: string | null = null

  const re = new RegExp(HIGHLIGHT_RE.source, HIGHLIGHT_RE.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(markedBody)) !== null) {
    const full = match[0]!
    const text = match[1]!
    const refsChunk = match[2]!
    const matchStart = match.index

    body += markedBody.slice(cursor, matchStart)

    const noteIds: string[] = []
    const refRe = new RegExp(REF_RE.source, REF_RE.flags)
    let refMatch: RegExpExecArray | null
    while ((refMatch = refRe.exec(refsChunk)) !== null) {
      const id = refMatch[1]!.toLowerCase()
      if (!noteIds.includes(id)) noteIds.push(id)
      if (!docIdFromRefs) {
        const parsed = parseNoteId(id)
        if (parsed) docIdFromRefs = parsed.docId
      }
    }

    const start = body.length
    body += text
    const end = body.length

    if (noteIds.length > 0 && text.length > 0) {
      highlights.push({ start, end, text, noteIds })
    }

    cursor = matchStart + full.length
  }

  body += markedBody.slice(cursor)
  return { body, highlights, docIdFromRefs }
}

function parseNoteType(raw: string): NoteType {
  const t = raw.trim().toLowerCase()
  if (NOTE_TYPES_SET.has(t)) return t as NoteType
  return 'insight'
}

function parseNotesSection(section: string): Note[] {
  const lines = section.replace(/^\s*##\s+Notes\s*$/im, '').split(/\r?\n/)
  const notes: Note[] = []
  let current: Note | null = null
  let inQuotes = false

  const flush = () => {
    if (current) {
      notes.push(current)
      current = null
    }
    inQuotes = false
  }

  for (const line of lines) {
    const header = NOTE_HEADER_RE.exec(line.trim())
    if (header) {
      flush()
      current = {
        id: header[1]!.toLowerCase(),
        type: 'insight',
        note: '',
        quotes: [],
      }
      continue
    }

    if (!current) continue

    const trimmed = line.trim()

    if (/^quote:\s*$/i.test(trimmed) || /^quote:\s*/i.test(trimmed) && trimmed.toLowerCase() === 'quote:') {
      inQuotes = true
      const inline = trimmed.slice(trimmed.indexOf(':') + 1).trim()
      if (inline) {
        const q = unwrapQuoted(inline)
        if (q) current.quotes.push(q)
      }
      continue
    }

    if (inQuotes) {
      if (!trimmed) continue
      if (/^(type|note)\s*:/i.test(trimmed)) {
        inQuotes = false
      } else {
        const q = unwrapQuoted(trimmed)
        if (q) current.quotes.push(q)
        continue
      }
    }

    const typeMatch = /^type:\s*(.+)$/i.exec(trimmed)
    if (typeMatch) {
      current.type = parseNoteType(typeMatch[1]!)
      continue
    }

    const noteMatch = /^note:\s*(.*)$/i.exec(trimmed)
    if (noteMatch) {
      current.note = noteMatch[1]!.trim()
      continue
    }

    const quoteField = /^quote:\s*(.+)$/i.exec(trimmed)
    if (quoteField) {
      inQuotes = true
      const q = unwrapQuoted(quoteField[1]!)
      if (q) current.quotes.push(q)
    }
  }

  flush()
  return notes
}

function unwrapQuoted(raw: string): string {
  const t = raw.trim()
  const m = /^"(.*)"$/.exec(t)
  if (m) return m[1]!
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1)
  return t
}

function isNotesSection(text: string): boolean {
  return /^##\s+Notes\b/m.test(text.trimStart())
}

function splitDocument(markdown: string): { header: string; bodyMarked: string; notesSection: string } {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  // Allow whitespace around --- separators (common when copying from editors)
  const parts = normalized.split(/\n[ \t]*---[ \t]*\n/)

  if (parts.length >= 3) {
    const header = parts[0]!.trimEnd()
    const rest = parts.slice(1)
    const notesIdx = rest.findIndex(isNotesSection)
    if (notesIdx >= 0) {
      const notesSection = rest[notesIdx]!
      const bodyParts = rest.filter((_, i) => i !== notesIdx)
      return {
        header,
        bodyMarked: bodyParts.join('\n---\n'),
        notesSection,
      }
    }
    // Legacy fallback: props | body | notes (no ## Notes header detected)
    return {
      header,
      bodyMarked: rest[0]!,
      notesSection: rest.slice(1).join('\n---\n'),
    }
  }

  if (parts.length === 2) {
    const second = parts[1]!
    if (isNotesSection(second)) {
      return { header: parts[0]!.trimEnd(), bodyMarked: '', notesSection: second }
    }
    return { header: parts[0]!.trimEnd(), bodyMarked: second, notesSection: '' }
  }

  // No --- separators: treat entire file as body (paste path)
  return { header: '', bodyMarked: normalized, notesSection: '' }
}

/** True when text looks like our document format (not a raw transcript paste). */
export function looksLikeDocumentMarkdown(text: string): boolean {
  const t = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  if (!t) return false
  if (/^##\s+Notes\b/m.test(t)) return true
  // Highlight refs imply our format
  if (/==[\s\S]*?==\s*\^[a-z0-9]{3}-\d{1,4}/i.test(t)) return true
  // Our saved docs always have two --- section dividers (props | notes | body)
  const parts = t.split(/\n[ \t]*---[ \t]*\n/)
  if (parts.length >= 3) return true
  // Single divider + leading title: property header
  if (parts.length === 2 && /^title\s*:/im.test((parts[0] ?? '').trim())) return true
  return false
}

function inferDocId(notes: Note[], highlights: Highlight[], fromRefs: string | null): string {
  if (fromRefs) return fromRefs
  for (const n of notes) {
    const p = parseNoteId(n.id)
    if (p) return p.docId
  }
  for (const h of highlights) {
    for (const id of h.noteIds) {
      const p = parseNoteId(id)
      if (p) return p.docId
    }
  }
  return createDocId()
}

function titleToFilename(title: string): string {
  const stem = (title || 'Untitled').trim() || 'Untitled'
  return stem.endsWith('.md') ? stem : `${stem}.md`
}

/**
 * Parse markdown into a Document.
 * Body is stored plain (markers stripped); highlights carry offsets.
 */
export function parseDocument(markdown: string, opts?: { filename?: string }): Document {
  const { header, bodyMarked, notesSection } = splitDocument(markdown)
  const { title: headerTitle, properties } = parseProperties(header)
  const { body, highlights, docIdFromRefs } = extractHighlights(bodyMarked)
  const notes = parseNotesSection(notesSection)
  const docId = inferDocId(notes, highlights, docIdFromRefs)

  let title = headerTitle
  if (!title && opts?.filename) {
    title = opts.filename.replace(/\.md$/i, '')
  }
  if (!title) title = 'Untitled'

  const filename = opts?.filename ?? titleToFilename(title)

  // Drop invalid note ids from highlights
  const cleanHighlights = highlights.map((h) => ({
    ...h,
    noteIds: h.noteIds.filter(isValidNoteId),
  })).filter((h) => h.noteIds.length > 0)

  return {
    docId,
    title,
    filename,
    properties,
    body,
    highlights: cleanHighlights,
    notes,
    markdown: '',
    updatedAt: new Date().toISOString(),
  }
}

/** Ingest raw paste: treat as body only, fresh doc id, no notes. */
export function documentFromPaste(text: string): Document {
  const body = text.replace(/\r\n/g, '\n').trim()
  const docId = createDocId()
  return {
    docId,
    title: 'Untitled',
    filename: 'Untitled.md',
    properties: [],
    body,
    highlights: [],
    notes: [],
    markdown: '',
    updatedAt: new Date().toISOString(),
  }
}

/** Paste/open ingest: structured MD → parseDocument; raw transcript → plain body. */
export function ingestMarkdown(text: string, opts?: { filename?: string }): Document {
  if (looksLikeDocumentMarkdown(text)) {
    return parseDocument(text, opts)
  }
  return documentFromPaste(text)
}
