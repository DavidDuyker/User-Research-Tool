import { useEffect, useRef } from 'react'
import type { Highlight, Note, NoteType } from '../types'
import { NOTE_TYPE_LABELS } from '../types'
import { noteHasSupportingQuote } from '../lib/documentHelpers'

interface NotePopoverProps {
  note: Note
  highlights: Highlight[]
  anchorRect: DOMRect
  containerRect: DOMRect
  onChange: (patch: Partial<Pick<Note, 'note' | 'type'>>) => void
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function NotePopover({
  note,
  highlights,
  anchorRect,
  containerRect,
  onChange,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: NotePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hasQuote = noteHasSupportingQuote(note.id, highlights)

  const top = anchorRect.top - containerRect.top
  const left = Math.min(
    anchorRect.right - containerRect.left + 8,
    containerRect.width - 280,
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="note-popover"
      style={{ top, left: Math.max(0, left) }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <select
        className={`type-pill type-pill-${note.type} type-select`}
        value={note.type}
        onChange={(e) => onChange({ type: e.target.value as NoteType })}
        aria-label="Note type"
      >
        {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
          <option key={t} value={t}>
            {NOTE_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <textarea
        className="note-popover-text"
        value={note.note}
        placeholder="Write a note…"
        rows={3}
        onChange={(e) => onChange({ note: e.target.value })}
      />
      <div className="note-popover-quotes">
        {hasQuote && note.quotes.length > 0 ? (
          note.quotes.map((q, i) => (
            <blockquote key={i} className="note-quote">
              “{q}”
            </blockquote>
          ))
        ) : (
          <p className="note-orphan">no supporting quote</p>
        )}
      </div>
    </div>
  )
}
