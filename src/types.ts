export type NoteType = 'insight' | 'painpoint' | 'opportunity' | 'question'

export interface Property {
  id: string
  key: string
  value: string
}

export interface Note {
  id: string
  type: NoteType
  note: string
  quotes: string[]
}

/** Span in the plain (marker-free) body text. */
export interface Highlight {
  start: number
  end: number
  text: string
  noteIds: string[]
}

export interface Document {
  docId: string
  title: string
  filename: string
  properties: Property[]
  body: string
  highlights: Highlight[]
  notes: Note[]
  markdown: string
  updatedAt: string
}

export interface BodySelection {
  start: number
  end: number
  text: string
}

export const NOTE_TYPES: NoteType[] = ['insight', 'painpoint', 'opportunity', 'question']

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  insight: 'insight',
  painpoint: 'painpoint',
  opportunity: 'opportunity',
  question: 'question',
}
