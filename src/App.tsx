import { useEffect, useState } from 'react'
import { DocumentView } from './components/DocumentView'
import { clearDraft, createEmptyDocument, loadDraft, saveDraft } from './lib/documentStore'
import type { Document } from './types'
import './App.css'

export default function App() {
  const [document, setDocument] = useState<Document>(() => loadDraft() ?? createEmptyDocument())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveDraft(document)
  }, [document, hydrated])

  return (
    <div className="app-shell">
      <DocumentView
        document={document}
        onChange={setDocument}
        onReset={() => {
          clearDraft()
          setDocument(createEmptyDocument())
        }}
      />
    </div>
  )
}
