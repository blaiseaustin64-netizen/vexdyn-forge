import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
  indentUnit,
} from '@codemirror/language'
import {
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  searchKeymap,
  highlightSelectionMatches,
  openSearchPanel,
} from '@codemirror/search'
import { languageExtension } from './editor/language'
import { forgeCompletions } from './editor/completions'
import { forgeEditorTheme, forgeHighlight } from './editor/theme'
import { loadSettings } from '../lib/settingsStore'

interface CodeEditorProps {
  fileId: string
  filename: string
  value: string
  onChange: (value: string) => void
  onSave?: () => void
}

/**
 * Prompt 3.5 — CodeMirror 6 editor.
 * Plugs into existing workspace file state. Does not own persistence.
 */
export function CodeEditor({
  fileId,
  filename,
  value,
  onChange,
  onSave,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastValue = useRef(value)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)

  onChangeRef.current = onChange
  onSaveRef.current = onSave

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const { lang, ext } = languageExtension(filename)

    const extraKeys = keymap.of([
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          onSaveRef.current?.()
          return true
        },
      },
      {
        key: 'Mod-f',
        preventDefault: true,
        run: (view) => {
          openSearchPanel(view)
          return true
        },
      },
    ])

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      const next = update.state.doc.toString()
      lastValue.current = next
      onChangeRef.current(next)
    })

    const settings = loadSettings()
    const fontPx = settings.editorFontSize === 'sm' ? 12 : settings.editorFontSize === 'lg' ? 15 : 13

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter(),
        history(),
        indentOnInput(),
        indentUnit.of(' '.repeat(settings.tabSize)),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        ext,
        forgeCompletions(lang),
        forgeEditorTheme,
        forgeHighlight,
        keymap.of([
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
          ...defaultKeymap,
        ]),
        extraKeys,
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: `${fontPx}px` },
          '.cm-scroller': { overflowX: 'auto', overflowY: 'auto' },
        }),
      ],
    })

    const view = new EditorView({ state, parent: host })
    viewRef.current = view
    lastValue.current = value

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [fileId, filename])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (value === lastValue.current) return
    lastValue.current = value
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
  }, [value])

  return (
    <div
      className="code-editor cm-host"
      ref={hostRef}
      aria-label={`Code editor — ${filename}`}
    />
  )
}
