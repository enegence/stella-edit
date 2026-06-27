import { STELLA_DOC_VERSION } from './schema.js';
import { createId } from './ids.js';
import { normalizeDocument } from './normalize.js';

export function createText(text = '', marks = []) {
  return { type: 'text', text: String(text ?? ''), marks };
}

export function createParagraphBlock(content = []) {
  return {
    id: createId('paragraph'),
    type: 'paragraph',
    attrs: {},
    content: Array.isArray(content) ? content : [createText(content)]
  };
}

export function createHeadingBlock({ level = 1, text = '' } = {}) {
  return {
    id: createId('heading'),
    type: 'heading',
    attrs: { level },
    content: text ? [createText(text)] : []
  };
}

export function createPanelBlock({ variant = 'info', title = null } = {}) {
  return {
    id: createId('panel'),
    type: 'panel',
    attrs: { variant, title },
    content: [createParagraphBlock()]
  };
}

export function createCodeBlock({ language = '', text = '' } = {}) {
  return {
    id: createId('code'),
    type: 'code_block',
    attrs: { language },
    content: [createText(text)]
  };
}

export function createDividerBlock() {
  return { id: createId('divider'), type: 'divider', attrs: {}, content: [] };
}

export function createExpandBlock({ title = 'More details', defaultOpen = false } = {}) {
  return {
    id: createId('expand'),
    type: 'expand',
    attrs: { title, defaultOpen },
    content: [createParagraphBlock()]
  };
}

export function createStatusBlock({ text = 'IN PROGRESS', color = 'blue' } = {}) {
  return {
    id: createId('status'),
    type: 'status',
    attrs: { text, color },
    content: []
  };
}

export function createLayoutBlock({ variant = '50-50' } = {}) {
  const columnCounts = { '50-50': 2, '33-33-33': 3, '70-30': 2 };
  return {
    id: createId('layout'),
    type: 'layout',
    attrs: { variant },
    content: Array.from({ length: columnCounts[variant] || 2 }, () => ({
      id: createId('layout_column'),
      type: 'layout_column',
      attrs: {},
      content: [createParagraphBlock()]
    }))
  };
}

export function createMediaBlock({ assetId = null, kind = 'unknown', alt = '', caption = '', width = 'full' } = {}) {
  return {
    id: createId('media'),
    type: 'media',
    attrs: { assetId, kind, alt, caption, width },
    content: []
  };
}

export function createListBlock(type = 'bullet_list', items = ['']) {
  return {
    id: createId(type),
    type,
    attrs: {},
    content: items.map((item) => ({
      id: createId(type === 'task_list' ? 'task_item' : 'list_item'),
      type: type === 'task_list' ? 'task_item' : 'list_item',
      attrs: type === 'task_list' ? { checked: false } : {},
      content: [createParagraphBlock([createText(item)])]
    }))
  };
}

export function createTableBlock({ rows = 3, cols = 3, headerRow = true, headerColumn = false } = {}) {
  return {
    id: createId('table'),
    type: 'table',
    attrs: { headerRow, headerColumn, columnWidths: Array.from({ length: cols }, () => null) },
    content: Array.from({ length: rows }, () => ({
      id: createId('row'),
      type: 'table_row',
      attrs: {},
      content: Array.from({ length: cols }, () => ({
        id: createId('cell'),
        type: 'table_cell',
        attrs: {},
        content: [createParagraphBlock()]
      }))
    }))
  };
}

export function createEmptyDocument({ title = 'Untitled' } = {}) {
  const now = new Date().toISOString();
  return normalizeDocument({
    version: STELLA_DOC_VERSION,
    type: 'doc',
    meta: { title, createdAt: now, updatedAt: now },
    content: [createParagraphBlock()]
  });
}
