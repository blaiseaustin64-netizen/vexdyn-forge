/**
 * Forge CodeMirror theme — matches new visual identity
 * Base #0a0e14 / elevated #111823 / accent #3B6EA5 → #5B8DC7 / silver #9AA5B1
 */

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const forgeEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#0a0e14',
      color: '#e8edf2',
      fontSize: '13px',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '20px',
    },
    '.cm-content': { caretColor: '#5B8DC7', padding: '12px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#5B8DC7' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(91, 141, 199, 0.28)',
      },
    '.cm-activeLine': { backgroundColor: 'rgba(17, 24, 35, 0.9)' },
    '.cm-gutters': {
      backgroundColor: '#0a0e14',
      color: '#3d4754',
      border: 'none',
      borderRight: '1px solid #16202c',
    },
    '.cm-activeLineGutter': { backgroundColor: '#0f141c', color: '#9AA5B1' },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 10px',
      minWidth: '36px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      color: '#6b7682',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(91, 141, 199, 0.22)',
      outline: '1px solid rgba(91, 141, 199, 0.4)',
    },
    '.cm-nonmatchingBracket': { backgroundColor: 'rgba(217, 90, 106, 0.18)' },
    '.cm-tooltip': {
      backgroundColor: '#111823',
      border: '1px solid #1e2a38',
      color: '#e8edf2',
      borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(59, 110, 165, 0.2)',
      color: '#e8edf2',
    },
    '.cm-tooltip-autocomplete ul li': {
      padding: '4px 10px',
    },
    '.cm-completionIcon': {
      opacity: 0.6,
    },
    '.cm-search': {
      backgroundColor: '#111823',
      borderBottom: '1px solid #1e2a38',
      color: '#e8edf2',
      padding: '6px 8px',
    },
    '.cm-search input': {
      backgroundColor: '#0a0e14',
      border: '1px solid #1e2a38',
      color: '#e8edf2',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
    },
    '.cm-search input:focus': {
      borderColor: '#5B8DC7',
    },
    '.cm-search button': {
      background: 'transparent',
      border: '1px solid #1e2a38',
      color: '#9AA5B1',
      borderRadius: '4px',
      cursor: 'pointer',
      padding: '2px 8px',
    },
    '.cm-search button:hover': {
      backgroundColor: '#161e2a',
      color: '#e8edf2',
    },
    '.cm-panels': {
      backgroundColor: '#111823',
      color: '#e8edf2',
    },
    '.cm-panel.cm-panel-lint ul': {
      fontFamily: 'inherit',
    },
    '.cm-diagnostic-error': {
      borderLeft: '3px solid #d95a6a',
    },
    '.cm-diagnostic-warning': {
      borderLeft: '3px solid #d4a843',
    },
  },
  { dark: true }
)

const forgeHighlightStyle = HighlightStyle.define([
  // Keywords / control flow
  { tag: t.keyword, color: '#ff7b72' },
  { tag: t.controlKeyword, color: '#ff7b72' },
  { tag: t.operatorKeyword, color: '#ff7b72' },
  { tag: t.definitionKeyword, color: '#ff7b72' },
  { tag: t.moduleKeyword, color: '#ff7b72' },
  { tag: t.self, color: '#ff7b72' },

  // Comments
  { tag: t.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#8b949e', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#8b949e', fontStyle: 'italic' },
  { tag: t.docComment, color: '#8b949e', fontStyle: 'italic' },

  // Strings / literals
  { tag: t.string, color: '#a5d6ff' },
  { tag: t.special(t.string), color: '#a5d6ff' },
  { tag: t.regexp, color: '#7ee787' },
  { tag: t.escape, color: '#79c0ff' },
  { tag: t.number, color: '#79c0ff' },
  { tag: t.bool, color: '#79c0ff' },
  { tag: t.null, color: '#79c0ff' },
  { tag: t.atom, color: '#79c0ff' },
  { tag: t.constant(t.variableName), color: '#79c0ff' },

  // Variables / functions
  { tag: t.variableName, color: '#e6edf3' },
  { tag: t.definition(t.variableName), color: '#ffa657' },
  { tag: t.local(t.variableName), color: '#e6edf3' },
  { tag: t.special(t.variableName), color: '#79c0ff' },
  { tag: t.function(t.variableName), color: '#d2a8ff' },
  { tag: t.function(t.propertyName), color: '#d2a8ff' },
  { tag: t.definition(t.function(t.variableName)), color: '#d2a8ff' },
  { tag: t.propertyName, color: '#79c0ff' },
  { tag: t.definition(t.propertyName), color: '#79c0ff' },
  { tag: t.labelName, color: '#ffa657' },
  { tag: t.namespace, color: '#ffa657' },

  // Types / classes
  { tag: t.className, color: '#ffa657' },
  { tag: t.typeName, color: '#ffa657' },

  // HTML / CSS
  { tag: t.tagName, color: '#7ee787' },
  { tag: t.attributeName, color: '#79c0ff' },
  { tag: t.attributeValue, color: '#a5d6ff' },
  { tag: t.angleBracket, color: '#8b949e' },
  { tag: t.standard(t.tagName), color: '#7ee787' },

  // Operators / punctuation
  { tag: t.operator, color: '#ff7b72' },
  { tag: t.punctuation, color: '#c9d1d9' },
  { tag: t.bracket, color: '#c9d1d9' },
  { tag: t.separator, color: '#c9d1d9' },
  { tag: t.meta, color: '#8b949e' },
  { tag: t.processingInstruction, color: '#8b949e' },

  // Markdown / misc
  { tag: t.heading, color: '#79c0ff', fontWeight: 'bold' },
  { tag: t.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: t.url, color: '#58a6ff' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.inserted, color: '#7ee787' },
  { tag: t.deleted, color: '#ff7b72' },
  { tag: t.changed, color: '#ffa657' },
  { tag: t.invalid, color: '#f85149' },
])

export const forgeHighlight = syntaxHighlighting(forgeHighlightStyle)