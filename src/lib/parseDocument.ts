import { createDocId, formatNoteId, isValidNoteId, parseNoteId } from './ids'
import type { Document, Highlight, Note, NoteType, Property } from '../types'
import { NOTE_TYPES } from '../types'

const TYPE_ALT = NOTE_TYPES.join('|')
const HIGHLIGHT_REF_RE = new RegExp(
  `==[\\s\\S]*?==\\s*\\^(?:(?:${TYPE_ALT})-)?[a-z0-9]{3}-\\d{1,4}`,
  'i',
)
/** Modern: ^insight-x7k-8392 ; legacy: ^x7k-8392 */
const HIGHLIGHT_RE = new RegExp(
  `==([\\s\\S]*?)==((?:\\s*\\^(?:(?:${TYPE_ALT})-)?[a-z0-9]{3}-\\d{1,4})+)`,
  'gi',
)
const REF_RE = new RegExp(`\\^((?:(?:${TYPE_ALT})-)?[a-z0-9]{3}-\\d{1,4})`, 'gi')
/** Modern unlabeled ref line, or legacy ### heading */
const NOTE_REF_RE = new RegExp(
  `^(?:###\\s+)?((?:${TYPE_ALT})-[a-z0-9]{3}-\\d{1,4}|[a-z0-9]{3}-\\d{1,4})\\s*$`,
  'i',
)
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
  const lines = section
    .replace(/^\s*##?\s*Notes\s*$/im, '')
    .split(/\r?\n/)
  const notes: Note[] = []
  let current: Note | null = null
  let inQuotes = false
  let collectingNoteText = false
  /** Accumulator for legacy multiline "…\n…" quotes (before \n encoding). */
  let openQuoteParts: string[] | null = null

  const flushOpenQuote = () => {
    if (!current || !openQuoteParts) return
    const joined = openQuoteParts.join('\n')
    const q = decodeQuoteValue(joined)
    if (q) current.quotes.push(q)
    openQuoteParts = null
  }

  const flush = () => {
    flushOpenQuote()
    if (current) {
      // Normalize legacy ids to type-doc-numeric
      const parsed = parseNoteId(current.id)
      if (parsed) {
        current.id = formatNoteId(current.type, parsed.docId, parsed.numericId)
      }
      current.note = current.note.trim()
      notes.push(current)
      current = null
    }
    inQuotes = false
    collectingNoteText = false
  }

  const startNote = (rawId: string) => {
    flush()
    const parsed = parseNoteId(rawId)
    current = {
      id: rawId.toLowerCase(),
      type: parsed?.type ?? 'insight',
      note: '',
      quotes: [],
    }
    collectingNoteText = true
  }

  const pushQuoteLine = (rawLine: string) => {
    if (!current) return
    const trimmed = rawLine.trim()
    if (!trimmed) return

    if (openQuoteParts) {
      openQuoteParts.push(rawLine.replace(/\r$/, ''))
      if (endsQuotedString(trimmed)) {
        flushOpenQuote()
      }
      return
    }

    if (trimmed.startsWith('"') && !endsQuotedString(trimmed)) {
      openQuoteParts = [rawLine.replace(/\r$/, '')]
      return
    }

    const q = decodeQuoteValue(trimmed)
    if (q) current.quotes.push(q)
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const refMatch = NOTE_REF_RE.exec(trimmed)
    if (refMatch && !openQuoteParts) {
      startNote(refMatch[1]!)
      continue
    }

    if (!current) continue
    // Local alias — closures mutate `current`, which confuses control-flow narrowing
    const active: Note = current

    if (/^quote:\s*$/i.test(trimmed)) {
      flushOpenQuote()
      inQuotes = true
      collectingNoteText = false
      continue
    }

    const quoteInline = /^quote:\s*(.+)$/i.exec(trimmed)
    if (quoteInline) {
      flushOpenQuote()
      inQuotes = true
      collectingNoteText = false
      pushQuoteLine(quoteInline[1]!)
      continue
    }

    if (inQuotes) {
      if (/^(type|note)\s*:/i.test(trimmed) && !openQuoteParts) {
        inQuotes = false
      } else {
        pushQuoteLine(line)
        continue
      }
    }

    // Legacy labeled fields
    const typeMatch = /^type:\s*(.+)$/i.exec(trimmed)
    if (typeMatch) {
      collectingNoteText = false
      active.type = parseNoteType(typeMatch[1]!)
      continue
    }

    const noteMatch = /^note:\s*(.*)$/i.exec(trimmed)
    if (noteMatch) {
      collectingNoteText = false
      active.note = noteMatch[1]!.trim()
      continue
    }

    // Modern: unlabeled note body until quote: or next ref
    if (collectingNoteText) {
      if (!trimmed) {
        if (active.note) active.note += '\n'
        continue
      }
      active.note = active.note ? `${active.note}\n${trimmed}` : trimmed
    }
  }

  flush()
  return notes
}

/** True if string ends with an unescaped closing ". */
function endsQuotedString(s: string): boolean {
  if (!s.endsWith('"')) return false
  let escapes = 0
  for (let i = s.length - 2; i >= 0 && s[i] === '\\'; i--) escapes++
  return escapes % 2 === 0
}

/**
 * Decode a quote token from the file.
 * Prefers "text\\nwith lines" single-line form; also accepts bare text.
 */
export function decodeQuoteValue(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('"') && endsQuotedString(t) && t.length >= 2) {
    t = t.slice(1, -1)
  }
  // Unescape \\ then \" then \n — process carefully
  let out = ''
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && i + 1 < t.length) {
      const n = t[i + 1]
      if (n === 'n') {
        out += '\n'
        i++
        continue
      }
      if (n === '"' || n === '\\') {
        out += n
        i++
        continue
      }
    }
    out += t[i]
  }
  return out
}

function isNotesSection(text: string): boolean {
  return /^##?\s*Notes\b/m.test(text.trimStart()) || /^Notes\s*$/m.test(text.trimStart())
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
  if (/^##?\s*Notes\b/m.test(t) || /^Notes\s*$/m.test(t)) return true
  // Highlight refs imply our format (modern or legacy)
  if (HIGHLIGHT_REF_RE.test(t)) {
    return true
  }
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

  // Align highlight refs to note ids (upgrade legacy x7k-1 → insight-x7k-1)
  const cleanHighlights = highlights
    .map((h) => ({
      ...h,
      noteIds: h.noteIds
        .map((id) => resolveNoteRef(id, notes))
        .filter((id): id is string => Boolean(id)),
    }))
    .filter((h) => h.noteIds.length > 0)

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

function resolveNoteRef(id: string, notes: Note[]): string | null {
  const lower = id.toLowerCase()
  if (notes.some((n) => n.id === lower)) return lower
  if (!isValidNoteId(lower)) return null
  const parsed = parseNoteId(lower)
  if (!parsed) return null
  const match = notes.find((n) => {
    const np = parseNoteId(n.id)
    return np && np.docId === parsed.docId && np.numericId === parsed.numericId
  })
  if (match) return match.id
  return formatNoteId(parsed.type, parsed.docId, parsed.numericId)
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
