import type { NoteType } from '../types'
import { NOTE_TYPES } from '../types'

const DOC_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TYPE_ALT = NOTE_TYPES.join('|')

/** 3-character alphanumeric document prefix. */
export function createDocId(): string {
  let id = ''
  for (let i = 0; i < 3; i++) {
    id += DOC_ID_CHARS[Math.floor(Math.random() * DOC_ID_CHARS.length)]!
  }
  return id
}

/**
 * Full note ref: `{type}-{docId}-{1..4 digit number}`
 * e.g. insight-x7k-8392
 */
export function formatNoteId(type: NoteType, docId: string, numericId: number): string {
  if (numericId < 1 || numericId > 9999) {
    throw new Error(`Note numeric id must be 1–9999, got ${numericId}`)
  }
  return `${type}-${docId}-${numericId}`
}

export function parseNoteId(
  fullId: string,
): { type: NoteType; docId: string; numericId: number } | null {
  const modern = new RegExp(`^(${TYPE_ALT})-([a-z0-9]{3})-(\\d{1,4})$`, 'i').exec(fullId.trim())
  if (modern) {
    return {
      type: modern[1]!.toLowerCase() as NoteType,
      docId: modern[2]!.toLowerCase(),
      numericId: Number(modern[3]),
    }
  }
  // Legacy: docId-numeric only (type lived in a separate field)
  const legacy = /^([a-z0-9]{3})-(\d{1,4})$/i.exec(fullId.trim())
  if (legacy) {
    return {
      type: 'insight',
      docId: legacy[1]!.toLowerCase(),
      numericId: Number(legacy[2]),
    }
  }
  return null
}

export function isValidNoteId(id: string): boolean {
  return parseNoteId(id) !== null
}

/** Next free numeric id under docId (max 9999), across all types. */
export function allocateNoteNumericId(docId: string, existingNoteIds: string[]): number {
  const used = new Set<number>()
  for (const id of existingNoteIds) {
    const parsed = parseNoteId(id)
    if (parsed && parsed.docId === docId) used.add(parsed.numericId)
  }
  for (let n = 1; n <= 9999; n++) {
    if (!used.has(n)) return n
  }
  throw new Error('No free note ids remaining for this document')
}

export function allocateNoteId(
  type: NoteType,
  docId: string,
  existingNoteIds: string[],
): string {
  return formatNoteId(type, docId, allocateNoteNumericId(docId, existingNoteIds))
}

/** Change type prefix; keeps docId + number. Updates to modern form. */
export function retargetNoteId(fullId: string, newType: NoteType): string {
  const parsed = parseNoteId(fullId)
  if (!parsed) return formatNoteId(newType, 'xxx', 1)
  return formatNoteId(newType, parsed.docId, parsed.numericId)
}
