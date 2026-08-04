import { createDocId } from './ids'
import { serializeDocument } from './serializeDocument'
import type { Document } from '../types'

const STORAGE_KEY = 'transcript-synthesis-draft-v5'

export function createEmptyDocument(): Document {
  const docId = createDocId()
  const empty = {
    docId,
    title: '',
    filename: 'Untitled.md',
    properties: [],
    body: '',
    highlights: [],
    notes: [],
  }
  return {
    ...empty,
    markdown: serializeDocument(empty),
    updatedAt: new Date().toISOString(),
  }
}

export function loadDraft(): Document | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Document
    if (!parsed || typeof parsed.body !== 'string' || !Array.isArray(parsed.notes)) {
      return null
    }
    return {
      docId: parsed.docId || createDocId(),
      title: parsed.title ?? '',
      filename: parsed.filename ?? 'Untitled.md',
      properties: Array.isArray(parsed.properties) ? parsed.properties : [],
      body: parsed.body,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      notes: parsed.notes,
      markdown: parsed.markdown ?? serializeDocument(parsed),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveDraft(doc: Document): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...doc,
      updatedAt: new Date().toISOString(),
    }),
  )
}

export function clearDraft(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('transcript-synthesis-draft-v4')
  localStorage.removeItem('transcript-synthesis-draft-v3')
}
