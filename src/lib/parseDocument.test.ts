import { describe, expect, it } from 'vitest'
import { allocateNoteId, createDocId, formatNoteId, parseNoteId, retargetNoteId } from './ids'
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
Notes

insight-x7k-8392
User may struggle with the application when offline
quote:
"I struggle with using the app in this way."
"offline mode fails"

painpoint-x7k-9288
Checkout friction
quote:
"checkout"
---
interviewer: thanks for joining
participant: yes. ==I struggle with using the app in this way.==^insight-x7k-8392 I am happy to show you.

Later, another mention ==offline mode fails==^insight-x7k-8392 and a shared span ==checkout==^insight-x7k-8392 ^painpoint-x7k-9288.
`

/** Older files had ### headers + type/note fields. */
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

  it('formats and parses typed note ids', () => {
    expect(formatNoteId('insight', 'x7k', 8392)).toBe('insight-x7k-8392')
    expect(parseNoteId('insight-x7k-8392')).toEqual({
      type: 'insight',
      docId: 'x7k',
      numericId: 8392,
    })
    expect(parseNoteId('x7k-8392')).toEqual({
      type: 'insight',
      docId: 'x7k',
      numericId: 8392,
    })
    expect(parseNoteId('bad')).toBeNull()
  })

  it('allocates next free note id with type prefix', () => {
    expect(allocateNoteId('insight', 'x7k', ['insight-x7k-1', 'painpoint-x7k-2'])).toBe(
      'insight-x7k-3',
    )
  })

  it('retargets type prefix', () => {
    expect(retargetNoteId('insight-x7k-8392', 'question')).toBe('question-x7k-8392')
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
    expect(multi?.noteIds).toEqual(['insight-x7k-8392', 'painpoint-x7k-9288'])

    expect(doc.notes).toHaveLength(2)
    const insight = doc.notes.find((n) => n.id === 'insight-x7k-8392')
    expect(insight?.type).toBe('insight')
    expect(insight?.note).toBe('User may struggle with the application when offline')
    expect(insight?.quotes).toEqual([
      'I struggle with using the app in this way.',
      'offline mode fails',
    ])
  })

  it('parses legacy transcript-then-notes order and upgrades ids', () => {
    const doc = parseDocument(LEGACY_SAMPLE)
    expect(doc.notes).toHaveLength(1)
    expect(doc.notes[0]!.id).toBe('insight-x7k-8392')
    expect(doc.notes[0]!.note).toBe('Offline struggle')
    expect(doc.body).toContain('I struggle with using the app in this way.')
    expect(doc.highlights).toHaveLength(1)
    expect(doc.highlights[0]!.noteIds).toEqual(['insight-x7k-8392'])
  })

  it('splits --- with surrounding whitespace', () => {
    const md = `title: Spaced\n\n---\n\nNotes\n\n---\n\nhello body\n`
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
    expect(md.indexOf('Notes')).toBeLessThan(md.indexOf('interviewer:'))
    expect(md).not.toContain('### ')
    expect(md).not.toMatch(/^type:/m)
    expect(md).not.toMatch(/^note:/m)
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
  it('writes notes above transcript without markdown headers', () => {
    const parsed = parseDocument(SAMPLE)
    const md = serializeDocument(parsed)
    const notesAt = md.indexOf('\nNotes\n')
    const bodyAt = md.indexOf('interviewer:')
    expect(notesAt).toBeGreaterThan(-1)
    expect(bodyAt).toBeGreaterThan(-1)
    expect(notesAt).toBeLessThan(bodyAt)
    expect(md).toContain('insight-x7k-8392\nUser may struggle')
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
Notes

question-ab1-42
Where did the quote go?
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

  it('keeps multiline text as one quote, not multiple quote pairs', () => {
    const doc = parseDocument(`title: Multi
---
Notes

insight-zz9-1
Passage
quote:
"first line\\nsecond line"
"other place"
---
body here
`)
    expect(doc.notes[0]!.quotes).toEqual(['first line\nsecond line', 'other place'])

    const md = serializeDocument(doc)
    expect(md).toContain('"first line\\nsecond line"')
    expect(md).toContain('"other place"')
    expect(md).not.toMatch(/"first line"\n"second line"/)

    const again = parseDocument(md)
    expect(again.notes[0]!.quotes).toEqual(['first line\nsecond line', 'other place'])
  })

  it('parses legacy real multiline quoted blocks as one quote', () => {
    const md = `title: Legacy
---
Notes

insight-zz9-2
Old format
quote:
"first line
second line"
---
body
`
    const doc = parseDocument(md)
    expect(doc.notes[0]!.quotes).toEqual(['first line\nsecond line'])
  })
})
