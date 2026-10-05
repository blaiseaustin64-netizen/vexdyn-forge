/**
 * Professional CodeMirror 6 editor for VEXDYN Forge.
 * Imperative API: goToLine, format, focus, getView
 * Does not own persistence — parent owns file state.
 */

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'
import { EditorState, EditorSelection } from '@codemirror/state'
import {
  EditorView,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  toggleComment,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown,
  selectLine,
  deleteLine,
} from '@codemirror/commands'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
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
  openSearchPanel as openReplaceCapable,
} from '@codemirror/search'
import { languageExtension } from './editor/language'
import { forgeCompletions } from './editor/completions'
import { forgeEditorTheme, forgeHighlight } from './editor/theme'
import { emmetExtension } from './editor/emmet'
import { formatCode } from './editor/format'
import { loadSettings } from '../lib/settingsStore'
import { languageFromFilename } from '../types/project'

export interface CodeEditorHandle {
  goToLine: (line: number, column?: number) => void
  focus: () => void
  format: () => Promise<{ ok: boolean; reason?: string }>
  getView: () => EditorView | null
  openFind: () => void
}

interface CodeEditorProps {
  fileId: string
  filename: string
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  onFormatResult?: (msg: string) => void
  readOnly?: boolean
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { fileId, filename, value, onChange, onSave, onFormatResult, readOnly = false },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const lastValue = useRef(value)
    const onChangeRef = useRef(onChange)
    const onSaveRef = useRef(onSave)
    const scrollPos = useRef<{ top: number; left: number } | null>(null)
    const selectionPos = useRef<{ anchor: number; head: number } | null>(null)

    onChangeRef.current = onChange
    onSaveRef.current = onSave

    const goToLine = useCallback((line: number, column = 1) => {
      const view = viewRef.current
      if (!view) return
      const doc = view.state.doc
      const targetLine = Math.max(1, Math.min(line, doc.lines))
      const lineObj = doc.line(targetLine)
      const col = Math.max(0, Math.min((column || 1) - 1, lineObj.length))
      const pos = lineObj.from + col
      view.dispatch({
        selection: EditorSelection.cursor(pos),
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      })
      view.focus()
    }, [])

    const doFormat = useCallback(async () => {
      const view = viewRef.current
      if (!view) return { ok: false, reason: 'No editor' }
      const lang = languageFromFilename(filename)
      const result = await formatCode(view.state.doc.toString(), lang)
      if (!result.ok) {
        onFormatResult?.(result.reason)
        return { ok: false, reason: result.reason }
      }
      const current = view.state.doc.toString()
      if (result.code !== current) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: result.code },
        })
        lastValue.current = result.code
        onChangeRef.current(result.code)
      }
      onFormatResult?.('Formatted')
      return { ok: true }
    }, [filename, onFormatResult])

    useImperativeHandle(
      ref,
      () => ({
        goToLine,
        focus: () => viewRef.current?.focus(),
        format: doFormat,
        getView: () => viewRef.current,
        openFind: () => {
          const v = viewRef.current
          if (v) openSearchPanel(v)
        },
      }),
      [goToLine, doFormat]
    )

    // Create / recreate editor only when file identity changes
    useEffect(() => {
      const host = hostRef.current
      if (!host) return

      // Do not carry selection across different files
      selectionPos.current = null
      scrollPos.current = null

      // Destroy previous view
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }

      const { lang, ext } = languageExtension(filename)
      const settings = loadSettings()
      const fontPx =
        settings.editorFontSize === 'sm'
          ? 12
          : settings.editorFontSize === 'lg'
            ? 15
            : 13

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
        {
          key: 'Mod-h',
          preventDefault: true,
          run: (view) => {
            openSearchPanel(view)
            return true
          },
        },
        {
          key: 'Mod-/',
          preventDefault: true,
          run: toggleComment,
        },
        {
          key: 'Alt-ArrowUp',
          run: moveLineUp,
        },
        {
          key: 'Alt-ArrowDown',
          run: moveLineDown,
        },
        {
          key: 'Alt-Shift-ArrowUp',
          run: copyLineUp,
        },
        {
          key: 'Alt-Shift-ArrowDown',
          run: copyLineDown,
        },
        {
          key: 'Mod-Shift-k',
          run: deleteLine,
        },
        {
          key: 'Mod-l',
          run: selectLine,
        },
        {
          key: 'Shift-Alt-f',
          preventDefault: true,
          run: () => {
            void doFormat()
            return true
          },
        },
        {
          key: 'Mod-Shift-i',
          preventDefault: true,
          run: () => {
            void doFormat()
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

      const extensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter({
          openText: '▾',
          closedText: '▸',
        }),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        history({ minDepth: 100 }),
        indentOnInput(),
        indentUnit.of(' '.repeat(settings.tabSize)),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches({ minChars: 2 }),
        EditorState.allowMultipleSelections.of(true),
        ext,
        forgeCompletions(lang),
        emmetExtension(
          settings.emmet && (lang === 'html' || lang === 'svg' || lang === 'jsx' || lang === 'tsx')
        ),
        forgeEditorTheme,
        forgeHighlight,
        keymap.of([
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...foldKeymap,
          indentWithTab,
          ...defaultKeymap,
        ]),
        extraKeys,
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: `${fontPx}px`,
          },
          '.cm-scroller': {
            overflowX: 'auto',
            overflowY: 'auto',
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', Consolas, monospace",
            lineHeight: '1.55',
          },
          '.cm-content': {
            padding: '8px 0',
            caretColor: '#5B8DC7',
          },
          '.cm-cursor': {
            borderLeftWidth: '2px',
            borderLeftColor: '#5B8DC7',
          },
          '.cm-gutters': {
            fontSize: `${Math.max(10, fontPx - 1)}px`,
          },
        }),
        EditorView.editable.of(!readOnly),
        ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
      ]

      const state = EditorState.create({
        doc: value,
        extensions,
      })

      const view = new EditorView({ state, parent: host })
      viewRef.current = view
      lastValue.current = value

      // Focus once when a file is opened / created — user can type immediately
      requestAnimationFrame(() => {
        if (viewRef.current === view) view.focus()
      })

      return () => {
        if (viewRef.current === view) {
          view.destroy()
          viewRef.current = null
        }
      }
      // Only recreate when file changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId, filename, readOnly])

    // External value sync only when parent content differs from the live doc
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      if (value === lastValue.current) return
      const current = view.state.doc.toString()
      if (value === current) {
        lastValue.current = value
        return
      }
      // External change (format, undo from outside) — preserve cursor when possible
      const prevSel = view.state.selection.main
      const scrollTop = view.scrollDOM.scrollTop
      lastValue.current = value
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: EditorSelection.cursor(
          Math.min(prevSel.head, value.length)
        ),
      })
      view.scrollDOM.scrollTop = scrollTop
    }, [value])

    return (
      <div
        className="code-editor cm-host"
        ref={hostRef}
        aria-label={`Code editor — ${filename}`}
      />
    )
  }
)
