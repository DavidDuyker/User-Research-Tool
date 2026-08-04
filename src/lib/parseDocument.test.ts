import { describe, expect, it } from 'vitest'
import { allocateNoteId, createDocId, formatNoteId, parseNoteId } from './ids'
import {
  documentFromPaste,
  ingestMarkdown,
  looksLikeDocumentMarkdown,
  parseDocument,
} from './parseDocument'
import { serializeDocument } from './serializeDocument'

/** Canonical order: properties → Notes → transcript */
const SAMPLE = `title: Interview with Alex
session type: interview
participant: Alex
---
## Notes

### x7k-8392
type: insight
note: User may struggle with the application when offline
quote:
"I struggle with using the app in this way."
"offline mode fails"

### x7k-9288
type: painpoint
note: Checkout friction
quote:
"checkout"
---
interviewer: thanks for joining
participant: yes. ==I struggle with using the app in this way.==^x7k-8392 I am happy to show you.

Later, another mention ==offline mode fails==^x7k-8392 and a shared span ==checkout==^x7k-8392 ^x7k-9288.
`

/** Older files had transcript before notes — still parse. */
const LEGACY_SAMPLE = `title: Interview with Alex
session type: interview
participant: Alex
---
interviewer: thanks for joining
participant: yes. ==I struggle with using the app in this way.==^x7k-8392 I am happy to show you.
---
## Notes

### x7k-8392
type: insight
note: Offline struggle
quote:
"I struggle with using the app in this way."
`

describe('ids', () => {
  it('creates 3-char doc ids', () => {
    expect(createDocId()).toMatch(/^[a-z0-9]{3}$/)
  })

  it('formats and parses note ids', () => {
    expect(formatNoteId('x7k', 8392)).toBe('x7k-8392')
    expect(parseNoteId('x7k-8392')).toEqual({ docId: 'x7k', numericId: 8392 })
    expect(parseNoteId('bad')).toBeNull()
  })

  it('allocates next free note id', () => {
    expect(allocateNoteId('x7k', ['x7k-1', 'x7k-2'])).toBe('x7k-3')
  })
})

describe('parseDocument', () => {
  it('parses properties, body highlights, and notes (notes above transcript)', () => {
    const doc = parseDocument(SAMPLE)
    expect(doc.title).toBe('Interview with Alex')
    expect(doc.docId).toBe('x7k')
    expect(doc.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'session type', value: 'interview' }),
        expect.objectContaining({ key: 'participant', value: 'Alex' }),
      ]),
    )
    expect(doc.body).not.toContain('==')
    expect(doc.body).toContain('I struggle with using the app in this way.')
    expect(doc.body).toContain('checkout')

    expect(doc.highlights).toHaveLength(3)
    const multi = doc.highlights.find((h) => h.text === 'checkout')
    expect(multi?.noteIds).toEqual(['x7k-8392', 'x7k-9288'])

    expect(doc.notes).toHaveLength(2)
    const insight = doc.notes.find((n) => n.id === 'x7k-8392')
    expect(insight?.type).toBe('insight')
    expect(insight?.quotes).toEqual([
      'I struggle with using the app in this way.',
      'offline mode fails',
    ])
  })

  it('parses legacy transcript-then-notes order', () => {
    const doc = parseDocument(LEGACY_SAMPLE)
    expect(doc.notes).toHaveLength(1)
    expect(doc.notes[0]!.note).toBe('Offline struggle')
    expect(doc.body).toContain('I struggle with using the app in this way.')
    expect(doc.highlights).toHaveLength(1)
  })

  it('splits --- with surrounding whitespace', () => {
    const md = `title: Spaced\n\n---\n\n## Notes\n\n---\n\nhello body\n`
    const doc = parseDocument(md)
    expect(doc.title).toBe('Spaced')
    expect(doc.body.trim()).toBe('hello body')
  })

  it('treats paste as plain body', () => {
    const doc = documentFromPaste('interviewer: hello\nparticipant: hi')
    expect(doc.body).toContain('interviewer: hello')
    expect(doc.highlights).toHaveLength(0)
    expect(doc.notes).toHaveLength(0)
    expect(doc.docId).toMatch(/^[a-z0-9]{3}$/)
  })
})

describe('ingestMarkdown', () => {
  it('detects structured documents', () => {
    expect(looksLikeDocumentMarkdown(SAMPLE)).toBe(true)
    expect(looksLikeDocumentMarkdown('interviewer: hello\nparticipant: hi')).toBe(false)
  })

  it('round-trips saved markdown via ingest (paste path)', () => {
    const parsed = parseDocument(SAMPLE)
    const md = serializeDocument(parsed)
    expect(md.indexOf('## Notes')).toBeLessThan(md.indexOf('interviewer:'))
    const ingested = ingestMarkdown(md)

    expect(ingested.title).toBe(parsed.title)
    expect(ingested.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'session type', value: 'interview' }),
        expect.objectContaining({ key: 'participant', value: 'Alex' }),
      ]),
    )
    expect(ingested.highlights).toHaveLength(parsed.highlights.length)
    expect(ingested.notes).toHaveLength(parsed.notes.length)
    expect(ingested.body).toBe(parsed.body)
  })

  it('keeps raw transcripts as plain body', () => {
    const raw = 'interviewer: thanks\nparticipant: sure thing'
    const doc = ingestMarkdown(raw)
    expect(doc.highlights).toHaveLength(0)
    expect(doc.notes).toHaveLength(0)
    expect(doc.properties).toHaveLength(0)
    expect(doc.body).toContain('sure thing')
  })
})

describe('serializeDocument round-trip', () => {
  it('writes notes above transcript', () => {
    const parsed = parseDocument(SAMPLE)
    const md = serializeDocument(parsed)
    const notesAt = md.indexOf('## Notes')
    const bodyAt = md.indexOf('interviewer:')
    expect(notesAt).toBeGreaterThan(-1)
    expect(bodyAt).toBeGreaterThan(-1)
    expect(notesAt).toBeLessThan(bodyAt)
  })

  it('round-trips sample document', () => {
    const parsed = parseDocument(SAMPLE)
    const md = serializeDocument(parsed)
    const again = parseDocument(md)

    expect(again.title).toBe(parsed.title)
    expect(again.docId).toBe(parsed.docId)
    expect(again.body).toBe(parsed.body)
    expect(again.highlights).toEqual(parsed.highlights)
    expect(again.notes.map((n) => ({ ...n, quotes: n.quotes }))).toEqual(
      parsed.notes.map((n) => ({ ...n, quotes: n.quotes })),
    )
  })

  it('preserves orphan notes with empty quotes', () => {
    const md = `title: Orphan
---
## Notes

### ab1-42
type: question
note: Where did the quote go?
quote:
---
no highlights here
`
    const doc = parseDocument(md)
    expect(doc.notes).toHaveLength(1)
    expect(doc.notes[0]!.quotes).toEqual([])
    expect(doc.highlights).toHaveLength(0)

    const again = parseDocument(serializeDocument(doc))
    expect(again.notes[0]!.note).toBe('Where did the quote go?')
    expect(again.notes[0]!.quotes).toEqual([])
  })
})
