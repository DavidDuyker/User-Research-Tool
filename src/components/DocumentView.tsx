import { useCallback, useEffect, useRef, useState } from 'react'
import { allocateNoteId } from '../lib/ids'
import { noteById, removeNoteFromDocument, retargetNoteType } from '../lib/documentHelpers'
import { ingestMarkdown } from '../lib/parseDocument'
import { captureBodySelection, selectionRectsRelativeTo } from '../lib/selection'
import {
  renameMarkdownFile,
  sanitizeFilename,
  withLiveMarkdown,
  writeMarkdownFile,
} from '../lib/serializeDocument'
import type { BodySelection, Document, NoteType, Property } from '../types'
import { CaptureUI } from './CaptureUI'
import { NotePopover } from './NotePopover'
import { NotesPanel } from './NotesPanel'
import { TranscriptBody } from './TranscriptBody'

interface DocumentViewProps {
  document: Document
  onChange: (doc: Document) => void
  onReset: () => void
}

type CapturePhase = 'plus' | 'picking' | 'drafting'

export function DocumentView({ document: doc, onChange, onReset }: DocumentViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const linkPromptedRef = useRef(false)
  const renameTimerRef = useRef<number | null>(null)
  const docSnapshotRef = useRef(doc)
  docSnapshotRef.current = doc

  const [fileLinked, setFileLinked] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [pending, setPending] = useState<BodySelection | null>(null)
  const [phase, setPhase] = useState<CapturePhase>('plus')
  const [draftType, setDraftType] = useState<NoteType | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [toolbarPos, setToolbarPos] = useState({ top: 0, centerX: 0 })
  const [entryPos, setEntryPos] = useState({ top: 0, left: 0 })

  const [hoverNoteId, setHoverNoteId] = useState<string | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null)
  const [panelHoverNoteId, setPanelHoverNoteId] = useState<string | null>(null)
  const hoverTimer = useRef<number | null>(null)
  const hoverMarkRef = useRef<HTMLElement | null>(null)
  const popoverElRef = useRef<HTMLDivElement | null>(null)
  const popoverPinned = useRef(false)

  const isEmpty = !doc.body.trim()

  const commit = useCallback(
    (next: Document) => {
      onChange(withLiveMarkdown(next))
    },
    [onChange],
  )

  /** Prompt once to link a .md file; thereafter writes are automatic. */
  const ensureLinked = useCallback(async (snapshot: Document) => {
    if (fileHandleRef.current) return
    const savePicker = window.showSaveFilePicker
    if (!savePicker) return
    if (linkPromptedRef.current) return
    linkPromptedRef.current = true
    try {
      const handle = await savePicker({
        suggestedName: sanitizeFilename(snapshot.title || snapshot.filename),
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
      })
      fileHandleRef.current = handle
      setFileLinked(true)
      await writeMarkdownFile(handle, snapshot.markdown)
      const name = handle.name
      onChange(
        withLiveMarkdown({
          ...snapshot,
          filename: name,
          title: snapshot.title || name.replace(/\.md$/i, ''),
        }),
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err)
      // Cancelled: stay memory + localStorage only
    }
  }, [onChange])

  // Live file write when linked
  useEffect(() => {
    const handle = fileHandleRef.current
    if (!handle || !doc.markdown) return
    void writeMarkdownFile(handle, doc.markdown).catch(() => {
      /* ignore permission errors mid-session */
    })
  }, [doc.markdown])

  const clearCapture = useCallback(() => {
    setPending(null)
    setPhase('plus')
    setDraftType(null)
    setDraftNote('')
    window.getSelection()?.removeAllRanges()
  }, [])

  const updateSelectionChrome = useCallback(() => {
    const root = bodyRef.current
    const wrap = wrapRef.current
    if (!root || !wrap) return
    const sel = captureBodySelection(root)
    if (!sel) {
      if (phase === 'drafting') return
      setPending(null)
      return
    }
    setPending(sel)
    setPhase('plus')
    setDraftType(null)
    setDraftNote('')
    const rects = selectionRectsRelativeTo(wrap)
    if (rects) {
      // Toolbar sits just above the selection, centered on it
      const toolbarGap = 8
      const estimatedToolbarH = 40
      setToolbarPos({
        top: Math.max(0, rects.top - estimatedToolbarH - toolbarGap),
        centerX: Math.min(Math.max(rects.centerX, 60), wrap.clientWidth - 60),
      })
      setEntryPos({
        top: rects.bottom + 8,
        left: Math.min(Math.max(rects.left, 0), wrap.clientWidth - 280),
      })
    }
  }, [phase])

  const ingestText = (text: string) => {
    commit(ingestMarkdown(text))
  }

  const onPasteEmpty = (e: React.ClipboardEvent) => {
    if (!isEmpty) return
    const text = e.clipboardData.getData('text/plain')
    if (!text.trim()) return
    e.preventDefault()
    ingestText(text)
  }

  const loadSample = async () => {
    const mod = await import('../../case-management-task-system-product-testing.md?raw')
    ingestText(mod.default)
  }

  const loadFromFile = async (file: File, handle?: FileSystemFileHandle) => {
    const text = await file.text()
    if (handle) {
      fileHandleRef.current = handle
      setFileLinked(true)
      linkPromptedRef.current = true
    } else {
      // Standard file input cannot live-write back to disk
      fileHandleRef.current = null
      setFileLinked(false)
    }
    commit(ingestMarkdown(text, { filename: file.name }))
  }

  const openFile = async () => {
    const openPicker = window.showOpenFilePicker
    if (openPicker) {
      try {
        const [handle] = await openPicker({
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
          multiple: false,
        })
        if (!handle) return
        const file = await handle.getFile()
        await loadFromFile(file, handle)
        return
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error(err)
        // Fall through to file input
      }
    }
    fileInputRef.current?.click()
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void loadFromFile(file)
  }

  const handleReset = () => {
    fileHandleRef.current = null
    setFileLinked(false)
    linkPromptedRef.current = false
    if (renameTimerRef.current) window.clearTimeout(renameTimerRef.current)
    clearCapture()
    onReset()
  }

  /** Debounced rename of the linked disk file to match title. */
  const scheduleRename = useCallback(
    (title: string) => {
      if (!fileHandleRef.current) return
      if (renameTimerRef.current) window.clearTimeout(renameTimerRef.current)
      renameTimerRef.current = window.setTimeout(() => {
        const handle = fileHandleRef.current
        if (!handle) return
        const desired = sanitizeFilename(title)
        void renameMarkdownFile(handle, desired).then((actual) => {
          if (!actual) return
          const current = docSnapshotRef.current
          if (current.filename === actual) return
          onChange(
            withLiveMarkdown({
              ...current,
              filename: actual,
            }),
          )
        })
      }, 450)
    },
    [onChange],
  )

  const setTitle = (title: string) => {
    const next = withLiveMarkdown({
      ...doc,
      title,
      filename: sanitizeFilename(title),
    })
    commit(next)
    void ensureLinked(next)
    scheduleRename(title)
  }

  const updateProperty = (id: string, patch: Partial<Property>) => {
    const next = withLiveMarkdown({
      ...doc,
      properties: doc.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
    commit(next)
    void ensureLinked(next)
  }

  const addProperty = () => {
    const next = withLiveMarkdown({
      ...doc,
      properties: [...doc.properties, { id: crypto.randomUUID(), key: '', value: '' }],
    })
    commit(next)
    void ensureLinked(next)
  }

  const removeProperty = (id: string) => {
    commit({
      ...doc,
      properties: doc.properties.filter((p) => p.id !== id),
    })
  }

  const onPickType = (type: NoteType) => {
    setDraftType(type)
    setPhase('drafting')
    const wrap = wrapRef.current
    if (wrap && pending) {
      const rects = selectionRectsRelativeTo(wrap)
      if (rects) {
        setEntryPos({
          top: rects.bottom + 8,
          left: Math.min(Math.max(rects.left, 0), wrap.clientWidth - 280),
        })
      }
    }
  }

  const onCommitCapture = () => {
    if (!pending || !draftType) return
    const noteId = allocateNoteId(
      draftType,
      doc.docId,
      doc.notes.map((n) => n.id),
    )
    const quoteText = pending.text.trim()
    const next = withLiveMarkdown({
      ...doc,
      notes: [
        ...doc.notes,
        {
          id: noteId,
          type: draftType,
          note: draftNote.trim(),
          quotes: quoteText ? [quoteText] : [],
        },
      ],
      highlights: [
        ...doc.highlights,
        {
          start: pending.start,
          end: pending.end,
          text: quoteText,
          noteIds: [noteId],
        },
      ],
    })
    commit(next)
    clearCapture()
    void ensureLinked(next)
  }

  const onMarkEnter = (noteId: string, markEl: HTMLElement) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverMarkRef.current = markEl
    setHoverNoteId(noteId)
    setHoverAnchor(markEl.getBoundingClientRect())
  }

  const onJumpToNote = useCallback((noteId: string) => {
    const root = bodyRef.current
    if (!root) return
    const mark = root.querySelector(
      `mark[data-note-ids~="${CSS.escape(noteId)}"]`,
    ) as HTMLElement | null
    if (!mark) return
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const scheduleHoverClose = useCallback(() => {
    if (popoverPinned.current) return
    hoverTimer.current = window.setTimeout(() => {
      if (!popoverPinned.current) {
        hoverMarkRef.current = null
        setHoverNoteId(null)
        setHoverAnchor(null)
      }
    }, 120)
  }, [])

  const pointInRect = (x: number, y: number, rect: DOMRectReadOnly) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

  // Keep popover open while pointer is in the highlight's full bounding box
  // (including gaps between wrapped lines) or over the popover itself.
  useEffect(() => {
    if (!hoverNoteId) return

    const onMove = (e: MouseEvent) => {
      if (popoverPinned.current) {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
        return
      }

      const mark = hoverMarkRef.current
      const inMark = mark ? pointInRect(e.clientX, e.clientY, mark.getBoundingClientRect()) : false
      const pop = popoverElRef.current
      const inPop = pop ? pointInRect(e.clientX, e.clientY, pop.getBoundingClientRect()) : false

      if (inMark || inPop) {
        if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
        if (mark) setHoverAnchor(mark.getBoundingClientRect())
        return
      }

      scheduleHoverClose()
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [hoverNoteId, scheduleHoverClose])

  const hoverNote = hoverNoteId ? noteById(doc.notes, hoverNoteId) : null
  const containerRect = wrapRef.current?.getBoundingClientRect() ?? null
  // localStorage always persists the draft; "linked" means live .md write is active
  const linkLabel = fileLinked ? 'linked · live' : 'draft saved'

  return (
    <div className="doc-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="doc-status">
            {doc.filename || 'Untitled.md'}
            <span className="doc-link-status"> · {linkLabel}</span>
          </span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn-ghost" onClick={handleReset}>
            New
          </button>
          <button type="button" className="btn-ghost" onClick={() => void openFile()}>
            Open
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="file-input-hidden"
            onChange={onFileInputChange}
          />
        </div>
      </header>

      <div className="page" onPaste={onPasteEmpty}>
        {isEmpty ? (
          <div className="empty-state">
            <p>Paste a transcript to begin</p>
            <p className="empty-hint">
              or Open a markdown file. Work is saved as a browser draft; in Chrome you can also
              link a file for live disk updates.
            </p>
            <button type="button" className="btn-primary" onClick={() => void loadSample()}>
              Load sample
            </button>
          </div>
        ) : (
          <>
            <input
              className="page-title"
              value={doc.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              aria-label="Document title"
            />

            <div className="properties">
              {doc.properties.map((p) => (
                <div key={p.id} className="property-row">
                  <input
                    className="property-key"
                    value={p.key}
                    placeholder="property"
                    onChange={(e) => updateProperty(p.id, { key: e.target.value })}
                  />
                  <input
                    className="property-value"
                    value={p.value}
                    placeholder="value"
                    onChange={(e) => updateProperty(p.id, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    className="property-remove"
                    aria-label="Remove property"
                    onClick={() => removeProperty(p.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="add-property" onClick={addProperty}>
                + Add property
              </button>
            </div>

            <hr className="divider" />

            <div className="transcript-wrap" ref={wrapRef}>
              <TranscriptBody
                body={doc.body}
                highlights={doc.highlights}
                notes={doc.notes}
                bodyRef={bodyRef}
                pending={
                  pending && draftType
                    ? { start: pending.start, end: pending.end, type: draftType }
                    : null
                }
                previewNoteId={panelHoverNoteId}
                onMarkEnter={onMarkEnter}
                onMouseUp={updateSelectionChrome}
              />

              {pending && (
                <CaptureUI
                  selection={pending}
                  toolbarPos={toolbarPos}
                  entryPos={entryPos}
                  phase={phase}
                  draftType={draftType}
                  draftNote={draftNote}
                  onPhase={setPhase}
                  onPickType={onPickType}
                  onDraftNote={setDraftNote}
                  onCommit={onCommitCapture}
                  onCancel={clearCapture}
                />
              )}

              {hoverNote && hoverAnchor && containerRect && (
                <NotePopover
                  note={hoverNote}
                  highlights={doc.highlights}
                  anchorRect={hoverAnchor}
                  containerRect={containerRect}
                  popoverRef={popoverElRef}
                  onChange={(patch) => {
                    if (patch.type && patch.type !== hoverNote.type) {
                      const { notes, highlights, newId } = retargetNoteType(
                        doc.notes,
                        doc.highlights,
                        hoverNote.id,
                        patch.type,
                      )
                      setHoverNoteId(newId)
                      commit({
                        ...doc,
                        notes: notes.map((n) =>
                          n.id === newId ? { ...n, note: patch.note ?? n.note } : n,
                        ),
                        highlights,
                      })
                      return
                    }
                    commit({
                      ...doc,
                      notes: doc.notes.map((n) =>
                        n.id === hoverNote.id ? { ...n, ...patch } : n,
                      ),
                    })
                  }}
                  onDelete={() => {
                    const next = removeNoteFromDocument(doc.notes, doc.highlights, hoverNote.id)
                    popoverPinned.current = false
                    hoverMarkRef.current = null
                    setHoverNoteId(null)
                    setHoverAnchor(null)
                    commit({ ...doc, ...next })
                  }}
                  onClose={() => {
                    popoverPinned.current = false
                    hoverMarkRef.current = null
                    setHoverNoteId(null)
                    setHoverAnchor(null)
                  }}
                  onMouseEnter={() => {
                    popoverPinned.current = true
                    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
                  }}
                  onMouseLeave={() => {
                    popoverPinned.current = false
                    scheduleHoverClose()
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {!isEmpty && (
        <>
          <button
            type="button"
            className={`notes-fab${notesOpen ? ' notes-fab-active' : ''}`}
            onClick={() => {
              setNotesOpen((o) => {
                if (o) setPanelHoverNoteId(null)
                return !o
              })
            }}
            aria-expanded={notesOpen}
            aria-controls="notes-panel"
          >
            Notes{doc.notes.length > 0 ? ` · ${doc.notes.length}` : ''}
          </button>

          {notesOpen && (
            <div id="notes-panel" className="notes-panel-shell">
              <NotesPanel
                notes={doc.notes}
                highlights={doc.highlights}
                onChangeNote={(id, patch) => {
                  commit({
                    ...doc,
                    notes: doc.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
                  })
                }}
                onDeleteNote={(id) => {
                  const next = removeNoteFromDocument(doc.notes, doc.highlights, id)
                  if (hoverNoteId === id) {
                    popoverPinned.current = false
                    hoverMarkRef.current = null
                    setHoverNoteId(null)
                    setHoverAnchor(null)
                  }
                  commit({ ...doc, ...next })
                }}
                onJumpToNote={onJumpToNote}
                onHoverNote={setPanelHoverNoteId}
                onClose={() => {
                  setPanelHoverNoteId(null)
                  setNotesOpen(false)
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
