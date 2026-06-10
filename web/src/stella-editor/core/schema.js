export const STELLA_DOC_VERSION = 1;

export const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'list_item',
  'task_list',
  'task_item',
  'blockquote',
  'code_block',
  'panel',
  'divider',
  'table',
  'table_row',
  'table_cell',
  'expand',
  'status',
  'layout',
  'layout_column',
  'media',
  'unsupported'
]);

export const TEXT_CONTAINER_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'code_block'
]);

export const MARK_TYPES = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'color']);
export const PANEL_VARIANTS = new Set(['info', 'note', 'success', 'warning', 'error', 'custom']);
export const MEDIA_KINDS = new Set(['image', 'file', 'video', 'audio', 'unknown']);

/**
 * @typedef {Object} StellaDoc
 * @property {number} version
 * @property {'doc'} type
 * @property {StellaDocMeta} meta
 * @property {StellaBlock[]} content
 */

/**
 * @typedef {Object} StellaDocMeta
 * @property {string} title
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} StellaBlock
 * @property {string} id
 * @property {string} type
 * @property {Object} attrs
 * @property {Array<StellaBlock|StellaText>} content
 */

/**
 * @typedef {Object} StellaText
 * @property {'text'} type
 * @property {string} text
 * @property {StellaMark[]} marks
 */

/**
 * @typedef {Object} StellaMark
 * @property {string} type
 * @property {Object} attrs
 */
