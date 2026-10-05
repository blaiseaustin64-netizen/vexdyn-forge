/**
 * Forge CodeMirror theme — professional dark IDE highlighting
 * Palette aligned with Forge graphite/blue identity (not neon).
 */

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const forgeEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#0a0e14',
      color: '#d6dde6',
      fontSize: '13.5px',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.55',
    },
    '.cm-content': {
      caretColor: '#e8edf2',
      padding: '12px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#e8edf2',
      borderLeftWidth: '2px',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(91, 141, 199, 0.32)',
      },
    '.cm-activeLine': {
      backgroundColor: 'rgba(22, 30, 42, 0.95)',
    },
    '.cm-gutters': {
      backgroundColor: '#0a0e14',
      color: '#4a5568',
      border: 'none',
      borderRight: '1px solid #16202c',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#0f141c',
      color: '#9AA5B1',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 12px',
      minWidth: '40px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      color: '#5a6572',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(91, 141, 199, 0.2)',
      outline: '1px solid rgba(91, 141, 199, 0.55)',
      borderRadius: '2px',
    },
    '.cm-nonmatchingBracket': {
      backgroundColor: 'rgba(217, 90, 106, 0.2)',
      outline: '1px solid rgba(217, 90, 106, 0.45)',
    },
    '.cm-tooltip': {
      backgroundColor: '#111823',
      border: '1px solid #1e2a38',
      color: '#e8edf2',
      borderRadius: '6px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(59, 110, 165, 0.28)',
      color: '#e8edf2',
    },
    '.cm-tooltip-autocomplete ul li': {
      padding: '4px 10px',
    },
    '.cm-completionIcon': { opacity: 0.55 },
    '.cm-search': {
      backgroundColor: '#111823',
      borderBottom: '1px solid #1e2a38',
      color: '#e8edf2',
      padding: '6px 8px',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(212, 168, 67, 0.25)',
      outline: '1px solid rgba(212, 168, 67, 0.45)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(212, 168, 67, 0.4)',
    },
    '.cm-search input': {
      backgroundColor: '#0a0e14',
      border: '1px solid #1e2a38',
      color: '#e8edf2',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
    },
    '.cm-search input:focus': { borderColor: '#5B8DC7' },
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
    '.cm-panel.cm-panel-lint ul': { fontFamily: 'inherit' },
    '.cm-diagnostic-error': { borderLeft: '3px solid #d95a6a' },
    '.cm-diagnostic-warning': { borderLeft: '3px solid #d4a843' },
    '.cm-lintRange-error': {
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'6\' height=\'3\'%3E%3Cpath d=\'M0 3 L3 0 L6 3\' fill=\'none\' stroke=\'%23d95a6a\'/%3E%3C/svg%3E")',
      backgroundPosition: 'bottom left',
      backgroundRepeat: 'repeat-x',
    },
    '.cm-lintRange-warning': {
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'6\' height=\'3\'%3E%3Cpath d=\'M0 3 L3 0 L6 3\' fill=\'none\' stroke=\'%23d4a843\'/%3E%3C/svg%3E")',
      backgroundPosition: 'bottom left',
      backgroundRepeat: 'repeat-x',
    },
  },
  { dark: true }
)

/**
 * Syntax colors — restrained, high-contrast, role-distinct.
 * Keywords: blue · Strings: soft green · Numbers/bool: warm sand
 * Functions: gold · Types: sage · Tags: steel blue · Comments: muted
 */
const forgeHighlightStyle = HighlightStyle.define([
  // Keywords & modules
  { tag: t.keyword, color: '#6ea3e0' },
  { tag: t.controlKeyword, color: '#7aace6' },
  { tag: t.operatorKeyword, color: '#6ea3e0' },
  { tag: t.definitionKeyword, color: '#6ea3e0' },
  { tag: t.moduleKeyword, color: '#82b0e8', fontWeight: '500' },

  // Comments
  { tag: t.comment, color: '#5c6b7a', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#5c6b7a', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#5c6b7a', fontStyle: 'italic' },
  { tag: t.docComment, color: '#6a7a8a', fontStyle: 'italic' },

  // Literals
  { tag: t.string, color: '#8fbf9f' },
  { tag: t.special(t.string), color: '#9bc9ab' },
  { tag: t.character, color: '#8fbf9f' },
  { tag: t.number, color: '#d4b07a' },
  { tag: t.integer, color: '#d4b07a' },
  { tag: t.float, color: '#d4b07a' },
  { tag: t.bool, color: '#d4a574' },
  { tag: t.null, color: '#c9946e' },
  { tag: t.regexp, color: '#c48b9f' },
  { tag: t.escape, color: '#c4a882' },

  // Names
  { tag: t.variableName, color: '#cfd6df' },
  { tag: t.definition(t.variableName), color: '#dde4ec' },
  { tag: t.constant(t.variableName), color: '#d4b07a' },
  { tag: t.function(t.variableName), color: '#d4c07a' },
  { tag: t.definition(t.function(t.variableName)), color: '#e0cc88' },
  { tag: t.propertyName, color: '#9ec0e0' },
  { tag: t.definition(t.propertyName), color: '#a8c8e6' },
  { tag: t.attributeName, color: '#9bbfe0' },
  { tag: t.className, color: '#d4c07a' },
  { tag: t.definition(t.className), color: '#e0cc88' },
  { tag: t.typeName, color: '#9db89a' },
  { tag: t.definition(t.typeName), color: '#aec8aa' },
  { tag: t.namespace, color: '#9bb0c8' },
  { tag: t.labelName, color: '#9bb0c8' },

  // HTML / JSX / XML
  { tag: t.tagName, color: '#6ea3e0' },
  { tag: t.angleBracket, color: '#6b7682' },
  { tag: t.attributeValue, color: '#8fbf9f' },
  { tag: t.documentMeta, color: '#6b7682' },

  // Operators / punctuation
  { tag: t.operator, color: '#9AA5B1' },
  { tag: t.punctuation, color: '#6b7682' },
  { tag: t.bracket, color: '#7a8794' },
  { tag: t.squareBracket, color: '#7a8794' },
  { tag: t.paren, color: '#7a8794' },
  { tag: t.brace, color: '#7a8794' },
  { tag: t.separator, color: '#6b7682' },

  // Meta / special
  { tag: t.meta, color: '#7a8794' },
  { tag: t.processingInstruction, color: '#7a8794' },
  { tag: t.contentSeparator, color: '#6b7682' },
  { tag: t.invalid, color: '#e07080', textDecoration: 'underline' },

  // Markdown
  { tag: t.heading, color: '#7aace6', fontWeight: 'bold' },
  { tag: t.heading1, color: '#8bb6ea', fontWeight: 'bold' },
  { tag: t.heading2, color: '#7aace6', fontWeight: 'bold' },
  { tag: t.link, color: '#6ea3e0', textDecoration: 'underline' },
  { tag: t.url, color: '#7ba3d0' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.quote, color: '#8fbf9f', fontStyle: 'italic' },
  { tag: t.list, color: '#9AA5B1' },
  { tag: t.monospace, color: '#cfd6df' },
])

export const forgeHighlight = syntaxHighlighting(forgeHighlightStyle)
