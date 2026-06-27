import { createHeadingBlock, createParagraphBlock, createTableBlock, createText } from './document.js';
import { normalizeDocument, isSafeUrl } from './normalize.js';

function stripUnsafeHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function textFromNode(node) {
  return node.textContent || '';
}

export function sanitizePaste(input = {}) {
  if (input.html && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(stripUnsafeHtml(input.html), 'text/html');
    const blocks = [];
    parsed.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) blocks.push(createParagraphBlock([createText(node.textContent.trim())]));
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (/h[1-4]/.test(tag)) blocks.push(createHeadingBlock({ level: Number(tag[1]), text: textFromNode(node) }));
      else if (tag === 'p' || tag === 'div') blocks.push(createParagraphBlock([createText(textFromNode(node))]));
      else if (tag === 'a') blocks.push(createParagraphBlock([createText(textFromNode(node), isSafeUrl(node.getAttribute('href')) ? [{ type: 'link', attrs: { kind: 'external_url', href: node.getAttribute('href') } }] : [])]));
      else if (tag === 'table') {
        const rows = [...node.querySelectorAll('tr')].map((row) => [...row.querySelectorAll('th,td')].map((cell) => textFromNode(cell)));
        if (rows.length) {
          const table = createTableBlock({ rows: rows.length, cols: Math.max(...rows.map((row) => row.length), 1) });
          rows.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
            table.content[rowIndex].content[colIndex].content[0].content = [createText(cell)];
          }));
          blocks.push(table);
        }
      } else {
        const text = textFromNode(node).trim();
        if (text) blocks.push(createParagraphBlock([createText(text)]));
      }
    });
    return normalizeDocument({ type: 'doc', version: 1, content: blocks });
  }

  const text = String(input.text || '');
  const rows = text.split(/\r?\n/).filter(Boolean).map((row) => row.split('\t'));
  if (rows.length > 1 && rows.some((row) => row.length > 1)) {
    const table = createTableBlock({ rows: rows.length, cols: Math.max(...rows.map((row) => row.length)) });
    rows.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
      table.content[rowIndex].content[colIndex].content[0].content = [createText(cell)];
    }));
    return normalizeDocument({ type: 'doc', version: 1, content: [table] });
  }
  return normalizeDocument({ type: 'doc', version: 1, content: text.split(/\n{2,}/).filter(Boolean).map((para) => createParagraphBlock([createText(para.trim())])) });
}
