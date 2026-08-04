import type { Document, Highlight, Note, Property } from '../types'

function serializeProperties(title: string, properties: Property[]): string {
  const lines: string[] = [`title: ${title || 'Untitled'}`]
  for (const p of properties) {
    if (!p.key.trim() && !p.value.trim()) continue
    lines.push(`${p.key.trim() || 'property'}: ${p.value}`)
  }
  return lines.join('\n')
}

function serializeBody(body: string, highlights: Highlight[]): string {
  if (highlights.length === 0) return body

  // Sort by start; on overlap, first wins (skip later overlapping)
  const sorted = [...highlights].sort((a, b) => a.start - b.start || b.end - a.end)
  const accepted: Highlight[] = []
  let lastEnd = -1
  for (const h of sorted) {
    if (h.start < lastEnd) continue
    if (h.start < 0 || h.end > body.length || h.start >= h.end) continue
    accepted.push(h)
    lastEnd = h.end
  }

  let out = ''
  let cursor = 0
  for (const h of accepted) {
    out += body.slice(cursor, h.start)
    const slice = body.slice(h.start, h.end)
    const refs = h.noteIds.map((id) => `^${id}`).join(' ')
    out += `==${slice}==${refs ? ` ${refs}` : ''}`
    cursor = h.end
  }
  out += body.slice(cursor)
  return out
}

function serializeNotes(notes: Note[]): string {
  if (notes.length === 0) return '## Notes\n'
  const parts = ['## Notes', '']
  for (const note of notes) {
    parts.push(`### ${note.id}`)
    parts.push(`type: ${note.type}`)
    parts.push(`note: ${note.note}`)
    parts.push('quote:')
    if (note.quotes.length === 0) {
      // orphan / empty
    } else {
      for (const q of note.quotes) {
        parts.push(`"${q.replace(/"/g, '\\"')}"`)
      }
    }
    parts.push('')
  }
  return parts.join('\n').trimEnd() + '\n'
}

export function serializeDocument(doc: Pick<Document, 'title' | 'properties' | 'body' | 'highlights' | 'notes'>): string {
  const header = serializeProperties(doc.title, doc.properties)
  const body = serializeBody(doc.body, doc.highlights)
  const notes = serializeNotes(doc.notes)
  // Notes above transcript so MD editors surface synthesis first
  return `${header}\n---\n${notes}---\n${body}\n`
}

export function withLiveMarkdown<T extends Pick<Document, 'title' | 'properties' | 'body' | 'highlights' | 'notes'>>(
  doc: T,
): T & { markdown: string; updatedAt: string } {
  return {
    ...doc,
    markdown: serializeDocument(doc),
    updatedAt: new Date().toISOString(),
  }
}

export function downloadMarkdown(content: string, filename = 'Untitled.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function writeMarkdownFile(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** Sanitize a filename for disk (keeps .md). */
export function sanitizeFilename(name: string): string {
  const withExt = filenameFromTitle(name)
  const stem = withExt.replace(/\.md$/i, '')
  const safe = stem
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120)
  return `${safe || 'Untitled'}.md`
}

/**
 * Rename a linked file to match the document title.
 * Returns the new on-disk name, or null if rename is unsupported / failed.
 */
export async function renameMarkdownFile(
  handle: FileSystemFileHandle,
  desiredName: string,
): Promise<string | null> {
  const next = sanitizeFilename(desiredName)
  if (handle.name === next) return handle.name
  if (typeof handle.move !== 'function') return null
  try {
    await handle.move(next)
    return handle.name || next
  } catch {
    return null
  }
}

export function filenameFromTitle(title: string): string {
  const stem = (title || 'Untitled').trim() || 'Untitled'
  return stem.toLowerCase().endsWith('.md') ? stem : `${stem}.md`
}
