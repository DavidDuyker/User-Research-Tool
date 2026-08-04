import { useEffect, useState } from 'react'
import type { Note, NoteType } from '../types'
import { NOTE_TYPES, NOTE_TYPE_LABELS } from '../types'
import { noteHasSupportingQuote } from '../lib/documentHelpers'
import { copyNotesForFigJam, copyNotesForWord } from '../lib/formatNotesClipboard'
import type { Highlight } from '../types'

interface NotesPanelProps {
  notes: Note[]
  highlights: Highlight[]
  onChangeNote: (id: string, patch: Partial<Pick<Note, 'note' | 'type'>>) => void
  onDeleteNote: (id: string) => void
  onClose: () => void
}

const TYPE_ORDER: NoteType[] = [...NOTE_TYPES] // insight → … → question

type CopiedKind = 'word' | 'table'

export function NotesPanel({
  notes,
  highlights,
  onChangeNote,
  onDeleteNote,
  onClose,
}: NotesPanelProps) {
  const [copied, setCopied] = useState<CopiedKind | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: notes.filter((n) => n.type === type),
  })).filter((g) => g.items.length > 0)

  const onCopy = async () => {
    if (notes.length === 0) return
    try {
      await copyNotesForWord(notes, highlights)
      setCopied('word')
    } catch (err) {
      console.error(err)
    }
  }

  const onCopyTable = async () => {
    if (notes.length === 0) return
    try {
      await copyNotesForFigJam(notes, highlights)
      setCopied('table')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="notes-panel" role="dialog" aria-label="Notes">
      <div className="notes-panel-header">
        <h2 className="notes-panel-title">Notes</h2>
        <div className="notes-panel-actions">
          {notes.length > 0 && (
            <>
              <button
                type="button"
                className="btn-ghost notes-panel-copy"
                onClick={() => void onCopy()}
                aria-label={copied === 'word' ? 'Copied' : 'Copy notes for Word'}
                title={copied === 'word' ? 'Copied' : 'Copy for Word'}
              >
                {copied === 'word' ? (
                  <span className="notes-copy-label">Copied</span>
                ) : (
                  <CopyIcon />
                )}
              </button>
              <button
                type="button"
                className="btn-ghost notes-panel-copy"
                onClick={() => void onCopyTable()}
                aria-label={copied === 'table' ? 'Copied' : 'Copy notes table for FigJam'}
                title={copied === 'table' ? 'Copied' : 'Copy table for FigJam'}
              >
                {copied === 'table' ? (
                  <span className="notes-copy-label">Copied</span>
                ) : (
                  <TableIcon />
                )}
              </button>
            </>
          )}
          <button type="button" className="btn-ghost notes-panel-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="notes-panel-empty">No notes yet. Select text in the transcript to add one.</p>
      ) : (
        <div className="notes-panel-body">
          {grouped.map(({ type, items }) => (
            <section key={type} className="notes-panel-group">
              <h3 className="notes-panel-group-label">
                <span className={`type-pill type-pill-${type}`}>{NOTE_TYPE_LABELS[type]}</span>
                <span className="notes-panel-count">{items.length}</span>
              </h3>
              <ul className="notes-panel-list">
                {items.map((note) => {
                  const hasQuote = noteHasSupportingQuote(note.id, highlights)
                  return (
                    <li key={note.id} className="notes-panel-item">
                      <div className="notes-panel-item-head">
                        <button
                          type="button"
                          className="btn-ghost note-delete"
                          onClick={() => onDeleteNote(note.id)}
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
                        rows={2}
                        onChange={(e) => onChangeNote(note.id, { note: e.target.value })}
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
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg
      className="notes-copy-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TableIcon() {
  return (
    <svg
      className="notes-copy-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h11M2.5 10.5h11M6.5 2.5v11" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
