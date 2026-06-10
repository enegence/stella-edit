import { BLOCK_TYPES, MARK_TYPES, MEDIA_KINDS, PANEL_VARIANTS, STELLA_DOC_VERSION } from './schema';
import { createId } from './ids';

const EMPTY_TEXT_BLOCKS = new Set(['paragraph', 'heading', 'blockquote', 'code_block']);
const CHILD_BLOCKS = new Set(['list_item', 'task_item', 'table_row', 'table_cell', 'layout_column']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isSafeUrl(href) {
  if (!href || typeof href !== 'string') return false;
  try {
    const url = new URL(href, 'https://stella.local');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeMarks(marks) {
  if (!Array.isArray(marks)) return [];
  return marks
    .filter((mark) => isObject(mark) && MARK_TYPES.has(mark.type))
    .map((mark) => {
      if (mark.type === 'color') {
        const value = typeof mark.attrs?.color === 'string' ? mark.attrs.color : '';
        return /^#[0-9a-f]{6}$/i.test(value) ? { type: 'color', attrs: { color: value } } : null;
      }
      if (mark.type !== 'link') return { type: mark.type, attrs: {} };
      const attrs = isObject(mark.attrs) ? { ...mark.attrs } : {};
      if (attrs.kind === 'external_url' && !isSafeUrl(attrs.href)) return null;
      if (!attrs.kind && attrs.href) attrs.kind = 'external_url';
      return { type: 'link', attrs };
    })
    .filter(Boolean);
}

function normalizeText(node, inCode = false) {
  return {
    type: 'text',
    text: String(node?.text ?? ''),
    marks: inCode ? [] : normalizeMarks(node?.marks)
  };
}

function paragraphFallback() {
  return { id: createId('paragraph'), type: 'paragraph', attrs: {}, content: [] };
}

function normalizeInlineContent(content, inCode = false) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((node) => isObject(node))
    .map((node) => (node.type === 'text' ? normalizeText(node, inCode) : null))
    .filter(Boolean);
}

function normalizeChildren(content, allowedParent) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((node) => isObject(node))
    .map((node) => normalizeBlock(node, allowedParent))
    .filter(Boolean);
}

function normalizeBlock(block, parentType = 'doc') {
  if (!isObject(block)) return null;
  const type = BLOCK_TYPES.has(block.type) ? block.type : 'unsupported';
  const base = {
    id: typeof block.id === 'string' && block.id ? block.id : createId(type),
    type,
    attrs: isObject(block.attrs) ? { ...block.attrs } : {},
    content: []
  };

  if (type === 'unsupported') {
    return {
      ...base,
      attrs: {
        originalType: block.type || 'unknown',
        originalAttrs: isObject(block.attrs) ? { ...block.attrs } : {}
      }
    };
  }

  if (parentType === 'doc' && CHILD_BLOCKS.has(type)) return null;

  if (type === 'heading') {
    const level = Number(base.attrs.level);
    base.attrs.level = [1, 2, 3, 4, 5, 6].includes(level) ? level : 1;
    if (['left', 'center', 'right'].includes(base.attrs.align)) base.attrs.align = base.attrs.align;
    else delete base.attrs.align;
    base.content = normalizeInlineContent(block.content);
    return base;
  }

  if (EMPTY_TEXT_BLOCKS.has(type)) {
    if (['left', 'center', 'right'].includes(base.attrs.align)) base.attrs.align = base.attrs.align;
    else if (type !== 'code_block') delete base.attrs.align;
    base.content = normalizeInlineContent(block.content, type === 'code_block');
    return base;
  }

  if (type === 'panel') {
    base.attrs.variant = PANEL_VARIANTS.has(base.attrs.variant) ? base.attrs.variant : 'info';
    base.attrs.title = base.attrs.title ?? null;
    base.content = normalizeChildren(block.content, type).filter((child) => child.type !== 'table_row' && child.type !== 'table_cell');
    if (!base.content.length) base.content = [paragraphFallback()];
    return base;
  }

  if (type === 'expand') {
    base.attrs.title = String(base.attrs.title || 'More details');
    base.attrs.defaultOpen = Boolean(base.attrs.defaultOpen);
    base.content = normalizeChildren(block.content, type).filter((child) => child.type !== 'table_row' && child.type !== 'table_cell');
    if (!base.content.length) base.content = [paragraphFallback()];
    return base;
  }

  if (type === 'media') {
    base.attrs = {
      assetId: base.attrs.assetId || null,
      kind: MEDIA_KINDS.has(base.attrs.kind) ? base.attrs.kind : 'unknown',
      alt: String(base.attrs.alt || ''),
      caption: String(base.attrs.caption || ''),
      width: base.attrs.width || 'full'
    };
    return base;
  }

  if (type === 'status') {
    base.attrs = {
      text: String(base.attrs.text || 'IN PROGRESS').slice(0, 40),
      color: ['blue', 'green', 'yellow', 'red', 'gray', 'coral'].includes(base.attrs.color) ? base.attrs.color : 'blue'
    };
    return base;
  }

  if (type === 'layout') {
    const allowedVariants = new Set(['50-50', '33-33-33', '70-30']);
    base.attrs.variant = allowedVariants.has(base.attrs.variant) ? base.attrs.variant : '50-50';
    const expectedColumns = base.attrs.variant === '33-33-33' ? 3 : 2;
    base.content = normalizeChildren(block.content, type).filter((child) => child.type === 'layout_column').slice(0, expectedColumns);
    while (base.content.length < expectedColumns) {
      base.content.push(normalizeBlock({ type: 'layout_column', content: [paragraphFallback()] }, type));
    }
    return base;
  }

  if (type === 'layout_column') {
    base.content = normalizeChildren(block.content, type).filter((child) => child.type !== 'table_row' && child.type !== 'table_cell' && child.type !== 'layout_column');
    if (!base.content.length) base.content = [paragraphFallback()];
    return base;
  }

  if (type === 'divider') return base;

  if (type === 'bullet_list' || type === 'ordered_list' || type === 'task_list') {
    const expected = type === 'task_list' ? 'task_item' : 'list_item';
    base.content = normalizeChildren(block.content, type).filter((child) => child.type === expected);
    if (!base.content.length) {
      base.content = [normalizeBlock({ type: expected, attrs: expected === 'task_item' ? { checked: false } : {}, content: [paragraphFallback()] }, type)];
    }
    return base;
  }

  if (type === 'list_item' || type === 'task_item') {
    if (type === 'task_item') base.attrs.checked = Boolean(base.attrs.checked);
    base.content = normalizeChildren(block.content, type).filter((child) => child.type !== 'table_row' && child.type !== 'table_cell');
    if (!base.content.length) base.content = [paragraphFallback()];
    return base;
  }

  if (type === 'table') {
    base.attrs.headerRow = Boolean(base.attrs.headerRow);
    base.attrs.headerColumn = Boolean(base.attrs.headerColumn);
    base.attrs.selectedCell = typeof base.attrs.selectedCell === 'string' ? base.attrs.selectedCell : null;
    base.content = normalizeChildren(block.content, type).filter((child) => child.type === 'table_row');
    if (!base.content.length) base.content = [normalizeBlock({ type: 'table_row', content: [{ type: 'table_cell', content: [paragraphFallback()] }] }, type)];
    const columnCount = base.content[0]?.content?.length || 1;
    base.attrs.columnWidths = Array.isArray(base.attrs.columnWidths)
      ? base.attrs.columnWidths.slice(0, columnCount).map((width) => Number(width) > 0 ? Number(width) : null)
      : [];
    while (base.attrs.columnWidths.length < columnCount) base.attrs.columnWidths.push(null);
    return base;
  }

  if (type === 'table_row') {
    base.content = normalizeChildren(block.content, type).filter((child) => child.type === 'table_cell');
    if (!base.content.length) base.content = [normalizeBlock({ type: 'table_cell', content: [paragraphFallback()] }, type)];
    return base;
  }

  if (type === 'table_cell') {
    if (typeof base.attrs.background !== 'string' || !/^#[0-9a-f]{6}$/i.test(base.attrs.background)) delete base.attrs.background;
    base.content = normalizeChildren(block.content, type).filter((child) => child.type !== 'table_row' && child.type !== 'table_cell');
    if (!base.content.length) base.content = [paragraphFallback()];
    return base;
  }

  return base;
}

export function normalizeDocument(input) {
  const doc = isObject(input) ? input : {};
  const now = new Date().toISOString();
  const meta = isObject(doc.meta) ? doc.meta : {};
  const content = Array.isArray(doc.content) ? doc.content : [];
  const normalizedContent = content.map((block) => normalizeBlock(block, 'doc')).filter(Boolean);

  return {
    version: STELLA_DOC_VERSION,
    type: 'doc',
    meta: {
      ...meta,
      title: String(meta.title || 'Untitled'),
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : now,
      updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : now,
      emoji: typeof meta.emoji === 'string' ? meta.emoji : '',
      coverUrl: typeof meta.coverUrl === 'string' && isSafeUrl(meta.coverUrl) ? meta.coverUrl : '',
      width: meta.width === 'full' ? 'full' : 'fixed'
    },
    content: normalizedContent.length ? normalizedContent : [paragraphFallback()]
  };
}
