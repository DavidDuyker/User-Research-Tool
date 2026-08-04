import type { Highlight, Note, NoteType } from '../types'
import { highlightPrimaryType, segmentsForBody } from '../lib/documentHelpers'

interface TranscriptBodyProps {
  body: string
  highlights: Highlight[]
  notes: Note[]
  bodyRef: React.RefObject<HTMLDivElement | null>
  pending?: { start: number; end: number; type: NoteType | null } | null
  onMarkEnter: (noteId: string, markEl: HTMLElement) => void
  onMouseUp: () => void
}

export function TranscriptBody({
  body,
  highlights,
  notes,
  bodyRef,
  pending,
  onMarkEnter,
  onMouseUp,
}: TranscriptBodyProps) {
  const displayHighlights = pending
    ? mergePending(highlights, pending)
    : highlights

  const segments = segmentsForBody(body, displayHighlights)

  return (
    <div
      className="transcript-body"
      data-body
      ref={bodyRef}
      onMouseUp={onMouseUp}
    >
      {segments.map((seg, i) => {
        if (!seg.highlight) {
          return <span key={i}>{seg.text}</span>
        }
        const h = seg.highlight
        const isPending = h.noteIds.includes('__pending__')
        const type = isPending
          ? (pending?.type ?? null)
          : highlightPrimaryType(h, notes)
        const primaryId = h.noteIds.find((id) => id !== '__pending__') ?? h.noteIds[0]

        return (
          <mark
            key={i}
            className={`hl hl-${type ?? 'insight'}${isPending ? ' hl-pending' : ''}`}
            data-note-ids={h.noteIds.join(' ')}
            onMouseEnter={(e) => {
              if (primaryId && primaryId !== '__pending__') {
                onMarkEnter(primaryId, e.currentTarget)
              }
            }}
          >
            {seg.text}
          </mark>
        )
      })}
    </div>
  )
}

function mergePending(
  highlights: Highlight[],
  pending: { start: number; end: number; type: NoteType | null },
): Highlight[] {
  const pendingHl: Highlight = {
    start: pending.start,
    end: pending.end,
    text: '',
    noteIds: ['__pending__'],
  }
  return [...highlights, pendingHl]
}
