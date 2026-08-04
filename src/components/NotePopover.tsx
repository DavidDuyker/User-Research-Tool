import { useEffect, useRef } from 'react'
import type { Highlight, Note, NoteType } from '../types'
import { NOTE_TYPE_LABELS } from '../types'
import { noteHasSupportingQuote } from '../lib/documentHelpers'

interface NotePopoverProps {
  note: Note
  highlights: Highlight[]
  anchorRect: DOMRect
  containerRect: DOMRect
  popoverRef?: React.RefObject<HTMLDivElement | null>
  onChange: (patch: Partial<Pick<Note, 'note' | 'type'>>) => void
  onDelete: () => void
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function NotePopover({
  note,
  highlights,
  anchorRect,
  containerRect,
  popoverRef,
  onChange,
  onDelete,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: NotePopoverProps) {
  const localRef = useRef<HTMLDivElement>(null)
  const hasQuote = noteHasSupportingQuote(note.id, highlights)

  const setRefs = (el: HTMLDivElement | null) => {
    localRef.current = el
    if (popoverRef) popoverRef.current = el
  }

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
      ref={setRefs}
      className="note-popover"
      style={{ top, left: Math.max(0, left) }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="note-popover-head">
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
        <button
          type="button"
          className="btn-ghost note-delete"
          onClick={onDelete}
          aria-label="Delete note"
          title="Delete note"
        >
          Delete
        </button>
      </div>
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
