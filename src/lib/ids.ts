const DOC_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 3-character alphanumeric document prefix. */
export function createDocId(): string {
  let id = ''
  for (let i = 0; i < 3; i++) {
    id += DOC_ID_CHARS[Math.floor(Math.random() * DOC_ID_CHARS.length)]!
  }
  return id
}

/** Full note id: `{docId}-{1..4 digit number}`. */
export function formatNoteId(docId: string, numericId: number): string {
  if (numericId < 1 || numericId > 9999) {
    throw new Error(`Note numeric id must be 1–9999, got ${numericId}`)
  }
  return `${docId}-${numericId}`
}

export function parseNoteId(fullId: string): { docId: string; numericId: number } | null {
  const match = /^([a-z0-9]{3})-(\d{1,4})$/i.exec(fullId.trim())
  if (!match) return null
  return { docId: match[1]!.toLowerCase(), numericId: Number(match[2]) }
}

export function isValidNoteId(id: string): boolean {
  return parseNoteId(id) !== null
}

/** Next free numeric id under docId (max 9999). */
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

export function allocateNoteId(docId: string, existingNoteIds: string[]): string {
  return formatNoteId(docId, allocateNoteNumericId(docId, existingNoteIds))
}
