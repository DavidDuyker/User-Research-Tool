import type { Highlight, Note, NoteType } from '../types'
import { NOTE_TYPES, NOTE_TYPE_LABELS } from '../types'
import { noteHasSupportingQuote } from './documentHelpers'

const TYPE_ORDER: NoteType[] = [...NOTE_TYPES]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function groupNotes(notes: Note[]): Array<{ type: NoteType; items: Note[] }> {
  return TYPE_ORDER.map((type) => ({
    type,
    items: notes.filter((n) => n.type === type),
  })).filter((g) => g.items.length > 0)
}

/** Plain text suitable for any paste target. */
export function formatNotesPlain(notes: Note[], highlights: Highlight[]): string {
  const grouped = groupNotes(notes)
  if (grouped.length === 0) return ''

  const parts: string[] = ['Notes', '']
  for (const { type, items } of grouped) {
    parts.push(NOTE_TYPE_LABELS[type].toUpperCase())
    parts.push('')
    for (const note of items) {
      parts.push(note.note.trim() || '(no note text)')
      const hasQuote = noteHasSupportingQuote(note.id, highlights)
      if (hasQuote && note.quotes.length > 0) {
        for (const q of note.quotes) {
          // One pair of quotes per distinct excerpt; keep internal line breaks
          const indented = q.replace(/\r\n/g, '\n').split('\n').join('\n  ')
          parts.push(`  “${indented}”`)
        }
      } else {
        parts.push('  (no supporting quote)')
      }
      parts.push('')
    }
  }
  return parts.join('\n').trimEnd() + '\n'
}

/**
 * HTML clipboard payload — Word/Google Docs pick up headings, lists, and italics.
 */
export function formatNotesHtml(notes: Note[], highlights: Highlight[]): string {
  const grouped = groupNotes(notes)
  if (grouped.length === 0) return ''

  const sections: string[] = ['<h1>Notes</h1>']
  for (const { type, items } of grouped) {
    sections.push(`<h2>${escapeHtml(NOTE_TYPE_LABELS[type])}</h2>`)
    sections.push('<ul>')
    for (const note of items) {
      const body = escapeHtml(note.note.trim() || '(no note text)')
      const hasQuote = noteHasSupportingQuote(note.id, highlights)
      let quotesHtml = ''
      if (hasQuote && note.quotes.length > 0) {
        quotesHtml = note.quotes
          .map((q) => {
            const withBreaks = escapeHtml(q).replace(/\r\n/g, '\n').replace(/\n/g, '<br>')
            return `<p style="margin:4pt 0 4pt 18pt;color:#555;font-style:italic;">“${withBreaks}”</p>`
          })
          .join('')
      } else {
        quotesHtml =
          '<p style="margin:4pt 0 4pt 18pt;color:#999;font-style:italic;">(no supporting quote)</p>'
      }
      sections.push(`<li style="margin-bottom:10pt;"><p style="margin:0 0 4pt 0;">${body}</p>${quotesHtml}</li>`)
    }
    sections.push('</ul>')
  }

  return `<!DOCTYPE html><html><body>${sections.join('')}</body></html>`
}

export async function copyNotesForWord(notes: Note[], highlights: Highlight[]): Promise<void> {
  const plain = formatNotesPlain(notes, highlights)
  const html = formatNotesHtml(notes, highlights)
  if (!plain) return

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/plain': new Blob([plain], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    })
    await navigator.clipboard.write([item])
    return
  }

  await navigator.clipboard.writeText(plain)
}
