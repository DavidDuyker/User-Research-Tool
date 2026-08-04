import { useEffect, useRef } from 'react'
import type { BodySelection, NoteType } from '../types'
import { NOTE_TYPES, NOTE_TYPE_LABELS } from '../types'

interface CaptureUIProps {
  selection: BodySelection
  /** Toolbar anchor relative to transcript wrap (top edge above selection, horizontal center) */
  toolbarPos: { top: number; centerX: number }
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
  toolbarPos,
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
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase === 'drafting') inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'picking') {
          onPhase('plus')
          return
        }
        onCancel()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && phase === 'drafting') {
        e.preventDefault()
        onCommit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, onCommit, onPhase, phase])

  useEffect(() => {
    if (phase !== 'picking') return
    const onDown = (e: MouseEvent) => {
      if (toolbarRef.current?.contains(e.target as Node)) return
      onPhase('plus')
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [phase, onPhase])

  return (
    <>
      {(phase === 'plus' || phase === 'picking') && (
        <div
          ref={toolbarRef}
          className="capture-toolbar"
          style={{
            top: toolbarPos.top,
            left: toolbarPos.centerX,
          }}
        >
          <button
            type="button"
            className={`capture-add-btn${phase === 'picking' ? ' capture-add-btn-open' : ''}`}
            aria-label="Add note"
            aria-expanded={phase === 'picking'}
            onClick={() => onPhase(phase === 'picking' ? 'plus' : 'picking')}
          >
            + add note
          </button>

          {phase === 'picking' && (
            <div className="capture-types" role="menu">
              {NOTE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  className={`capture-type capture-type-${t}`}
                  onClick={() => onPickType(t)}
                >
                  {NOTE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
