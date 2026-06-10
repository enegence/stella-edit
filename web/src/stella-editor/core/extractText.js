import { normalizeDocument } from './normalize';

export function inlineText(content = []) {
  return content.map((node) => (node.type === 'text' ? node.text : '')).join('');
}

function blockText(block) {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'blockquote':
    case 'code_block':
      return inlineText(block.content);
    case 'panel':
    case 'expand':
      return [block.attrs.title, ...block.content.map(blockText)].filter(Boolean).join('\n');
    case 'status':
      return block.attrs.text || '';
    case 'layout':
    case 'layout_column':
      return block.content.map(blockText).filter(Boolean).join('\n');
    case 'bullet_list':
    case 'ordered_list':
    case 'task_list':
    case 'list_item':
    case 'task_item':
    case 'table':
    case 'table_row':
    case 'table_cell':
      return block.content.map(blockText).filter(Boolean).join('\n');
    case 'media':
      return [block.attrs.alt, block.attrs.caption].filter(Boolean).join(' ');
    default:
      return '';
  }
}

export function extractText(doc) {
  return normalizeDocument(doc).content.map(blockText).filter(Boolean).join('\n\n');
}
