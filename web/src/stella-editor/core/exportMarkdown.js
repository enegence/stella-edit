import { normalizeDocument, isSafeUrl } from './normalize';
import { inlineText } from './extractText';

function renderInline(content = []) {
  return content.map((node) => {
    if (node.type !== 'text') return '';
    return (node.marks || []).reduce((text, mark) => {
      if (mark.type === 'bold') return `**${text}**`;
      if (mark.type === 'italic') return `*${text}*`;
      if (mark.type === 'code') return `\`${text}\``;
      if (mark.type === 'link' && mark.attrs?.kind === 'external_url' && isSafeUrl(mark.attrs.href)) return `[${text}](${mark.attrs.href})`;
      return text;
    }, node.text);
  }).join('');
}

function renderBlock(block, index = 0) {
  switch (block.type) {
    case 'paragraph':
      return renderInline(block.content);
    case 'heading':
      return `${'#'.repeat(block.attrs.level)} ${renderInline(block.content)}`;
    case 'blockquote':
      return `> ${renderInline(block.content)}`;
    case 'code_block':
      return `\`\`\`${block.attrs.language || ''}\n${inlineText(block.content)}\n\`\`\``;
    case 'divider':
      return '---';
    case 'panel':
      return `> [!${String(block.attrs.variant || 'info').toUpperCase()}]\n${block.content.map(renderBlock).join('\n')}`;
    case 'expand':
      return `### ${block.attrs.title}\n\n${block.content.map(renderBlock).join('\n\n')}`;
    case 'status':
      return `\`${block.attrs.text}\``;
    case 'layout':
      return block.content.map((column, columnIndex) => `Column ${columnIndex + 1}\n\n${column.content.map(renderBlock).join('\n\n')}`).join('\n\n');
    case 'bullet_list':
      return block.content.map((item) => `- ${item.content.map(renderBlock).join(' ')}`).join('\n');
    case 'ordered_list':
      return block.content.map((item, itemIndex) => `${itemIndex + 1}. ${item.content.map(renderBlock).join(' ')}`).join('\n');
    case 'task_list':
      return block.content.map((item) => `- [${item.attrs.checked ? 'x' : ' '}] ${item.content.map(renderBlock).join(' ')}`).join('\n');
    case 'table': {
      const rows = block.content.map((row) => row.content.map((cell) => cell.content.map(renderBlock).join(' ')));
      if (!rows.length) return '';
      const header = `| ${rows[0].join(' | ')} |`;
      const divider = `| ${rows[0].map(() => '---').join(' | ')} |`;
      return [header, divider, ...rows.slice(1).map((row) => `| ${row.join(' | ')} |`)].join('\n');
    }
    case 'media':
      return block.attrs.alt || block.attrs.caption ? `![${block.attrs.alt || block.attrs.caption}]()` : '';
    case 'unsupported':
      return `<!-- unsupported block: ${block.attrs.originalType || 'unknown'} -->`;
    default:
      return index === -1 ? '' : '';
  }
}

export function exportMarkdown(doc) {
  return normalizeDocument(doc).content.map(renderBlock).filter(Boolean).join('\n\n');
}
