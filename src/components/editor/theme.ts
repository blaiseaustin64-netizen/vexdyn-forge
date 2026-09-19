import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const forgeEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#080B0F',
      color: '#F5F7FA',
      fontSize: '13px',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '20px',
    },
    '.cm-content': { caretColor: '#3BA7FF', padding: '12px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#3BA7FF' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: 'rgba(59, 167, 255, 0.28)',
      },
    '.cm-activeLine': { backgroundColor: 'rgba(18, 22, 29, 0.85)' },
    '.cm-gutters': {
      backgroundColor: '#080B0F',
      color: '#414852',
      border: 'none',
      borderRight: '1px solid #1C242C',
    },
    '.cm-activeLineGutter': { backgroundColor: '#0F141A', color: '#A7AFBD' },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 10px',
      minWidth: '36px',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(59, 167, 255, 0.22)',
      outline: '1px solid rgba(116, 199, 255, 0.4)',
    },
    '.cm-nonmatchingBracket': { backgroundColor: 'rgba(255, 93, 115, 0.18)' },
    '.cm-tooltip': {
      backgroundColor: '#151B22',
      border: '1px solid #27313B',
      color: '#F5F7FA',
      borderRadius: '8px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(59, 167, 255, 0.16)',
      color: '#F5F7FA',
    },
    '.cm-search': {
      backgroundColor: '#151B22',
      borderBottom: '1px solid #27313B',
      color: '#A7AFBD',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '12px',
      padding: '6px 10px',
    },
    '.cm-search input, .cm-textfield': {
      background: '#0F141A',
      border: '1px solid #27313B',
      color: '#F5F7FA',
      borderRadius: '6px',
    },
    '.cm-search button, .cm-button': {
      background: '#151B22',
      border: '1px solid #27313B',
      color: '#A7AFBD',
      borderRadius: '6px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    '.cm-panels': { backgroundColor: '#0F141A' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid #27313B' },
    '.cm-searchMatch': { backgroundColor: 'rgba(245, 185, 66, 0.25)' },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(59, 167, 255, 0.35)',
    },
  },
  { dark: true }
)

export const forgeHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: '#3BA7FF' },
    { tag: t.controlKeyword, color: '#3BA7FF' },
    { tag: t.definitionKeyword, color: '#3BA7FF' },
    { tag: t.operatorKeyword, color: '#A7AFBD' },
    { tag: t.operator, color: '#A7AFBD' },
    { tag: t.string, color: '#35D49A' },
    { tag: t.special(t.string), color: '#35D49A' },
    { tag: t.number, color: '#F5B942' },
    { tag: t.bool, color: '#F5B942' },
    { tag: t.null, color: '#F5B942' },
    { tag: t.comment, color: '#687180', fontStyle: 'italic' },
    { tag: t.lineComment, color: '#687180', fontStyle: 'italic' },
    { tag: t.blockComment, color: '#687180', fontStyle: 'italic' },
    { tag: t.tagName, color: '#5BA7FF' },
    { tag: t.angleBracket, color: '#687180' },
    { tag: t.attributeName, color: '#8B7CFF' },
    { tag: t.attributeValue, color: '#35D49A' },
    { tag: t.propertyName, color: '#5BA7FF' },
    { tag: t.variableName, color: '#F5F7FA' },
    { tag: t.definition(t.variableName), color: '#F5F7FA' },
    { tag: t.function(t.variableName), color: '#74C7FF' },
    { tag: t.className, color: '#5BA7FF' },
    { tag: t.typeName, color: '#5BA7FF' },
    { tag: t.regexp, color: '#FF5D73' },
    { tag: t.meta, color: '#687180' },
    { tag: t.punctuation, color: '#A7AFBD' },
    { tag: t.unit, color: '#F5B942' },
    { tag: t.color, color: '#F5B942' },
  ])
)
