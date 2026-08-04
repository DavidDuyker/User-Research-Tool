import { describe, expect, it } from 'vitest'
import { formatNotesHtml, formatNotesPlain } from './formatNotesClipboard'
import type { Highlight, Note } from '../types'

const notes: Note[] = [
  {
    id: 'question-a1b-1',
    type: 'question',
    note: 'What about offline?',
    quotes: ['does it work offline'],
  },
  {
    id: 'insight-a1b-2',
    type: 'insight',
    note: 'Users struggle offline',
    quotes: ['I struggle when offline', 'refresh constantly'],
  },
]

const highlights: Highlight[] = [
  { start: 0, end: 10, text: 'x', noteIds: ['question-a1b-1'] },
  { start: 11, end: 20, text: 'y', noteIds: ['insight-a1b-2'] },
]

describe('formatNotesClipboard', () => {
  it('orders types insight first and question last', () => {
    const plain = formatNotesPlain(notes, highlights)
    expect(plain.indexOf('INSIGHT')).toBeLessThan(plain.indexOf('QUESTION'))
    expect(plain).toContain('Users struggle offline')
    expect(plain).toContain('“I struggle when offline”')
  })

  it('uses one quote pair per excerpt; linebreaks stay inside', () => {
    const multi: Note[] = [
      {
        id: 'insight-a1b-3',
        type: 'insight',
        note: 'Passage',
        quotes: ['line one\nline two', 'elsewhere'],
      },
    ]
    const hl: Highlight[] = [{ start: 0, end: 1, text: 'x', noteIds: ['insight-a1b-3'] }]
    const plain = formatNotesPlain(multi, hl)
    expect(plain).toContain('“line one\n  line two”')
    expect(plain).toContain('“elsewhere”')
    expect(plain.match(/“/g)?.length).toBe(2)

    const html = formatNotesHtml(multi, hl)
    expect(html).toContain('“line one<br>line two”')
    expect(html.match(/“/g)?.length).toBe(2)
  })

  it('emits html headings for word paste', () => {
    const html = formatNotesHtml(notes, highlights)
    expect(html).toContain('<h1>Notes</h1>')
    expect(html).toContain('<h2>insight</h2>')
    expect(html).toContain('<h2>question</h2>')
    expect(html.indexOf('insight')).toBeLessThan(html.indexOf('question'))
  })
})
