import { normalizeDocument, isSafeUrl } from './normalize.js';
import { inlineText } from './extractText.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderInline(content = [], options = {}) {
  return content.map((node) => {
    if (node.type !== 'text') return '';
    return (node.marks || []).reduce((html, mark) => {
      if (mark.type === 'bold') return `<strong>${html}</strong>`;
      if (mark.type === 'italic') return `<em>${html}</em>`;
      if (mark.type === 'underline') return `<u>${html}</u>`;
      if (mark.type === 'strike') return `<s>${html}</s>`;
      if (mark.type === 'code') return `<code>${html}</code>`;
      if (mark.type === 'color') return `<span style="color:${escapeHtml(mark.attrs?.color || '#CC785C')}">${html}</span>`;
      if (mark.type === 'link') {
        const href = mark.attrs?.kind === 'external_url' ? mark.attrs.href : options.resolveLinkHref?.(mark.attrs?.reference);
        return href && isSafeUrl(href) ? `<a href="${escapeHtml(href)}">${html}</a>` : html;
      }
      return html;
    }, escapeHtml(node.text));
  }).join('');
}

function renderBlock(block, options = {}) {
  switch (block.type) {
    case 'paragraph':
      return `<p>${renderInline(block.content, options)}</p>`;
    case 'heading':
      return `<h${block.attrs.level}>${renderInline(block.content, options)}</h${block.attrs.level}>`;
    case 'blockquote':
      return `<blockquote>${renderInline(block.content, options)}</blockquote>`;
    case 'code_block':
      return `<pre><code>${escapeHtml(inlineText(block.content))}</code></pre>`;
    case 'divider':
      return '<hr>';
    case 'panel':
      return `<aside class="stella-panel stella-panel-${escapeHtml(block.attrs.variant)}">${block.content.map((child) => renderBlock(child, options)).join('')}</aside>`;
    case 'expand':
      return `<details${block.attrs.defaultOpen ? ' open' : ''}><summary>${escapeHtml(block.attrs.title)}</summary>${block.content.map((child) => renderBlock(child, options)).join('')}</details>`;
    case 'status':
      return `<span class="stella-status stella-status-${escapeHtml(block.attrs.color)}">${escapeHtml(block.attrs.text)}</span>`;
    case 'layout':
      return `<div class="stella-layout stella-layout-${escapeHtml(block.attrs.variant)}">${block.content.map((column) => `<section class="stella-layout-column">${column.content.map((child) => renderBlock(child, options)).join('')}</section>`).join('')}</div>`;
    case 'bullet_list':
    case 'ordered_list': {
      const tag = block.type === 'bullet_list' ? 'ul' : 'ol';
      return `<${tag}>${block.content.map((item) => `<li>${item.content.map((child) => renderBlock(child, options)).join('')}</li>`).join('')}</${tag}>`;
    }
    case 'task_list':
      return `<ul class="stella-task-list">${block.content.map((item) => `<li><input type="checkbox" disabled${item.attrs.checked ? ' checked' : ''}>${item.content.map((child) => renderBlock(child, options)).join('')}</li>`).join('')}</ul>`;
    case 'table':
      return `<table><tbody>${block.content.map((row) => `<tr>${row.content.map((cell) => `<td>${cell.content.map((child) => renderBlock(child, options)).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'media': {
      const src = block.attrs.assetId ? options.resolveAssetUrl?.(block.attrs.assetId) : null;
      return src && isSafeUrl(src) ? `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(block.attrs.alt)}"><figcaption>${escapeHtml(block.attrs.caption)}</figcaption></figure>` : `<figure class="stella-media-placeholder">${escapeHtml(block.attrs.alt || block.attrs.caption || 'Unresolved media')}</figure>`;
    }
    case 'unsupported':
      return `<div class="stella-unsupported">Unsupported block: ${escapeHtml(block.attrs.originalType || 'unknown')}</div>`;
    default:
      return '';
  }
}

export function exportHtml(doc, options = {}) {
  return normalizeDocument(doc).content.map((block) => renderBlock(block, options)).join('');
}
