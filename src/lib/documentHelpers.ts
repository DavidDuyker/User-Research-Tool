import type { Highlight, Note, NoteType } from '../types'
import { retargetNoteId } from './ids'

export function noteById(notes: Note[], id: string): Note | undefined {
  return notes.find((n) => n.id === id)
}

/** Primary type for coloring a highlight (first note id). */
export function highlightPrimaryType(
  highlight: Highlight,
  notes: Note[],
): NoteType | 'multi' | null {
  if (highlight.noteIds.length === 0) return null
  const types = highlight.noteIds
    .map((id) => noteById(notes, id)?.type)
    .filter((t): t is NoteType => Boolean(t))
  if (types.length === 0) return null
  if (types.length > 1 && new Set(types).size > 1) return 'multi'
  return types[0]!
}

export function noteHasSupportingQuote(noteId: string, highlights: Highlight[]): boolean {
  return highlights.some((h) => h.noteIds.includes(noteId))
}

/** Remove a note and detach/drop its highlights. */
export function removeNoteFromDocument(
  notes: Note[],
  highlights: Highlight[],
  noteId: string,
): { notes: Note[]; highlights: Highlight[] } {
  return {
    notes: notes.filter((n) => n.id !== noteId),
    highlights: highlights
      .map((h) => ({
        ...h,
        noteIds: h.noteIds.filter((id) => id !== noteId),
      }))
      .filter((h) => h.noteIds.length > 0),
  }
}

/** Change a note's type and rewrite its id + highlight refs. */
export function retargetNoteType(
  notes: Note[],
  highlights: Highlight[],
  noteId: string,
  newType: NoteType,
): { notes: Note[]; highlights: Highlight[]; newId: string } {
  const note = notes.find((n) => n.id === noteId)
  if (!note) {
    return { notes, highlights, newId: noteId }
  }
  if (note.type === newType && note.id.startsWith(`${newType}-`)) {
    return { notes, highlights, newId: noteId }
  }
  const newId = retargetNoteId(noteId, newType)
  return {
    newId,
    notes: notes.map((n) =>
      n.id === noteId ? { ...n, id: newId, type: newType } : n,
    ),
    highlights: highlights.map((h) => ({
      ...h,
      noteIds: h.noteIds.map((id) => (id === noteId ? newId : id)),
    })),
  }
}

export function segmentsForBody(
  body: string,
  highlights: Highlight[],
): Array<{ text: string; highlight: Highlight | null }> {
  if (highlights.length === 0) return [{ text: body, highlight: null }]

  const sorted = [...highlights].sort((a, b) => a.start - b.start || b.end - a.end)
  const accepted: Highlight[] = []
  let lastEnd = -1
  for (const h of sorted) {
    if (h.start < lastEnd) continue
    if (h.start < 0 || h.end > body.length || h.start >= h.end) continue
    accepted.push(h)
    lastEnd = h.end
  }

  const segments: Array<{ text: string; highlight: Highlight | null }> = []
  let cursor = 0
  for (const h of accepted) {
    if (h.start > cursor) {
      segments.push({ text: body.slice(cursor, h.start), highlight: null })
    }
    segments.push({ text: body.slice(h.start, h.end), highlight: h })
    cursor = h.end
  }
  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor), highlight: null })
  }
  return segments
}
