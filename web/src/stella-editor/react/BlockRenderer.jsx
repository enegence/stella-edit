import React from 'react';
import { isSafeUrl } from '../core';
import { resolveAssetPreview } from '../adapters/assetAdapter';

function Inline({ content = [], adapters, context }) {
  return content.map((node, index) => {
    if (node.type !== 'text') return null;
    let element = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') element = <strong key={`${index}-bold`}>{element}</strong>;
      if (mark.type === 'italic') element = <em key={`${index}-italic`}>{element}</em>;
      if (mark.type === 'underline') element = <u key={`${index}-underline`}>{element}</u>;
      if (mark.type === 'strike') element = <s key={`${index}-strike`}>{element}</s>;
      if (mark.type === 'code') element = <code key={`${index}-code`}>{element}</code>;
      if (mark.type === 'color') element = <span key={`${index}-color`} style={{ color: mark.attrs?.color || '#CC785C' }}>{element}</span>;
      if (mark.type === 'link') {
        const href = mark.attrs?.kind === 'external_url' ? mark.attrs.href : adapters?.links?.getHref?.(mark.attrs?.reference, context);
        const visible = mark.attrs?.kind === 'external_url' || adapters?.scope?.isReferenceVisible?.(mark.attrs?.reference, context);
        const external = mark.attrs?.kind === 'external_url';
        element = href && isSafeUrl(href) && visible
          ? <a key={`${index}-link`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{element}</a>
          : <span key={`${index}-link`}>{element}</span>;
      }
    }
    return <React.Fragment key={index}>{element}</React.Fragment>;
  });
}

export function BlockRenderer({ block, adapters, context }) {
  const alignStyle = block.attrs?.align ? { textAlign: block.attrs.align } : undefined;
  switch (block.type) {
    case 'paragraph':
      return <p style={alignStyle}><Inline content={block.content} adapters={adapters} context={context} /></p>;
    case 'heading': {
      const Tag = `h${block.attrs.level}`;
      return <Tag style={alignStyle}><Inline content={block.content} adapters={adapters} context={context} /></Tag>;
    }
    case 'blockquote':
      return <blockquote style={alignStyle}><Inline content={block.content} adapters={adapters} context={context} /></blockquote>;
    case 'code_block': {
      const customCodeBlock = adapters?.blocks?.renderCodeBlock?.(block, context);
      if (customCodeBlock) return customCodeBlock;
      return (
        <div className="se-code-wrap">
          <button type="button" onClick={() => navigator.clipboard?.writeText(block.content?.[0]?.text || '')}>Copy</button>
          <pre><code>{block.content?.[0]?.text || ''}</code></pre>
        </div>
      );
    }
    case 'divider':
      return <hr />;
    case 'panel':
      return <aside className={`se-panel se-panel-${block.attrs.variant}`}>{block.attrs.title ? <strong>{block.attrs.title}</strong> : null}{block.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</aside>;
    case 'expand':
      return <details open={block.attrs.defaultOpen}><summary>{block.attrs.title}</summary>{block.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</details>;
    case 'status':
      return <span className={`se-status-pill se-status-${block.attrs.color}`}>{block.attrs.text}</span>;
    case 'layout':
      return <div className={`se-layout-view se-layout-${block.attrs.variant}`}>{block.content.map((column) => <section key={column.id} className="se-layout-column">{column.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</section>)}</div>;
    case 'bullet_list':
      return <ul>{block.content.map((item) => <li key={item.id}>{item.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</li>)}</ul>;
    case 'ordered_list':
      return <ol>{block.content.map((item) => <li key={item.id}>{item.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</li>)}</ol>;
    case 'task_list':
      return <ul className="se-task-list">{block.content.map((item) => <li key={item.id}><input type="checkbox" checked={item.attrs.checked} readOnly />{item.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</li>)}</ul>;
    case 'table':
      return <table><colgroup>{block.content[0]?.content.map((cell, colIndex) => <col key={cell.id} style={block.attrs.columnWidths?.[colIndex] ? { width: `${block.attrs.columnWidths[colIndex]}px` } : undefined} />)}</colgroup><tbody>{block.content.map((row, rowIndex) => <tr key={row.id}>{row.content.map((cell, colIndex) => <td key={cell.id} style={cell.attrs.background ? { background: cell.attrs.background } : undefined} className={(block.attrs.headerRow && rowIndex === 0) || (block.attrs.headerColumn && colIndex === 0) ? 'se-table-header-cell' : ''}>{cell.content.map((child) => <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />)}</td>)}</tr>)}</tbody></table>;
    case 'media': {
      const preview = block.attrs.assetId ? resolveAssetPreview(adapters?.assets, block.attrs.assetId, context) : null;
      const src = typeof preview === 'string' ? preview : preview?.url;
      const widthClass = `se-media-${block.attrs.width || 'full'}`;
      return src && isSafeUrl(src) ? <figure className={widthClass}><img src={src} alt={block.attrs.alt} /><figcaption>{block.attrs.caption}</figcaption></figure> : <figure className={`se-media-placeholder ${widthClass}`}>{block.attrs.alt || block.attrs.caption || 'Unresolved media'}</figure>;
    }
    case 'unsupported':
      return <div className="se-unsupported">Unsupported block: {block.attrs.originalType || 'unknown'}</div>;
    default:
      return null;
  }
}
