import { useEffect, useRef } from 'react'
import type { BodySelection, NoteType } from '../types'
import { NOTE_TYPES, NOTE_TYPE_LABELS } from '../types'

interface CaptureUIProps {
  selection: BodySelection
  /** Position relative to page container */
  gutterTop: number
  entryPos: { top: number; left: number }
  phase: 'plus' | 'picking' | 'drafting'
  draftType: NoteType | null
  draftNote: string
  onPhase: (phase: 'plus' | 'picking' | 'drafting') => void
  onPickType: (type: NoteType) => void
  onDraftNote: (text: string) => void
  onCommit: () => void
  onCancel: () => void
}

export function CaptureUI({
  selection,
  gutterTop,
  entryPos,
  phase,
  draftType,
  draftNote,
  onPhase,
  onPickType,
  onDraftNote,
  onCommit,
  onCancel,
}: CaptureUIProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (phase === 'drafting') inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && phase === 'drafting') {
        e.preventDefault()
        onCommit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, onCommit, phase])

  return (
    <>
      <div
        className={`capture-gutter${phase !== 'plus' ? ' capture-gutter-open' : ''}`}
        style={{ top: gutterTop }}
        onMouseEnter={() => {
          if (phase === 'plus') onPhase('picking')
        }}
        onMouseLeave={() => {
          if (phase === 'picking') onPhase('plus')
        }}
      >
        {phase === 'plus' || phase === 'picking' ? (
          <div className="capture-plus-wrap">
            {phase === 'plus' ? (
              <button type="button" className="capture-plus" aria-label="Add insight">
                + add insight
              </button>
            ) : (
              <div className="capture-types">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`capture-type capture-type-${t}`}
                    onClick={() => onPickType(t)}
                  >
                    {NOTE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {phase === 'drafting' && draftType ? (
        <div
          className="capture-entry"
          style={{ top: entryPos.top, left: entryPos.left }}
        >
          <span className={`type-pill type-pill-${draftType}`}>
            {NOTE_TYPE_LABELS[draftType]}
          </span>
          <textarea
            ref={inputRef}
            className="capture-entry-text"
            placeholder="Write a note…"
            rows={3}
            value={draftNote}
            onChange={(e) => onDraftNote(e.target.value)}
          />
          <div className="capture-entry-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onCommit}>
              Save
            </button>
          </div>
          <p className="capture-entry-quote">“{selection.text}”</p>
        </div>
      ) : null}
    </>
  )
}
